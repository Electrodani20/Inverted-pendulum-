import test from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../physics.js';

function run(sim, seconds) {
  for (let i = 0; i < seconds * 240; i++) sim.step(1 / 240);
  assert.ok([sim.x, sim.v, sim.theta, sim.omega].every(Number.isFinite), 'state remains finite');
}

test('starts upright and tracks side-to-side motion for two minutes', () => {
  const sim = new Simulation();
  assert.equal(sim.theta, 0);
  run(sim, 120);
  assert.equal(sim.fallen, false);
  assert.ok(sim.peak < 0.08, `peak tilt ${sim.peak}`);
  assert.ok(Math.abs(sim.x - sim.target) < 0.15, `tracking error ${sim.x - sim.target}`);
});

test('PID rejects a moderate wind disturbance and recovers after it stops', () => {
  const sim = new Simulation();
  run(sim, 3); sim.disturbance = 8; run(sim, 30);
  assert.equal(sim.fallen, false);
  sim.disturbance = 0; run(sim, 30);
  assert.ok(Math.abs(sim.theta) < 0.05);
  assert.ok(Math.abs(sim.x - sim.target) < 0.2);
});

test('without PID a disturbed pendulum loses balance', () => {
  const sim = new Simulation(); sim.controller = false; sim.disturbance = 3;
  run(sim, 20);
  assert.equal(sim.fallen, true);
});

test('stationary mode settles and reset restores upright initial conditions', () => {
  const sim = new Simulation(); sim.motion = false; sim.reset();
  run(sim, 10);
  assert.equal(sim.x, 0); assert.equal(sim.theta, 0);
  sim.disturbance = 4; run(sim, 10); sim.reset();
  assert.equal(sim.t, 0); assert.equal(sim.theta, 0); assert.equal(sim.fallen, false);
  assert.equal(sim.disturbance, 4, 'reset preserves chosen experiment settings');
});

test('actuator respects its physical force limit', () => {
  const sim = new Simulation(); sim.theta = 0.5;
  sim.step(1 / 240);
  assert.equal(Math.abs(sim.force), 30);
});
