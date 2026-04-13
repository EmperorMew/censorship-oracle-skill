#!/usr/bin/env node

/**
 * voidly-censor CLI — Censorship Intelligence Oracle
 *
 * Queries Voidly's censorship API AND writes on-chain to the CensorshipOracle
 * contract on opBNB via Purrfect Claw's TEE wallet.
 *
 * Commands:
 *   check-country <code>         — Risk assessment (API query)
 *   check-domain <domain> <cc>   — Domain accessibility check
 *   incidents [--country XX]     — Recent censorship incidents
 *   forecast <code>              — 7-day shutdown risk forecast
 *   risk-score <code>            — Numeric risk for on-chain oracle
 *   update-oracle <code>         — Write country risk score on-chain
 *   attest <incident-id>         — Write incident attestation on-chain
 *   monitor [--interval 60]      — Autonomous: watch + auto-attest critical incidents
 *   verify <incident-id>         — Read attestation from on-chain contract
 *   stats                        — Oracle contract stats
 */

import { ethers } from 'ethers';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API = 'https://api.voidly.ai';
const args = process.argv.slice(2);
const cmd = args[0];

// opBNB testnet config (switch to mainnet for production)
const OPBNB_RPC = process.env.OPBNB_RPC || 'https://opbnb-testnet-rpc.bnbchain.org';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5611');
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

const ORACLE_ABI = [
  "function updateCountryRisk(bytes2 country, uint8 score, uint16 incidentCount)",
  "function attestIncident(bytes32 incidentHash, bytes2 country, uint8 severity, uint8 confidence, uint32 measurements, uint64 timestamp)",
  "function isSafe(bytes2 country) view returns (uint8 score, bool safe, uint64 lastUpdate)",
  "function countryRisks(bytes2) view returns (uint8 score, uint64 updatedAt, uint16 incidentCount)",
  "function incidents(bytes32) view returns (bytes2 countryCode, uint8 confidence, uint8 severity, uint32 measurements, uint64 timestamp, address attestedBy)",
  "function totalAttestations() view returns (uint256)",
  "function getScoredCountryCount() view returns (uint256)",
  "function owner() view returns (address)",
];

// Convert 2-letter country code to bytes2
function countryToBytes2(code) {
  return '0x' + Buffer.from(code.toUpperCase().slice(0, 2)).toString('hex');
}

// Convert incident ID to bytes32 hash
function incidentToHash(id) {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(id));
}

// Severity string to uint8
function severityToUint(s) {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1;
}

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

function getProvider() {
  return new ethers.providers.JsonRpcProvider(OPBNB_RPC);
}

function getContract(signerOrProvider) {
  if (!ORACLE_ADDRESS) throw new Error('Set ORACLE_ADDRESS env var (deploy the contract first)');
  return new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, signerOrProvider);
}

function getSigner() {
  if (!PRIVATE_KEY) throw new Error('Set PRIVATE_KEY env var');
  return new ethers.Wallet(PRIVATE_KEY, getProvider());
}

function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

// Helper: get country score from censorship index
async function getCountryScore(code) {
  try {
    const index = await fetchJSON(`${API}/data/censorship-index.json`);
    const countries = index.countries || [];
    const match = countries.find(c => c.code === code);
    return match || null;
  } catch { return null; }
}

