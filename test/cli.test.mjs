#!/usr/bin/env node

/**
 * Basic CLI integration tests — verifies all READ commands work
 * against the live Voidly API.
 *
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
  return JSON.parse(execSync(`${CLI} ${cmd}`, { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }));
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

console.log('\n  voidly-censor CLI tests\n');

// ── check-country ────────────────────────────────────────

test('check-country CN returns score > 0', () => {
  const data = run('check-country CN');
  assert(data.country === 'CN', `Expected CN, got ${data.country}`);
  assert(data.censorship_score > 0, `Score should be > 0, got ${data.censorship_score}`);
  assert(data.risk_level === 'high', `Expected high, got ${data.risk_level}`);
  assert(data.name === 'China', `Expected China, got ${data.name}`);
});

test('check-country IR returns incidents', () => {
  const data = run('check-country IR');
  assert(data.active_incidents > 0, `Expected incidents > 0, got ${data.active_incidents}`);
  assert(data.recent_incidents.length > 0, 'Expected recent incidents');
});

test('check-country US returns low risk', () => {
  const data = run('check-country US');
  assert(data.risk_level === 'low', `Expected low, got ${data.risk_level}`);
});

test('check-country XX handles unknown gracefully', () => {
  const data = run('check-country XX');
  assert(data.censorship_score === 0, 'Unknown country should return 0');
});

// ── incidents ────────────────────────────────────────────

test('incidents returns array with total', () => {
  const data = run('incidents --limit 3');
  assert(data.total > 0, `Expected total > 0, got ${data.total}`);
  assert(data.incidents.length <= 3, `Expected <= 3 incidents, got ${data.incidents.length}`);
});

test('incidents --country IR filters correctly', () => {
  const data = run('incidents --country IR --limit 2');
  for (const inc of data.incidents) {
    assert(inc.country_code === 'IR', `Expected IR, got ${inc.country_code}`);
  }
});

test('incidents have required fields', () => {
  const data = run('incidents --limit 1');
  const inc = data.incidents[0];
  assert(inc.id, 'Missing id');
  assert(inc.severity, 'Missing severity');
  assert(inc.started, 'Missing started');
  assert(inc.sources, 'Missing sources');
});

// ── risk-score ───────────────────────────────────────────

test('risk-score CN returns numeric score', () => {
  const data = run('risk-score CN');
  assert(typeof data.risk_score === 'number', `Expected number, got ${typeof data.risk_score}`);
  assert(data.risk_score >= 0 && data.risk_score <= 100, `Score out of range: ${data.risk_score}`);
});

test('risk-score RU returns medium', () => {
  const data = run('risk-score RU');
  assert(data.risk_level === 'medium', `Expected medium, got ${data.risk_level}`);
  assert(data.name === 'Russia', `Expected Russia, got ${data.name}`);
});

// ── attest (without contract — should return ready) ──────

test('attest generates TxStep file', () => {
  const data = run('attest IR-2026-0150');
  assert(data.status === 'ready', `Expected ready, got ${data.status}`);
  assert(data.incident_id === 'IR-2026-0150', `Wrong incident ID: ${data.incident_id}`);
  assert(data.tx_step_file, 'Missing tx_step_file');
  assert(data.instruction.includes('purr execute'), 'Missing purr execute instruction');
});

// ── update-oracle (without contract — should return ready) ──

test('update-oracle generates TxStep file', () => {
  const data = run('update-oracle CN');
  assert(data.status === 'ready', `Expected ready, got ${data.status}`);
  assert(data.country === 'CN', `Wrong country: ${data.country}`);
  assert(data.score > 0, `Score should be > 0`);
  assert(data.tx_step_file, 'Missing tx_step_file');
});

// ── forecast ─────────────────────────────────────────────

test('forecast returns data for IR', () => {
  const data = run('forecast IR');
  assert(data.country === 'IR', `Expected IR, got ${data.country}`);
  assert(data.forecast, 'Missing forecast array');
});

// ── help ─────────────────────────────────────────────────

test('no args shows help without error', () => {
  const output = execSync(`${CLI}`, { encoding: 'utf8', timeout: 5000 });
  assert(output.includes('voidly-censor'), 'Help should contain CLI name');
  assert(output.includes('check-country'), 'Help should list commands');
});

// ── Summary ──────────────────────────────────────────────

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
