# Voidly Censorship Intelligence Oracle

**The world's first on-chain censorship intelligence oracle.** An AI agent skill for [Purrfect Claw](https://docs.pieverse.io) that brings real-time internet censorship data to BNB Chain — powered by 2.2B+ network measurements across 200 countries.

Built for the [Four.Meme AI Sprint Hackathon](https://dorahacks.io/hackathon/fourmemeaisprint).

## What It Does

| Command | Description |
|---------|-------------|
| `check-country <IR>` | Full censorship risk assessment — score, incidents, forecast, recommendation |
| `check-domain <twitter.com> <CN>` | Is a domain blocked in a country? |
| `incidents [--country IR]` | Real-time censorship incident feed |
| `forecast <RU>` | 7-day shutdown risk prediction |
| `risk-score <EG>` | Numeric score (0-100) formatted for on-chain oracle |
| `attest <IR-2026-0150>` | Generate EIP-712 attestation payload → sign with TEE wallet |

## Why This Matters

Every other hackathon project builds generic DeFi tools. **We have data nobody else has.**

- **1,574 verified censorship incidents** from OONI, CensoredPlanet, and IODA
- **46,115 evidence items** with ML classification (99.8% F1 score)
- **7-day shutdown forecasts** using XGBoost + event calendar correlation
- **Real-time service accessibility** checks for any domain in any country

When a country shuts down its internet, DeFi users in that country can't access their funds. This oracle tells agents (and traders) **before** it happens.

## Architecture

```
User → Purrfect Claw Agent → SKILL.md → voidly-censor CLI → Voidly API
                                  ↓
                            TEE Wallet (purr CLI)
                                  ↓
                         On-chain Attestation (BNB Chain)
```

1. User asks: "Is it safe to trade in Iran?"
2. Agent reads SKILL.md, runs `voidly-censor check-country IR`
3. CLI queries Voidly's API — returns risk score, active incidents, forecast
4. Agent advises the user based on censorship risk
5. For attestation: CLI generates EIP-712 typed data → agent calls `purr wallet sign-typed-data` → signed attestation proves the censorship event was verified inside the TEE

## Setup

```bash
# Clone
git clone https://github.com/voidly-ai/censorship-oracle-skill.git
cd censorship-oracle-skill

# Test the CLI
node bin/censor.mjs check-country IR
node bin/censor.mjs incidents --country CN --limit 5
node bin/censor.mjs attest IR-2026-0150

# Install globally (for Purrfect Claw)
npm link
```

## Skill Structure

```
skills/voidly-censorship-oracle/
  SKILL.md              ← Agent reads this to know what commands to run
  references/
    api-reference.md    ← Voidly API documentation

bin/
  censor.mjs            ← CLI tool that queries Voidly API

package.json
README.md
```

## Data Sources

| Source | Measurements | Coverage |
|--------|-------------|----------|
| OONI | 21,909 | Volunteer probes worldwide |
| IODA | 15,108 | Macroscopic outage detection |
| CensoredPlanet | 9,098 | Remote DNS/HTTP measurement |
| Voidly Network | Real-time | 37+ nodes, 62 domains, every 5 min |

All data is open under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## TEE Wallet Integration

The attestation flow uses Purrfect Claw's native TEE wallet:

1. `voidly-censor attest <id>` generates EIP-712 typed data
2. Agent calls `purr wallet sign-typed-data` with the payload
3. Signature is created inside the Trusted Execution Environment
4. The signed attestation is verifiable on BNB Chain

This means the attestation is **tamper-proof** — neither the agent operator nor the skill developer can forge the signature.

## Example Output

```bash
$ node bin/censor.mjs check-country IR
{
  "country": "IR",
  "name": "Iran",
  "active_incidents": 32,
  "recent_incidents": [
    {
      "id": "IR-2026-0150",
      "title": "Internet connectivity disruption in Iran",
      "severity": "critical",
      "status": "active"
    }
  ],
  "recommendation": "HIGH RISK. Score 70/100 with 32 active incidents. Exercise extreme caution with on-chain operations."
}
```

## Links

- **Voidly Platform**: [voidly.ai](https://voidly.ai)
- **API Documentation**: [voidly.ai/api-docs](https://voidly.ai/api-docs)
- **Live Censorship Index**: [voidly.ai/censorship-index](https://voidly.ai/censorship-index)
- **MCP Server** (83 tools): `npx @voidly/mcp-server`
- **Agent SDK**: `npm install @voidly/agent-sdk`
- **Pieverse Skill Store**: [pieverse.io/skill-store](https://www.pieverse.io/skill-store)

## Team

Built by [Dillon Parkes](https://github.com/EmperorMew) / [Ai Analytics LLC](https://voidly.ai)

## License

MIT