// ─── CHECK COUNTRY (API only) ────────────────────────────────────────
async function checkCountry(code) {
  code = code.toUpperCase();
  const [indexRes, forecastRes, incRes] = await Promise.allSettled([
    getCountryScore(code),
    fetchJSON(`${API}/v1/forecast/${code}/7day`),
    fetchJSON(`${API}/data/incidents?country=${code}&limit=5`),
  ]);

  const country = indexRes.status === 'fulfilled' ? indexRes.value : null;
  const risk = forecastRes.status === 'fulfilled' ? forecastRes.value : null;
  const recent = incRes.status === 'fulfilled' ? incRes.value : null;
  const score = country?.score ?? 0;

  const result = {
    country: code,
    name: country?.countryName || code,
    censorship_score: score,
    risk_level: getRiskLevel(score),
    active_incidents: recent?.total ?? 0,
    recent_incidents: (recent?.incidents || []).slice(0, 3).map(i => ({
      id: i.readableId || i.id,
      title: i.title,
      severity: i.severity,
      started: i.startTime,
    })),
    forecast_7day: risk?.summary ? {
      max_risk: risk.summary.max_risk,
      max_risk_day: risk.summary.max_risk_day,
      drivers: risk.summary.key_drivers || [],
    } : null,
    recommendation: score >= 80
      ? `CRITICAL. Score ${score}/100 with ${recent?.total || 0} active incidents. Do NOT execute on-chain operations.`
      : score >= 50
      ? `HIGH RISK. Score ${score}/100. Monitor closely before executing large transactions.`
      : score >= 20
      ? `MODERATE. Score ${score}/100. Standard precautions apply.`
      : `LOW RISK. Score ${score}/100. Internet access generally unrestricted.`,
  };

  // If oracle is deployed, check on-chain data too
  if (ORACLE_ADDRESS) {
    try {
      const contract = getContract(getProvider());
      const [onchainScore, safe, lastUpdate] = await contract.isSafe(countryToBytes2(code));
      result.onchain = {
        score: onchainScore,
        safe,
        last_update: lastUpdate > 0 ? new Date(lastUpdate * 1000).toISOString() : 'never',
        contract: ORACLE_ADDRESS,
        explorer: `https://testnet.opbnbscan.com/address/${ORACLE_ADDRESS}`,
      };
    } catch (err) {
      console.error(`[onchain] Could not read oracle: ${err.message}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

// ─── CHECK DOMAIN ────────────────────────────────────────────────────
async function checkDomain(domain, country) {
  const data = await fetchJSON(`${API}/v1/accessibility/check?domain=${encodeURIComponent(domain)}&country=${country.toUpperCase()}`);
  console.log(JSON.stringify(data, null, 2));
}

// ─── INCIDENTS ───────────────────────────────────────────────────────
async function getIncidents(country, limit = 10) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (country) params.set('country', country.toUpperCase());
  const data = await fetchJSON(`${API}/data/incidents?${params}`);
  const result = {
    total: data.total || data.count,
    incidents: (data.incidents || []).map(i => ({
      id: i.readableId || i.id,
      country: i.countryName,
      country_code: i.country,
      title: i.title,
      severity: i.severity,
      type: i.incidentType,
      confidence: i.confidence,
      started: i.startTime,
      sources: i.sources,
    })),
  };
  console.log(JSON.stringify(result, null, 2));
}

// ─── FORECAST ────────────────────────────────────────────────────────
async function getForecast(code) {
  const data = await fetchJSON(`${API}/v1/forecast/${code.toUpperCase()}/7day`);
  console.log(JSON.stringify(data, null, 2));
}

// ─── RISK SCORE ──────────────────────────────────────────────────────
async function getRiskScore(code) {
  code = code.toUpperCase();
  const country = await getCountryScore(code);
  const score = country?.score ?? 0;
  console.log(JSON.stringify({
    country: code,
    name: country.countryName || code,
    risk_score: score,
    risk_level: getRiskLevel(score),
  }, null, 2));
}

// ─── UPDATE ORACLE (on-chain write) ──────────────────────────────────
async function updateOracle(code) {
  code = code.toUpperCase();
  console.error(`[oracle] Fetching risk data for ${code}...`);

  const [countryRes, incRes] = await Promise.allSettled([
    getCountryScore(code),
    fetchJSON(`${API}/data/incidents?country=${code}&limit=1`),
  ]);

  const country = countryRes.status === 'fulfilled' ? countryRes.value : null;
  const incidents = incRes.status === 'fulfilled' ? incRes.value : null;
  const score = country?.score ?? 0;
  const level = getRiskLevel(score);
  const incidentCount = incidents?.total ?? 0;

  // Generate TxStep for purr execute
  const iface = new ethers.utils.Interface(ORACLE_ABI);
  const countryBytes = countryToBytes2(code);
  const calldata = iface.encodeFunctionData('updateCountryRisk', [
    countryBytes, score, incidentCount
  ]);

  const txStep = [{
    to: ORACLE_ADDRESS,
    value: '0',
    data: calldata,
    chainId: CHAIN_ID,
  }];

  // Write TxStep file for purr execute
  const txFile = `/tmp/oracle-update-${code}.json`;
  writeFileSync(txFile, JSON.stringify(txStep, null, 2));

  // If we have a private key, execute directly
  if (PRIVATE_KEY) {
    console.error(`[oracle] Writing ${code} score=${score} level=${level} incidents=${incidentCount} on-chain...`);
    const signer = getSigner();
    const contract = getContract(signer);
    const tx = await contract.updateCountryRisk(countryBytes, score, incidentCount);
    const receipt = await tx.wait();
    console.log(JSON.stringify({
      status: 'success',
      country: code,
      score,
      level,
      incidentCount,
      tx_hash: receipt.transactionHash,
      block: receipt.blockNumber,
      explorer: `https://testnet.opbnbscan.com/tx/${receipt.transactionHash}`,
    }, null, 2));
  } else {
    // Output for purr execute
    console.log(JSON.stringify({
      status: 'ready',
      country: code,
      score,
      level,
      incidentCount,
      tx_step_file: txFile,
      instruction: `Run: purr execute --file ${txFile}`,
    }, null, 2));
  }
}

