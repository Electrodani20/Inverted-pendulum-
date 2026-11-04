import test from 'node:test';
import assert from 'node:assert/strict';
import { screenRoll, tiltTarget } from '../motion.js';
import { Simulation } from '../physics.js';

test('portrait and both landscape rotations preserve left/right steering', () => {
  assert.ok(Math.abs(screenRoll(35, 20, 0) - 20) < 0.001);
  assert.ok(screenRoll(20, 0, 90) > 0);
  assert.ok(screenRoll(20, 0, 270) < 0);
  assert.ok(screenRoll(0, 20, 180) < 0);
  assert.equal(screenRoll(null, 0), null);
  assert.equal(screenRoll(NaN, 0), null);
  assert.equal(screenRoll(90, 0), null, 'edge-on readings are ignored');
});

test('tilt mapping has a neutral dead zone, sensitivity, inversion, and bounded travel', () => {
  assert.equal(tiltTarget(1), 0);
  assert.equal(tiltTarget(-1), -0);
  assert.equal(tiltTarget(25), 1.6);
  assert.equal(tiltTarget(-60), -1.6);
  assert.equal(tiltTarget(25, 25, true), -1.6);
  assert.ok(tiltTarget(10, 15) > tiltTarget(10, 35));
});

test('rapid left/right phone commands move the cart while maintaining balance', () => {
  const sim = new Simulation(); sim.manual = true; sim.reset();
  let minX = 0, maxX = 0;
  for (let i = 0; i < 120 * 240; i++) {
    sim.manualTarget = Math.floor(i / (8 * 240)) % 2 ? -1.6 : 1.6;
    const previousVelocity = sim.commandVelocity;
    sim.step(1 / 240);
    minX = Math.min(minX, sim.x); maxX = Math.max(maxX, sim.x);
    assert.ok(Math.abs(sim.commandVelocity) <= 0.65001);
    assert.ok(Math.abs(sim.commandVelocity - previousVelocity) <= 0.6 / 240 + 1e-9);
    assert.equal(sim.fallen, false);
  }
  assert.ok(maxX > 1 && minX < -1, `left/right travel ${minX}, ${maxX}`);
  assert.ok(sim.peak < 0.2, `peak tilt ${sim.peak}`);
});

test('phone steering balances in wind and settles at the chosen position', () => {
  const sim = new Simulation(); sim.manual = true; sim.reset();
  sim.disturbance = 6;
  for (let i = 0; i < 30 * 240; i++) { sim.manualTarget = 1; sim.step(1 / 240); }
  assert.equal(sim.fallen, false);
  sim.disturbance = 0;
  for (let i = 0; i < 40 * 240; i++) sim.step(1 / 240);
  assert.equal(sim.fallen, false);
  assert.ok(Math.abs(sim.x - 1) < 0.12, `final x ${sim.x}`);
  assert.ok(Math.abs(sim.theta) < 0.02);
});
