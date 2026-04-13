---
name: voidly-censorship-oracle
description: Real-time censorship intelligence oracle — check country risk, monitor incidents, forecast shutdowns, and create on-chain attestations using the TEE wallet. Powered by 2.2B+ network measurements across 200 countries.
---

# Voidly Censorship Intelligence Oracle

A Web3 skill that brings real-time internet censorship data on-chain. Query censorship risk for any country, check if domains are blocked, monitor active incidents, forecast shutdowns, and create verifiable on-chain attestations of censorship events using the Purrfect Claw TEE wallet.

Data sourced from OONI, CensoredPlanet, IODA, and Voidly's 37+ node probe network.

## Tool: check_country_risk

Check the censorship risk level for a specific country. Returns risk score, active incidents, 7-day forecast, and a recommendation on whether it's safe to execute on-chain operations.

### Parameters
- `country_code` (required) — ISO 3166-1 alpha-2 country code (e.g., IR, CN, RU, EG)

### Execution
1. Run:
   ```bash
   voidly-censor check-country <country_code>
   ```
2. Parse the JSON output. Key fields:
   - `censorship_score` — 0-100 (higher = more censored)
   - `active_incidents` — number of ongoing censorship events
   - `recommendation` — human-readable risk assessment
   - `forecast_7day.max_risk` — predicted shutdown probability
3. Present the risk assessment to the user with the recommendation.
4. If the user wants to proceed with a trade in a high-risk country, warn them about potential internet disruptions.

## Tool: check_domain_accessibility

Check if a specific website or service is accessible in a country.

### Parameters
- `domain` (required) — Domain name (e.g., twitter.com, whatsapp.com, telegram.org)
- `country_code` (required) — ISO 3166-1 alpha-2 country code

### Execution
1. Run:
   ```bash
   voidly-censor check-domain <domain> <country_code>
   ```
2. Parse the JSON response for blocking status, method, and confidence.
3. Report whether the domain is accessible or blocked, and the blocking method if applicable.

## Tool: get_censorship_incidents

Get recent censorship incidents globally or for a specific country.

### Parameters
- `country_code` (optional) — Filter by country. Omit for global feed.
- `limit` (optional) — Number of incidents to return (default: 10)

### Execution
1. Run:
   ```bash
   voidly-censor incidents --country <country_code> --limit <limit>
   ```
   Or for global incidents:
   ```bash
   voidly-censor incidents --limit <limit>
   ```
2. Parse the JSON output. Each incident has: id, country, title, severity, type, confidence, sources.
3. Present incidents sorted by severity (critical first).

## Tool: get_shutdown_forecast

Get a 7-day shutdown risk forecast for a country. Useful for planning DeFi operations, large transfers, or time-sensitive trades.

### Parameters
- `country_code` (required) — ISO 3166-1 alpha-2 country code

### Execution
1. Run:
   ```bash
   voidly-censor forecast <country_code>
   ```
2. Parse the forecast data showing daily risk levels and key drivers (elections, protests, etc.).
3. Advise the user on optimal timing for their on-chain operations based on the risk trajectory.

## Tool: get_risk_score

Get a numeric risk score (0-100) for a country, formatted for on-chain oracle updates. Includes a data hash for verification.

### Parameters
- `country_code` (required) — ISO 3166-1 alpha-2 country code

### Execution
1. Run:
   ```bash
   voidly-censor risk-score <country_code>
   ```
2. The output includes `oracle_payload` with country code, score, timestamp, and data hash.
3. This payload can be used to update an on-chain oracle contract.

## Tool: attest_censorship_incident

Create a verifiable on-chain attestation of a censorship incident. Uses the TEE wallet to sign EIP-712 typed data, creating cryptographic proof that the censorship event was verified by Voidly's ML classifier.

### Parameters
- `incident_id` (required) — Incident ID (e.g., IR-2026-0150)

### Execution
1. Confirm with the user: "I'll create an on-chain attestation for incident {incident_id}. This will sign the incident data with your TEE wallet. Proceed?"
2. Wait for user confirmation.
3. Run:
   ```bash
   voidly-censor attest <incident_id>
   ```
4. Extract the `typed_data` field from the JSON output.
5. Save the typed data to a temporary file:
   ```bash
   echo '<typed_data_json>' > /tmp/attestation-data.json
   ```
6. Sign with the TEE wallet:
   ```bash
   purr wallet sign-typed-data --data "$(cat /tmp/attestation-data.json)"
   ```
7. Return the signature to the user along with the incident details.
8. The signed attestation proves:
   - What censorship event occurred (country, type, severity)
   - When it was detected (timestamp)
   - Confidence level of the ML classifier
   - That the attestation was signed inside a TEE (tamper-proof)

## Example Interactions

**User:** "Is it safe to trade in Iran right now?"
→ Use `check_country_risk` with country_code=IR. If risk is HIGH, warn about active internet disruptions.

**User:** "Is WhatsApp accessible in China?"
→ Use `check_domain_accessibility` with domain=whatsapp.com, country_code=CN.

**User:** "Show me the latest censorship incidents"
→ Use `get_censorship_incidents` with no country filter.

**User:** "What's the shutdown risk for Russia this week?"
→ Use `get_shutdown_forecast` with country_code=RU.

**User:** "Attest the Iran incident on-chain"
→ Use `attest_censorship_incident` with the incident ID. Sign with TEE wallet.

**User:** "Should I move my DeFi position in Pakistan?"
→ Use `check_country_risk` for PK, then `get_shutdown_forecast` for PK. Combine risk data with forecast to advise timing.

## Data Sources

- **OONI** — 21,909 measurements from volunteer probes worldwide
- **IODA** — 15,108 macroscopic internet outage detections
- **CensoredPlanet** — 9,098 remote censorship measurements
- **Voidly Network** — 37+ probe nodes testing 62 domains every 5 minutes
- **ML Classifier** — GradientBoosting, 99.8% F1 score

## About

Built by [Voidly](https://voidly.ai) — network intelligence built on trust. Open data, CC BY 4.0.

- API: https://api.voidly.ai
- MCP Server: `npx @voidly/mcp-server` (83 tools)
- Agent SDK: `npm install @voidly/agent-sdk`