// ─── ATTEST INCIDENT (on-chain write) ────────────────────────────────
async function attestIncident(incidentId) {
  console.error(`[attest] Fetching incident ${incidentId}...`);
  const data = await fetchJSON(`${API}/data/incidents/${incidentId}`);
  const inc = data.incident || data;

  if (!inc?.country) {
    console.error(JSON.stringify({ error: `Incident ${incidentId} not found` }));
    process.exit(1);
  }

  const id = inc.readableId || inc.id || incidentId;
  const confidence = Math.round((inc.confidence || 0) * 100);
  const measurements = inc.measurementCount || 0;
  const timestamp = Math.floor(new Date(inc.startTime || inc.createdAt).getTime() / 1000);
  const severity = severityToUint(inc.severity);
  const incidentHash = incidentToHash(id);
  const countryBytes = countryToBytes2(inc.country);

  // Generate TxStep
  const iface = new ethers.utils.Interface(ORACLE_ABI);
  const calldata = iface.encodeFunctionData('attestIncident', [
    incidentHash, countryBytes, severity, confidence, measurements, timestamp
  ]);

  const txStep = [{
    to: ORACLE_ADDRESS,
    value: '0',
    data: calldata,
    chainId: CHAIN_ID,
  }];

  const txFile = `/tmp/attest-${id}.json`;
  writeFileSync(txFile, JSON.stringify(txStep, null, 2));

  if (PRIVATE_KEY) {
    console.error(`[attest] Writing attestation for ${id} on-chain...`);
    const signer = getSigner();
    const contract = getContract(signer);
    try {
      const tx = await contract.attestIncident(
        incidentHash, countryBytes, severity, confidence, measurements, timestamp
      );
      const receipt = await tx.wait();
      console.log(JSON.stringify({
        status: 'attested',
        incident_id: id,
        country: inc.country,
        severity: inc.severity,
        confidence,
        tx_hash: receipt.transactionHash,
        block: receipt.blockNumber,
        explorer: `https://testnet.opbnbscan.com/tx/${receipt.transactionHash}`,
      }, null, 2));
    } catch (err) {
      if (err.message?.includes('already attested')) {
        console.log(JSON.stringify({ status: 'already_attested', incident_id: id }));
      } else throw err;
    }
  } else {
    console.log(JSON.stringify({
      status: 'ready',
      incident_id: id,
      tx_step_file: txFile,
      instruction: `Run: purr execute --file ${txFile}`,
    }, null, 2));
  }
}

