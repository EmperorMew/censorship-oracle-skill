---
name: voidly-censorship-oracle
description: On-chain censorship intelligence oracle. Query risk scores, monitor incidents, write attestations to opBNB via TEE wallet. Autonomous monitoring mode auto-attests critical events. Powered by 2.2B+ measurements across 200 countries.
---

# Voidly Censorship Intelligence Oracle

The world's first on-chain censorship oracle. This skill lets you:

1. **Query** real-time censorship data for any country or domain
2. **Write** verified risk scores and incident attestations to the CensorshipOracle contract on opBNB
3. **Monitor** autonomously — the agent watches for critical incidents and auto-attests them on-chain
4. **Verify** existing attestations by reading directly from the smart contract

Data from OONI, CensoredPlanet, IODA, and Voidly's 37+ node probe network. ML-classified with 99.8% F1 accuracy.

---

## Tool: check_country_risk

Check censorship risk for a country. Returns both API data AND on-chain oracle data (if available).

### Parameters
- `country_code` (required) — ISO 3166-1 alpha-2 (e.g., IR, CN, RU)

### Execution
1. Run:
   ```bash
   voidly-censor check-country <country_code>
   ```
2. Present the `recommendation` field to the user.
3. If `onchain` data is present, mention the last on-chain update time.

---

## Tool: check_domain

Check if a website is accessible in a specific country.

### Parameters
- `domain` (required) — e.g., twitter.com, whatsapp.com
- `country_code` (required) — e.g., IR, CN

### Execution
```bash
voidly-censor check-domain <domain> <country_code>
```

---

## Tool: get_incidents

Get recent censorship incidents globally or by country.

### Parameters
- `country_code` (optional) — Filter by country
- `limit` (optional) — Number of results (default: 10)

### Execution
```bash
voidly-censor incidents --country <country_code> --limit <limit>
```

---

## Tool: get_forecast

7-day shutdown risk forecast for a country.

### Parameters
- `country_code` (required)

### Execution
```bash
voidly-censor forecast <country_code>
```

---

## Tool: update_oracle

**ON-CHAIN WRITE.** Update a country's censorship risk score on the CensorshipOracle smart contract.

### Parameters
- `country_code` (required)

### Execution
1. Confirm with the user: "I'll update the on-chain risk score for {country}. This writes to the CensorshipOracle contract on opBNB. Proceed?"
2. Wait for confirmation.
3. Run:
   ```bash
   voidly-censor update-oracle <country_code>
   ```
4. If the output contains `tx_hash`, the transaction was executed directly. Show the explorer link.
5. If the output contains `tx_step_file`, run:
   ```bash
   purr execute --file <tx_step_file>
   ```
6. Report the transaction hash to the user.

---

## Tool: attest_incident

**ON-CHAIN WRITE.** Create an immutable attestation of a censorship incident on the CensorshipOracle contract. This creates verifiable proof that the incident was detected by Voidly's ML classifier and signed by the TEE wallet.

### Parameters
- `incident_id` (required) — e.g., IR-2026-0150

### Execution
1. Confirm with the user: "I'll attest incident {id} on-chain. This creates an immutable record on opBNB. Proceed?"
2. Wait for confirmation.
3. Run:
   ```bash
   voidly-censor attest <incident_id>
   ```
4. If `tx_hash` is in the output, show the explorer link.
5. If `tx_step_file` is in the output, run:
   ```bash
   purr execute --file <tx_step_file>
   ```

---

## Tool: start_monitor

**AUTONOMOUS MODE.** Start monitoring Voidly's incident feed. When new critical incidents appear, the agent auto-generates attestations and writes them on-chain without being asked.

### Execution
1. Inform the user: "Starting autonomous censorship monitor. I'll watch for critical incidents and attest them on-chain automatically."
2. Run:
   ```bash
   voidly-censor monitor --interval 60
   ```
3. The command runs indefinitely. Each line of output is a JSON event:
   - `event: "auto_attested"` — an incident was attested. Show the tx hash.
   - `event: "new_critical_incident"` — a new incident was found. Run the attest command.
4. Periodically report to the user: "Monitoring active. {N} incidents attested so far."

---

## Tool: verify_attestation

**ON-CHAIN READ.** Verify an existing attestation by reading it from the smart contract.

### Parameters
- `incident_id` (required)

### Execution
```bash
voidly-censor verify <incident_id>
```
Present the on-chain data including attester address, timestamp, and confidence score.

---

## Tool: oracle_stats

Get statistics about the CensorshipOracle contract.

### Execution
```bash
voidly-censor stats
```
Shows: total attestations, scored countries, contract owner, explorer link.

---

## Example Interactions

**"Is it safe to trade in Iran right now?"**
→ `check_country_risk` IR → present risk + recommendation

**"Attest the latest Iran incident on-chain"**
→ `get_incidents` --country IR → pick latest → confirm → `attest_incident`

**"Update the oracle with China's current risk score"**
→ confirm → `update_oracle` CN → show tx hash

**"Start monitoring for censorship events"**
→ `start_monitor` → auto-attest critical incidents → report to user

**"Verify the Iran incident on the blockchain"**
→ `verify_attestation` IR-2026-0150 → show on-chain data

**"Should I move my DeFi position in Pakistan?"**
→ `check_country_risk` PK + `get_forecast` PK → advise timing based on risk + forecast

---

## Architecture

```
User Query → Purrfect Claw Agent → SKILL.md → voidly-censor CLI
                                                    ↓
                                              Voidly API (200 countries, ML classifier)
                                                    ↓
                                              CensorshipOracle Contract (opBNB)
                                                    ↓
                                              TEE Wallet (purr execute)
                                                    ↓
                                              Verifiable On-Chain Attestation
```

## Contract

- **Network:** opBNB (Chain ID: 5611 testnet / 204 mainnet)
- **Contract:** CensorshipOracle
- **Functions:** `updateCountryRisk`, `attestIncident`, `isSafe`, `verify`
- **Events:** `CountryRiskUpdated`, `IncidentAttested`

## About

Built by [Voidly](https://voidly.ai) for the [Four.Meme AI Sprint](https://dorahacks.io/hackathon/fourmemeaisprint).
