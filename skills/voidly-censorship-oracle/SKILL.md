---
name: darkwatch
description: Autonomous DeFi protection agent. Monitors for internet shutdowns in real-time and auto-executes emergency exit plans through the TEE wallet before you lose access. 313 shutdowns hit 798M people in 2025. Zero had protection. Until now.
---

# DARKWATCH

Your AI bodyguard for when your government kills the internet.

This skill monitors censorship signals across 200 countries in real-time. When a shutdown starts, it autonomously executes your pre-configured emergency plan through the TEE wallet — withdrawing your DeFi positions, swapping to stablecoins, and transferring to your cold wallet — BEFORE you lose internet access.

## Tool: assess_threat

Check the real-time threat level for a country. Returns a composite score from censorship data, active incidents, and 7-day shutdown forecast.

### Parameters
- `country_code` (required) — ISO 3166-1 alpha-2 (e.g., IR, CN, PK, RU, MM)

### Execution
```bash
darkwatch threat <country_code>
```
Present the `threat_level`, `action`, and `signals` to the user. If threat is HIGH or CRITICAL and user has no plan, warn them.

---

## Tool: scan_all_countries

Scan all 200 countries and rank by shutdown danger. Shows which countries have armed plans.

### Execution
```bash
darkwatch scan
```

---

## Tool: create_emergency_plan

Create an emergency exit plan for a specific country. The plan defines what happens to the user's DeFi positions when a shutdown is detected.

### Parameters
- `country_code` (required)

### Execution
1. Run:
   ```bash
   darkwatch setup <country_code>
   ```
2. Show the plan details to the user: trigger conditions, actions (Venus withdrawal, PancakeSwap, cold wallet transfer), gas estimates.
3. Remind the user to arm the plan.

---

## Tool: arm_plan

Arm an emergency plan. When armed, DARKWATCH will auto-execute the plan when shutdown conditions are met.

### Parameters
- `plan_id` (required) — from `darkwatch plans`

### Execution
1. Confirm: "Arming this plan means your DeFi positions will be automatically liquidated to stablecoins and transferred to your cold wallet when a shutdown is detected. Proceed?"
2. Run:
   ```bash
   darkwatch arm <plan_id>
   ```

---

## Tool: simulate_shutdown

Simulate a shutdown in a country. Shows a second-by-second timeline of what would happen — with and without DARKWATCH protection.

### Parameters
- `country_code` (required)

### Execution
```bash
darkwatch simulate <country_code>
```
Present the timeline to the user. Highlight the difference between protected (funds secured in 20 seconds) and unprotected (liquidated in 40 minutes).

---

## Tool: start_watching

Start autonomous monitoring mode. The agent continuously watches for shutdown signals and auto-executes armed plans when triggered.

### Execution
1. Tell the user: "Starting autonomous protection. I'll monitor shutdown signals and execute your armed plans if a shutdown is detected. You can close this chat — the monitoring continues."
2. Run:
   ```bash
   darkwatch watch --country <country_code> --interval 30
   ```
3. Each output line is a JSON event. If `event` is `SHUTDOWN_DETECTED`, execute the emergency plan via TEE wallet:
   ```bash
   purr execute --file /tmp/darkwatch-redeem_venus.json
   purr execute --file /tmp/darkwatch-swap_to_stable.json
   purr execute --file /tmp/darkwatch-transfer_safe.json
   ```

---

## Tool: send_heartbeat

Prove you're still online. If heartbeats stop arriving, it's an early signal of connectivity loss.

### Execution
```bash
darkwatch heartbeat
```

---

## Tool: check_status

System status — armed plans, last heartbeat, protection coverage.

### Execution
```bash
darkwatch status
```

---

## Example Interactions

**"Am I safe in Iran?"**
→ `assess_threat` IR → Show threat level + recommendation

**"Protect my funds in case Pakistan shuts down"**
→ `create_emergency_plan` PK → `arm_plan` → `start_watching`

**"What happens if China goes dark right now?"**
→ `simulate_shutdown` CN → Show timeline with and without protection

**"Show me the most dangerous countries"**
→ `scan_all_countries` → Ranked list with threat levels

**"I'm traveling to Myanmar. Set up protection."**
→ `assess_threat` MM → `create_emergency_plan` MM → `arm_plan` → "Your funds are now protected. I'll watch while you're there."

## How It Works

```
You sleep                          DARKWATCH watches
    │                                    │
    │    Government orders shutdown       │
    │              │                      │
    │    BGP routes withdrawn (T+0:00)    │
    │              │                      │
    │    Voidly detects anomaly (T+0:03)  │
    │              │                      │
    │    Multi-source confirm (T+0:05)   ─┤
    │                                     │
    │                              TEE wallet activates
    │                              Redeem Venus (T+0:10)
    │                              Swap to USDT (T+0:15)
    │                              Transfer cold (T+0:20)
    │                                     │
    │    Full blackout (T+0:30)     ✅ Funds safe
    │                                     │
    │    Unprotected users               You wake up.
    │    get liquidated (T+1:00)         Everything is fine.
```

## Data

- 200 countries monitored
- 313 shutdowns detected in 2025
- 798 million people affected
- $19.7B economic damage
- Detection-to-protection: ~20 seconds
- Detection-to-blackout: 5-30 minutes

Powered by [Voidly](https://voidly.ai) censorship intelligence. TEE security via [Purrfect Claw](https://docs.pieverse.io).