// ─── MONITOR (autonomous mode) ───────────────────────────────────────
async function monitor(intervalSec = 60) {
  console.error(`[monitor] Starting autonomous censorship monitor (interval: ${intervalSec}s)`);
  console.error(`[monitor] Watching for critical incidents...`);

  const attested = new Set();
  let cycle = 0;

  const tick = async () => {
    cycle++;
    try {
      const data = await fetchJSON(`${API}/data/incidents?limit=20`);
      const critical = (data.incidents || []).filter(i =>
        i.severity === 'critical' && !attested.has(i.readableId || i.id)
      );

      if (critical.length > 0) {
        console.error(`[monitor] Cycle ${cycle}: Found ${critical.length} new critical incidents`);
        for (const inc of critical.slice(0, 3)) {
          const id = inc.readableId || inc.id;
          console.error(`[monitor] Auto-attesting ${id}: ${inc.title}`);
          try {
            // Output the attestation for the agent to execute
            const confidence = Math.round((inc.confidence || 0) * 100);
            const timestamp = Math.floor(new Date(inc.startTime || inc.createdAt).getTime() / 1000);

            if (PRIVATE_KEY && ORACLE_ADDRESS) {
              const signer = getSigner();
              const contract = getContract(signer);
              const tx = await contract.attestIncident(
                incidentToHash(id), countryToBytes2(inc.country),
                severityToUint(inc.severity), confidence,
                inc.measurementCount || 0, timestamp
              );
              const receipt = await tx.wait();
              console.log(JSON.stringify({
                event: 'auto_attested',
                incident_id: id,
                country: inc.countryName,
                severity: inc.severity,
                tx_hash: receipt.transactionHash,
                explorer: `https://testnet.opbnbscan.com/tx/${receipt.transactionHash}`,
              }));
            } else {
              console.log(JSON.stringify({
                event: 'new_critical_incident',
                incident_id: id,
                country: inc.countryName,
                country_code: inc.country,
                title: inc.title,
                severity: inc.severity,
                confidence,
                action: `Run: voidly-censor attest ${id}`,
              }));
            }
            attested.add(id);
          } catch (err) {
            if (!err.message?.includes('already attested')) {
              console.error(`[monitor] Failed to attest ${id}:`, err.message);
            }
            attested.add(id); // Don't retry
          }
        }
      } else {
        console.error(`[monitor] Cycle ${cycle}: No new critical incidents`);
      }
    } catch (err) {
      console.error(`[monitor] Cycle ${cycle} error:`, err.message);
    }
  };

  await tick();
  setInterval(tick, intervalSec * 1000);
}

// ─── VERIFY (read from chain) ────────────────────────────────────────
async function verify(incidentId) {
  const contract = getContract(getProvider());
  const hash = incidentToHash(incidentId);
  const inc = await contract.incidents(hash);

  if (inc.attestedBy === '0x0000000000000000000000000000000000000000') {
    console.log(JSON.stringify({ status: 'not_found', incident_id: incidentId, hash }));
    return;
  }

  const severityMap = { 1: 'info', 2: 'warning', 3: 'critical' };
  console.log(JSON.stringify({
    status: 'verified',
    onchain: {
      incident_id: incidentId,
      incident_hash: hash,
      country_code: ethers.utils.toUtf8String(inc.countryCode),
      severity: severityMap[inc.severity] || `unknown(${inc.severity})`,
      confidence: inc.confidence,
      measurements: inc.measurements,
      timestamp: new Date(inc.timestamp.toNumber() * 1000).toISOString(),
      attested_by: inc.attestedBy,
    },
    contract: ORACLE_ADDRESS,
    explorer: `https://testnet.opbnbscan.com/address/${ORACLE_ADDRESS}`,
  }, null, 2));
}

