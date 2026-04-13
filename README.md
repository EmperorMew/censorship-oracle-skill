# DARKWATCH

### Your AI bodyguard for when your government kills the internet.

> *313 shutdowns. 798 million people. $19.7 billion in damage. Zero protection products.*
> *$19.13 billion in crypto liquidated in a single day. 70% in 40 minutes.*
> *Detection-to-blackout window: 5-30 minutes. DARKWATCH response: 20 seconds.*

An autonomous AI agent for [Purrfect Claw](https://docs.pieverse.io) that monitors internet shutdowns across 200 countries and executes emergency DeFi exit plans through the TEE wallet — **before you lose access.**

You set it up once. It watches. When the lights go out, it acts.

Built for [Four.Meme AI Sprint](https://dorahacks.io/hackathon/fourmemeaisprint) · [Pieverse Bounty #1338](https://dorahacks.io/hackathon/fourmemeaisprint/detail)

---

## The Problem Nobody Is Solving

When a government kills the internet:
- Your DeFi lending positions get liquidated (you can't add collateral)
- Your LP tokens lose value (you can't exit)
- Your leveraged trades get margin-called (you can't respond)
- Your funds are trapped (you can't withdraw)

**This isn't theoretical:**
- Iran: 92 million people cut off since January 2026. 44+ consecutive days.
- Pakistan: 82.9 million affected in 2024. 18 shutdowns that year.
- Myanmar: 85 shutdowns in 2024. Kyat lost 75%. Crypto is a lifeline.
- Nigeria: Binance, Coinbase, Kraken blocked since Feb 2024. Still blocked.

**120 million crypto users** live in countries with regular internet shutdowns. **Zero products** protect them.

---

## What DARKWATCH Does

```
$ darkwatch threat IR

{
  "threat_level": "HIGH",
  "threat_score": 30.3,
  "action": "ARM YOUR PLANS — SHUTDOWN LIKELY WITHIN 72H",
  "signals": {
    "censorship_score": 8,
    "active_incidents": 32,
    "critical_incidents": 28,
    "shutdown_forecast_7d": "5.0%"
  },
  "warning": "⚠️ You have NO emergency plan for Iran. Run: darkwatch setup IR"
}
```

```
$ darkwatch simulate IR

Simulation: Internet shutdown in Iran
Protected: True

  T+0:00    GOVERNMENT ORDERS ISP SHUTDOWN
  T+0:03    VOIDLY DETECTS ANOMALY (IODA + OONI)
  T+0:05    MULTI-SOURCE CONFIRMATION — Confidence 82%
  T+0:05    🔴 DARKWATCH ACTIVATED — TEE wallet preparing transactions
  T+0:10    EXECUTING: Withdraw all assets from Venus Protocol
  T+0:15    EXECUTING: Swap to USDT via PancakeSwap (MEV-protected)
  T+0:20    EXECUTING: Transfer stablecoins to cold wallet
  T+0:20    ✅ FUNDS SECURED
  T+0:30    FULL BLACKOUT — Internet drops below 5%
  T+1:00    DeFi LIQUIDATIONS BEGIN for unprotected users
  T+6:00    💀 MASS LIQUIDATION — $19.13B reference (Oct 2025)
```

---

## Commands

| Command | What It Does |
|---------|-------------|
| `darkwatch threat <country>` | Real-time threat level with shutdown probability |
| `darkwatch scan` | Scan all 200 countries, ranked by danger |
| `darkwatch setup <country>` | Create an emergency exit plan (Venus → PancakeSwap → cold wallet) |
| `darkwatch arm <plan-id>` | Arm a plan — agent will auto-execute on shutdown |
| `darkwatch simulate <country>` | See second-by-second what happens during a shutdown |
| `darkwatch watch` | **AUTONOMOUS MODE** — monitors + auto-executes armed plans |
| `darkwatch heartbeat` | Prove you're online (dead man's switch) |
| `darkwatch status` | System status + armed plans |

---

## How It Works

```
You sleep.                              DARKWATCH watches.
    │                                         │
    │   Government orders shutdown             │
    │              │                           │
    │   BGP routes withdrawn (T+0:00)          │
    │              │                           │
    │   Voidly detects anomaly (T+0:03)        │
    │   OONI + IODA + CensoredPlanet           │
    │              │                           │
    │   Multi-source confirm (T+0:05)    ──────┤
    │                                          │
    │                                   TEE wallet activates
    │                                   Venus: redeemUnderlying()
    │                                   PancakeSwap: swap → USDT
    │                                   Transfer → cold wallet
    │                                          │
    │   Full blackout (T+0:30)          ✅ Funds safe.
    │                                          │
    │   Unprotected users                You wake up.
    │   get liquidated. (T+1:00)         Everything is fine.
```

### Why TEE Matters

The emergency plan executes inside Purrfect Claw's Trusted Execution Environment:
- Private keys **never leave the hardware enclave**
- Even the agent operator can't access your funds
- Transactions are signed inside the TEE and broadcast via BSC Protect (MEV-resistant)
- You don't need to be online — the TEE acts on your behalf

---

## Emergency Plan Architecture

Each plan has 3 steps, executed in ~20 seconds:

| Step | Action | Protocol | Contract |
|------|--------|----------|----------|
| 1 | Withdraw supplied assets | Venus Protocol ($1.4B TVL) | `redeemUnderlying()` |
| 2 | Swap to stablecoins | PancakeSwap ($2.2B TVL) | `swapExactETHForTokens()` |
| 3 | Transfer to cold wallet | Direct transfer | `transfer()` |

Gas cost: ~$0.50. Total time: ~15 seconds on BNB Chain.

---

## The Data Behind It

DARKWATCH's threat detection is powered by [Voidly](https://voidly.ai) — the only platform that fuses all major censorship data sources:

| Source | Records | What It Detects |
|--------|---------|----------------|
| OONI | 21,909 | Website/app blocking, DNS tampering |
| IODA | 15,108 | BGP route withdrawals, macroscopic outages |
| CensoredPlanet | 9,098 | DNS, HTTP, HTTPS blocking from satellites |
| Voidly Network | Real-time | 37+ nodes testing 62 domains every 5 min |
| ML Classifier | 99.8% F1 | GradientBoosting on 37K labeled incidents |

**Multi-source confirmation** required before any plan triggers. Minimum 80% confidence from 2+ independent sources. No false positives.

---

## Quick Start

```bash
git clone https://github.com/EmperorMew/censorship-oracle-skill.git
cd censorship-oracle-skill
npm install

# Check threat level for a country
node bin/censor.mjs threat IR
node bin/censor.mjs threat CN
node bin/censor.mjs threat PK

# Scan all countries for risk
node bin/censor.mjs scan

# Create and arm an emergency plan
node bin/censor.mjs setup IR
node bin/censor.mjs arm <plan-id-from-setup>

# Simulate a shutdown
node bin/censor.mjs simulate IR

# Start autonomous protection
node bin/censor.mjs watch --country IR
```

---

## Why This Wins

| What Exists | What's Missing | DARKWATCH |
|-------------|---------------|-----------|
| IODA detects shutdowns | No automated response | Detects AND responds |
| DeFi insurance covers hacks | Zero coverage for shutdowns | Autonomous exit on shutdown |
| Dead man's switches exist | None trigger on verified censorship data | Multi-source ML oracle |
| TEE wallets exist | None used for censorship protection | TEE + shutdown oracle |
| Prediction markets exist | Zero markets on internet freedom | Quantified shutdown risk |

**Nobody in crypto is protecting the 120 million users in shutdown-prone countries.** DARKWATCH is first.

---

## Links

| Resource | URL |
|----------|-----|
| Voidly Platform | [voidly.ai](https://voidly.ai) |
| Live Censorship Index | [voidly.ai/censorship-index](https://voidly.ai/censorship-index) |
| API Documentation | [voidly.ai/api-docs](https://voidly.ai/api-docs) |
| MCP Server (83 tools) | `npx @voidly/mcp-server` |
| Agent SDK | `npm install @voidly/agent-sdk` |

## Team

Built by [Dillon Parkes](https://github.com/EmperorMew) / [Ai Analytics LLC](https://voidly.ai)

## License

MIT
