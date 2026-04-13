#!/usr/bin/env node

/**
 * DARKWATCH CLI integration tests
 * Run: node test/cli.test.mjs
 */

import { execSync } from 'child_process';

const CLI = 'node bin/censor.mjs';
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

function run(cmd) {
  return JSON.parse(execSync(`${CLI} ${cmd}`, { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] }));
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

console.log('\n  DARKWATCH CLI tests\n');

// ── threat ────────────────────────────────────────────

test('threat CN returns HIGH', () => {
  const d = run('threat CN');
  assert(d.threat_level === 'HIGH' || d.threat_level === 'ELEVATED' || d.threat_level === 'CRITICAL', `Unexpected: ${d.threat_level}`);
  assert(d.threat_score > 0, 'Score should be > 0');
  assert(d.action, 'Missing action');
  assert(d.signals.active_incidents >= 0, 'Missing incidents');
});

test('threat IR returns incidents', () => {
  const d = run('threat IR');
  assert(d.signals.active_incidents > 0, `Expected incidents > 0`);
  assert(d.recent_incidents.length > 0, 'Expected recent incidents');
  assert(d.context.detection_window, 'Missing context');
});

test('threat US returns low-to-moderate risk', () => {
  const d = run('threat US');
  assert(['LOW', 'GUARDED', 'ELEVATED'].includes(d.threat_level), `Unexpected threat: ${d.threat_level}`);
  assert(d.threat_level !== 'CRITICAL', 'US should not be CRITICAL');
});

// ── scan ──────────────────────────────────────────────

test('scan returns ranked countries', () => {
  const d = run('scan');
  assert(d.scanned > 100, 'Should scan 100+ countries');
  assert(d.at_risk > 0, 'Should find at-risk countries');
  assert(d.countries[0].threat_level, 'Missing threat level');
  assert(d.global_stats.shutdowns_2025 === 313, 'Wrong shutdown count');
});

// ── setup + arm + plans ──────────────────────────────

test('setup creates a plan', () => {
  const d = run('setup PK');
  assert(d.status === 'plan_created', 'Should create plan');
  assert(d.plan.actions.length === 3, 'Should have 3 actions');
  assert(d.plan.trigger.min_confidence === 80, 'Should require 80% confidence');
  assert(d.plan.execution.method === 'TEE wallet (Purrfect Claw)', 'Should use TEE');
});

test('arm activates a plan', () => {
  const plans = run('plans');
  assert(plans.plans.length > 0, 'Should have plans');
  const planId = plans.plans[plans.plans.length - 1].id;
  const d = run(`arm ${planId}`);
  assert(d.status === 'armed', 'Should be armed');
  assert(d.warning.includes('auto-execute'), 'Should warn about auto-execution');
});

test('disarm deactivates a plan', () => {
  const plans = run('plans');
  const armed = plans.plans.find(p => p.armed);
  assert(armed, 'Should have an armed plan');
  const d = run(`disarm ${armed.id}`);
  assert(d.status === 'disarmed', 'Should be disarmed');
});

// ── simulate ─────────────────────────────────────────

test('simulate shows timeline', () => {
  // Re-arm for simulation
  const plans = run('plans');
  const plan = plans.plans[plans.plans.length - 1];
  run(`arm ${plan.id}`);

  const d = run('simulate PK');
  assert(d.timeline.length >= 7, 'Should have 7+ events');
  assert(d.protected === true, 'Should show as protected');
  assert(d.timeline.some(e => e.event.includes('DARKWATCH ACTIVATED')), 'Should show activation');
  assert(d.timeline.some(e => e.event.includes('FUNDS SECURED')), 'Should show funds secured');
});

test('simulate without plan shows liquidation', () => {
  const d = run('simulate MM');
  assert(d.protected === false, 'Should show unprotected');
  assert(d.timeline.some(e => e.event.includes('LIQUIDATED') || e.event.includes('UNPROTECTED')), 'Should warn about liquidation');
});

// ── heartbeat + status ───────────────────────────────

test('heartbeat records timestamp', () => {
  const d = run('heartbeat');
  assert(d.status === 'heartbeat_sent', 'Should confirm heartbeat');
  assert(d.timestamp, 'Should have timestamp');
});

test('status shows system state', () => {
  const d = run('status');
  assert(d.darkwatch === 'active', 'Should show active');
  assert(d.plans.total > 0, 'Should show plans');
  assert(d.last_heartbeat !== 'never', 'Should show heartbeat');
});

// ── help ──────────────────────────────────────────────

test('no args shows DARKWATCH banner', () => {
  const output = execSync(CLI, { encoding: 'utf8', timeout: 5000 });
  assert(output.includes('bodyguard') || output.includes('DARKWATCH') || output.includes('darkwatch'), 'Should show banner');
  assert(output.includes('798 million'), 'Should show stats');
  assert(output.includes('bodyguard'), 'Should show tagline');
});

// ── Summary ──────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