// ─── STATS ───────────────────────────────────────────────────────────
async function oracleStats() {
  const contract = getContract(getProvider());
  const [total, countries, owner] = await Promise.all([
    contract.totalAttestations(),
    contract.getScoredCountryCount(),
    contract.owner(),
  ]);

  console.log(JSON.stringify({
    contract: ORACLE_ADDRESS,
    network: CHAIN_ID === 5611 ? 'opBNB Testnet' : CHAIN_ID === 204 ? 'opBNB Mainnet' : `Chain ${CHAIN_ID}`,
    total_attestations: total.toNumber(),
    scored_countries: countries.toNumber(),
    owner,
    explorer: `https://testnet.opbnbscan.com/address/${ORACLE_ADDRESS}`,
  }, null, 2));
}

// ─── MAIN ────────────────────────────────────────────────────────────
async function main() {
  try {
    switch (cmd) {
      case 'check-country':
        if (!args[1]) { console.error('Usage: voidly-censor check-country <country-code>'); process.exit(1); }
        await checkCountry(args[1]);
        break;
      case 'check-domain':
        if (!args[1] || !args[2]) { console.error('Usage: voidly-censor check-domain <domain> <country>'); process.exit(1); }
        await checkDomain(args[1], args[2]);
        break;
      case 'incidents': {
        const c = args.find((a, i) => args[i - 1] === '--country');
        const l = args.find((a, i) => args[i - 1] === '--limit') || '10';
        await getIncidents(c, parseInt(l));
        break;
      }
      case 'forecast':
        if (!args[1]) { console.error('Usage: voidly-censor forecast <country>'); process.exit(1); }
        await getForecast(args[1]);
        break;
      case 'risk-score':
        if (!args[1]) { console.error('Usage: voidly-censor risk-score <country>'); process.exit(1); }
        await getRiskScore(args[1]);
        break;
      case 'update-oracle':
        if (!args[1]) { console.error('Usage: voidly-censor update-oracle <country>'); process.exit(1); }
        await updateOracle(args[1]);
        break;
      case 'attest':
        if (!args[1]) { console.error('Usage: voidly-censor attest <incident-id>'); process.exit(1); }
        await attestIncident(args[1]);
        break;
      case 'monitor': {
        const interval = parseInt(args.find((a, i) => args[i - 1] === '--interval') || '60');
        await monitor(interval);
        break;
      }
      case 'verify':
        if (!args[1]) { console.error('Usage: voidly-censor verify <incident-id>'); process.exit(1); }
        await verify(args[1]);
        break;
      case 'stats':
        await oracleStats();
        break;
      default:
        console.log(`voidly-censor — Censorship Intelligence Oracle (v2)

  ┌─────────────────────────────────────────────────────────────┐
  │  On-chain censorship oracle powered by Voidly               │
  │  200 countries · 2.2B+ measurements · Real-time incidents   │
  └─────────────────────────────────────────────────────────────┘

  READ (API queries):
    check-country <code>         Risk assessment for a country
    check-domain <dom> <cc>      Is a domain blocked?
    incidents [--country XX]     Recent censorship incidents
    forecast <code>              7-day shutdown risk forecast
    risk-score <code>            Numeric risk score (0-100)

  WRITE (on-chain via TEE wallet):
    update-oracle <code>         Write country risk score to contract
    attest <incident-id>         Write incident attestation on-chain
    monitor [--interval 60]      Autonomous: watch + auto-attest

  VERIFY (read from chain):
    verify <incident-id>         Read attestation from contract
    stats                        Oracle contract statistics

  Environment:
    ORACLE_ADDRESS    Contract address (required for on-chain ops)
    PRIVATE_KEY       Wallet private key (or use purr execute)
    OPBNB_RPC         RPC endpoint (default: opBNB testnet)

  https://voidly.ai — Network intelligence built on trust.`);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
