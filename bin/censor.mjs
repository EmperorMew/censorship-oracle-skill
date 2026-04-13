#!/usr/bin/env node

/**
 * voidly-censor CLI — Censorship Intelligence Oracle
 *
 * Queries Voidly's API for real-time censorship data and prepares
 * on-chain attestation payloads for the Purrfect Claw TEE wallet.
 *
 * Commands:
 *   check-country <code>     — Censorship risk assessment for a country
 *   check-domain <domain> <country> — Is a domain blocked in a country?
 *   incidents [--country XX] — Recent censorship incidents
 *   forecast <code>          — 7-day shutdown risk forecast
 *   attest <incident-id>     — Generate attestation payload for TEE signing
 *   risk-score <code>        — Numeric risk score (0-100) for on-chain oracle
 */

const API = 'https://api.voidly.ai';
const args = process.argv.slice(2);
const cmd = args[0];

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

// ─── CHECK COUNTRY ───────────────────────────────────────────────────
async function checkCountry(code) {
  code = code.toUpperCase();
  const [index, forecast, incidents] = await Promise.allSettled([
    fetchJSON(`${API}/data/country/${code}`),
    fetchJSON(`${API}/v1/forecast/${code}/7day`),
    fetchJSON(`${API}/data/incidents?country=${code}&limit=5`),
  ]);

  const country = index.status === 'fulfilled' ? index.value : null;
  const risk = forecast.status === 'fulfilled' ? forecast.value : null;
  const recent = incidents.status === 'fulfilled' ? incidents.value : null;

  const result = {
    country: code,
    name: country?.countryName || code,
    censorship_score: country?.score ?? 'unknown',
    risk_tier: country?.riskTier ?? 'unknown',
    trend: country?.trend ?? 'unknown',
    active_incidents: recent?.total ?? 0,
    recent_incidents: (recent?.incidents || []).slice(0, 3).map(i => ({
      id: i.readableId || i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      started: i.startTime,
    })),
    forecast_7day: risk?.forecast ? {
      max_risk: risk.summary?.max_risk ?? 0,
      max_risk_day: risk.summary?.max_risk_day ?? 0,
      drivers: risk.summary?.key_drivers ?? [],
      daily: risk.forecast.map(d => ({ day: d.day, risk: d.risk, date: d.date })),
    } : null,
    recommendation: getRiskRecommendation(country?.score, recent?.total),
  };

  console.log(JSON.stringify(result, null, 2));
}

function getRiskRecommendation(score, incidents) {
  if (!score) return 'Unable to assess — insufficient data.';
  if (score >= 80) return `HIGH RISK. Score ${score}/100 with ${incidents || 0} active incidents. Exercise extreme caution with on-chain operations. Internet disruptions likely.`;
  if (score >= 50) return `ELEVATED RISK. Score ${score}/100. Some services may be blocked. Monitor before executing large transactions.`;
  if (score >= 20) return `MODERATE RISK. Score ${score}/100. Occasional filtering detected. Standard precautions apply.`;
  return `LOW RISK. Score ${score}/100. Internet access is generally unrestricted.`;
}

// ─── CHECK DOMAIN ────────────────────────────────────────────────────
async function checkDomain(domain, country) {
  country = country.toUpperCase();
  const data = await fetchJSON(`${API}/v1/accessibility/check?domain=${encodeURIComponent(domain)}&country=${country}`);
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
      status: i.status,
      confidence: i.confidence,
      started: i.startTime,
      sources: i.sources,
    })),
  };
  console.log(JSON.stringify(result, null, 2));
}

// ─── FORECAST ────────────────────────────────────────────────────────
async function getForecast(code) {
  code = code.toUpperCase();
  const data = await fetchJSON(`${API}/v1/forecast/${code}/7day`);
  console.log(JSON.stringify(data, null, 2));
}

// ─── RISK SCORE ──────────────────────────────────────────────────────
async function getRiskScore(code) {
  code = code.toUpperCase();
  const country = await fetchJSON(`${API}/data/country/${code}`);

  // Normalize to 0-100 risk score (higher = more censored)
  const score = country.score ?? 0;
  const result = {
    country: code,
    name: country.countryName || code,
    risk_score: score,
    risk_level: score >= 80 ? 'critical' : score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low',
    // ABI-encoded for on-chain oracle update
    oracle_payload: {
      country_code: code,
      score: score,
      timestamp: Math.floor(Date.now() / 1000),
      data_hash: await hashData(`${code}:${score}:${Date.now()}`),
    },
  };
  console.log(JSON.stringify(result, null, 2));
}

