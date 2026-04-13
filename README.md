# Voidly Censorship Intelligence Oracle

An AI agent skill for [Purrfect Claw](https://docs.pieverse.io) that gives agents real-time censorship intelligence and on-chain attestation capabilities — powered by 2.2B+ network measurements across 200 countries.

Built for the [Four.Meme AI Sprint Hackathon](https://dorahacks.io/hackathon/fourmemeaisprint) · [Pieverse Bounty #1338](https://dorahacks.io/hackathon/fourmemeaisprint/detail)

## The Problem

DeFi users in censored countries lose access to their funds during internet shutdowns. There's no on-chain oracle that tells protocols "this country is experiencing censorship right now — delay liquidations, pause bridges, warn users." We built one.

## What It Does

```
┌──────────────────────────────────────────────────────────────────┐
│                   voidly-censor CLI                              │
│                                                                  │
│  READ (Voidly API — 200 countries, ML-classified):               │
│    check-country IR    → score=8, 32 incidents, 54% forecast     │
│    check-domain twitter.com CN  → blocked, dns-poison            │
│    incidents --country RU       → 37 active, top 3 critical      │
│    forecast PK                  → 7-day risk, election drivers   │
│                                                                  │
│  WRITE (on-chain via TEE wallet):                                │
│    update-oracle CN   → writes risk score to CensorshipOracle    │
│    attest IR-2026-0150 → writes incident attestation on-chain    │
│                                                                  │
│  AUTO (autonomous agent mode):                                   │
│    monitor --interval 60  → watches feed, auto-attests critical  │
│                                                                  │
│  VERIFY (read from chain):                                       │
│    verify IR-2026-0150    → read attestation back from contract  │
│    stats                  → total attestations, scored countries  │
└──────────────────────────────────────────────────────────────────┘
```

## Live Demo

```bash
$ node bin/censor.mjs check-country CN
{
  "country": "CN",
  "censorship_score": 57,
  "risk_level": "high",
  "active_incidents": 12,
  "recent_incidents": [
    { "id": "CN-2026-0174", "severity": "critical", "started": "2026-04-10" }
  ],
  "recommendation": "HIGH RISK. Score 57/100. Monitor closely before executing large transactions."
}

$ node bin/censor.mjs incidents --country IR --limit 3
{
  "total": 32,
  "incidents": [
    { "id": "IR-2026-0150", "severity": "critical", "confidence": 0.7, "sources": ["ioda"] },
    { "id": "IR-2026-0149", "severity": "critical", "confidence": 0.65, "sources": ["ioda"] }
  ]
}

$ node bin/censor.mjs attest IR-2026-0150
{
  "status": "ready",
  "incident_id": "IR-2026-0150",
  "tx_step_file": "/tmp/attest-IR-2026-0150.json",
  "instruction": "Run: purr execute --file /tmp/attest-IR-2026-0150.json"
}
```

## Architecture

```
                    ┌─────────────────────────┐
                    │     Purrfect Claw Agent  │
                    │    (reads SKILL.md)      │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │    voidly-censor CLI     │
                    │    (10 commands)         │
                    └───┬─────────────┬───────┘
                        │             │
              ┌─────────▼──┐   ┌──────▼──────────────┐
              │ Voidly API │   │ CensorshipOracle.sol │
              │ 200 countries│  │  (opBNB contract)    │
              │ ML classifier│  │  TEE wallet signs    │
              │ 46K evidence │  │  via purr execute    │
              └─────────────┘  └──────────────────────┘
                    │                    │
              ┌─────▼─────┐      ┌──────▼──────┐
              │   OONI    │      │  On-chain   │
              │   IODA    │      │ attestation │
              │ CensoredPl│      │ (verifiable)│
              └───────────┘      └─────────────┘
```

## Smart Contract

`contracts/CensorshipOracle.sol` — gas-optimized Solidity contract for opBNB.

- **`updateCountryRisk(bytes2 country, uint8 score, uint16 incidents)`** — update risk oracle
- **`attestIncident(bytes32 hash, bytes2 country, uint8 severity, ...)`** — immutable attestation
- **`isSafe(bytes2 country)`** — any protocol can call this: returns `(score, safe, lastUpdate)`
- Uses `bytes2` for country codes and `bytes32` for incident hashes (gas efficient)
- Compiled bytecode in `build/` — ready for deployment on opBNB testnet or mainnet

## Purrfect Claw Skill

`skills/voidly-censorship-oracle/SKILL.md` — 9 tools for the agent:

| Tool | Type | Description |
|------|------|-------------|
| `check_country_risk` | READ | Full risk assessment with recommendation |
| `check_domain` | READ | Is a domain blocked in a country? |
| `get_incidents` | READ | Real-time censorship incident feed |
| `get_forecast` | READ | 7-day shutdown risk prediction |
| `update_oracle` | WRITE | Push risk score on-chain via TEE wallet |
| `attest_incident` | WRITE | Attest incident on-chain (immutable proof) |
| `start_monitor` | AUTO | Autonomous: watch + auto-attest critical |
| `verify_attestation` | VERIFY | Read attestation from contract |
| `oracle_stats` | VERIFY | Contract statistics |

## Data Sources

| Source | Records | Method |
|--------|---------|--------|
| OONI | 21,909 | Volunteer probe measurements |
| IODA | 15,108 | BGP + active probing + darknet |
| CensoredPlanet | 9,098 | Remote DNS/HTTP satellite |
| Voidly Network | Real-time | 37+ nodes, 62 domains, every 5 min |
| ML Classifier | 99.8% F1 | GradientBoosting on 37K labeled incidents |

Total: **1,574 verified incidents** across **200 countries** with **46,115 evidence items**.

All data open under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Quick Start

```bash
git clone https://github.com/EmperorMew/censorship-oracle-skill.git
cd censorship-oracle-skill
npm install

# Query censorship data (works immediately — no wallet needed)
node bin/censor.mjs check-country CN
node bin/censor.mjs incidents --country IR --limit 5
node bin/censor.mjs forecast RU

# For on-chain writes (requires deployed contract + wallet)
export ORACLE_ADDRESS=0x...
export PRIVATE_KEY=0x...
node bin/censor.mjs update-oracle CN
node bin/censor.mjs attest IR-2026-0150

# Autonomous monitoring mode
node bin/censor.mjs monitor --interval 60
```

## Why This Wins

Every other hackathon team builds generic DeFi tools. We have **real censorship intelligence data that nobody else has**:

- Real-time incident detection across 200 countries (not static datasets)
- ML-classified with 99.8% F1 accuracy (not rule-based)
- Multi-source correlation (OONI + CensoredPlanet + IODA + Voidly probes)
- 7-day shutdown forecasting using XGBoost + election/protest event calendar
- Already serving production traffic at [voidly.ai](https://voidly.ai)

## Links

| Resource | URL |
|----------|-----|
| Voidly Platform | [voidly.ai](https://voidly.ai) |
| Live Censorship Index | [voidly.ai/censorship-index](https://voidly.ai/censorship-index) |
| API Documentation | [voidly.ai/api-docs](https://voidly.ai/api-docs) |
| MCP Server (83 tools) | `npx @voidly/mcp-server` |
| Agent SDK | `npm install @voidly/agent-sdk` |
| Pieverse Skill Store | [pieverse.io/skill-store](https://www.pieverse.io/skill-store) |

## Team

Built by [Dillon Parkes](https://github.com/EmperorMew) / [Ai Analytics LLC](https://voidly.ai)

## License

MIT