async function hashData(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── ATTEST ──────────────────────────────────────────────────────────
async function attestIncident(incidentId) {
  // Fetch the incident with evidence
  const data = await fetchJSON(`${API}/data/incidents/${incidentId}`);
  const incident = data.incident || data;

  if (!incident || !incident.country) {
    console.error(JSON.stringify({ error: `Incident ${incidentId} not found` }));
    process.exit(1);
  }

  // Build attestation payload for BAS (BNB Attestation Service)
  // Schema: country(string), domain(string), incidentType(string), severity(string),
  //         confidence(uint8), measurementCount(uint32), timestamp(uint64), sourceHash(bytes32)
  const attestation = {
    incident_id: incident.readableId || incident.id || incidentId,
    schema_fields: {
      country: incident.country,
      countryName: incident.countryName,
      incidentType: incident.incidentType || 'unknown',
      severity: incident.severity,
      confidence: Math.round((incident.confidence || 0) * 100),
      measurementCount: incident.measurementCount || 0,
      timestamp: Math.floor(new Date(incident.startTime || incident.createdAt).getTime() / 1000),
      title: incident.title,
      sources: (incident.sources || []).join(','),
    },
    // EIP-712 typed data for TEE wallet signing
    typed_data: {
      types: {
        CensorshipAttestation: [
          { name: 'country', type: 'string' },
          { name: 'incidentType', type: 'string' },
          { name: 'severity', type: 'string' },
          { name: 'confidence', type: 'uint8' },
          { name: 'measurementCount', type: 'uint32' },
          { name: 'timestamp', type: 'uint64' },
          { name: 'title', type: 'string' },
        ],
      },
      primaryType: 'CensorshipAttestation',
      domain: {
        name: 'Voidly Censorship Oracle',
        version: '1',
        chainId: 56, // BNB Chain
      },
      message: {
        country: incident.country,
        incidentType: incident.incidentType || 'unknown',
        severity: incident.severity,
        confidence: Math.round((incident.confidence || 0) * 100),
        measurementCount: incident.measurementCount || 0,
        timestamp: Math.floor(new Date(incident.startTime || incident.createdAt).getTime() / 1000),
        title: incident.title,
      },
    },
    // Instructions for the agent
    instructions: `To attest this incident on-chain, run:\n  purr wallet sign-typed-data --data '${JSON.stringify({
      types: { CensorshipAttestation: [{ name: 'country', type: 'string' }, { name: 'severity', type: 'string' }, { name: 'confidence', type: 'uint8' }, { name: 'timestamp', type: 'uint64' }] },
      primaryType: 'CensorshipAttestation',
      domain: { name: 'Voidly Censorship Oracle', version: '1', chainId: 56 },
      message: { country: incident.country, severity: incident.severity, confidence: Math.round((incident.confidence || 0) * 100), timestamp: Math.floor(Date.now() / 1000) },
    })}'`,
  };

  console.log(JSON.stringify(attestation, null, 2));
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
        if (!args[1] || !args[2]) { console.error('Usage: voidly-censor check-domain <domain> <country-code>'); process.exit(1); }
        await checkDomain(args[1], args[2]);
        break;
      case 'incidents':
        const country = args.find((a, i) => args[i - 1] === '--country');
        const limit = args.find((a, i) => args[i - 1] === '--limit') || '10';
        await getIncidents(country, parseInt(limit));
        break;
      case 'forecast':
        if (!args[1]) { console.error('Usage: voidly-censor forecast <country-code>'); process.exit(1); }
        await getForecast(args[1]);
        break;
      case 'risk-score':
        if (!args[1]) { console.error('Usage: voidly-censor risk-score <country-code>'); process.exit(1); }
        await getRiskScore(args[1]);
        break;
      case 'attest':
        if (!args[1]) { console.error('Usage: voidly-censor attest <incident-id>'); process.exit(1); }
        await attestIncident(args[1]);
        break;
      default:
        console.log(`voidly-censor — Censorship Intelligence Oracle

Commands:
  check-country <code>              Censorship risk assessment
  check-domain <domain> <country>   Domain accessibility check
  incidents [--country XX]          Recent incidents
  forecast <code>                   7-day shutdown forecast
  risk-score <code>                 Numeric risk for on-chain oracle
  attest <incident-id>              Generate attestation payload

Powered by Voidly (voidly.ai) — 200 countries, 2.2B+ measurements`);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

main();
