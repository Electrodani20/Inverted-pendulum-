import { Simulation, clamp } from './physics.js';
import { PhoneTilt, tiltTarget } from './motion.js';

const $ = id => document.getElementById(id);
const sim = new Simulation();
sim.manual = true;
sim.reset();
let controlMode = 'touch', phoneAngle = 0;
let paused = false, speed = 1, history = [], accumulator = 0, lastSample = -1;
const dt = 1 / 240;
const stage = $('simulation');
const context = stage.getContext('2d');
let w = 0, h = 0;
const format = (v, digits = 2) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits);

function resize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }
  canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
  return [rect.width, rect.height];
}

function line(ctx, x1, y1, x2, y2, color, width = 1, dash = []) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
}

function circle(ctx, x, y, r, color) {
  ctx.beginPath(); ctx.fillStyle = color; ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius, color) {
  ctx.beginPath(); ctx.fillStyle = color; ctx.roundRect(x, y, width, height, radius); ctx.fill();
}

function arrow(ctx, x1, y1, x2, y2, color = '#111', width = 1) {
  line(ctx, x1, y1, x2, y2, color, width);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 7;
  ctx.beginPath(); ctx.fillStyle = color;
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - size * Math.cos(angle - 0.38), y2 - size * Math.sin(angle - 0.38));
  ctx.lineTo(x2 - size * Math.cos(angle + 0.38), y2 - size * Math.sin(angle + 0.38));
  ctx.closePath(); ctx.fill();
}

function outlinedCircle(ctx, x, y, radius, fill, stroke = '#111') {
  circle(ctx, x, y, radius, fill);
  ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
}

function mathLabel(ctx, text, x, y, size = 16, align = 'left', color = '#111') {
  ctx.font = `italic ${size}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
}

function drawStage() {
  [w, h] = resize(stage);
  const c = context;
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  // The drawing follows the textbook schematic; every moving part uses the true state.
  const ground = h - 48;
  const scale = Math.min(h * 0.49, w / 2.7);
  const bodyWidth = scale * 0.72;
  const bodyHeight = scale * 0.20;
  const wheelRadius = scale * 0.09;
  const bobRadius = scale * 0.09;
  const center = w / 2;
  // Pan only when needed to keep the complete mechanism visible on narrow screens.
  const travelRoom = Math.max(0, center - bodyWidth / 2 - 58);
  const cart = center + clamp(sim.x * scale, -travelRoom, travelRoom);
  const camera = sim.x - (cart - center) / scale;
  const target = center + (sim.target - camera) * scale;
  const bodyTop = ground - 2 * wheelRadius - bodyHeight;
  const pivotY = bodyTop;
  const bobX = cart + Math.sin(sim.theta) * scale;
  const bobY = pivotY - Math.cos(sim.theta) * scale;

  // Hatched stationary ground, as in the supplied engineering diagram.
  line(c, 0, ground, w, ground, '#111');
  for (let x = 0; x < w + 10; x += 10) line(c, x, ground, x - 6, ground + 12, '#333', 0.8);

  // Target position stays on the track; the upright reference is attached to the pivot.
  if (target > 8 && target < w - 8) {
    line(c, target, ground + 16, target, ground + 24, '#8d8d8d', 1, [2, 2]);
    c.font = '8px ui-monospace, monospace'; c.textAlign = 'center'; c.fillStyle = '#888';
    c.fillText('target', target, ground + 34);
  }
  line(c, cart, Math.max(0, pivotY - scale - 38), cart, pivotY, '#bbb', 1);

  // Rectangular gray cart, two plain gray wheels, and an outlined pivot bracket.
  for (const x of [cart - bodyWidth * 0.31, cart + bodyWidth * 0.31]) {
    outlinedCircle(c, x, ground - wheelRadius, wheelRadius, '#aaa');
  }
  c.fillStyle = '#aaa'; c.fillRect(cart - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
  c.strokeStyle = '#333'; c.lineWidth = 1.2;
  c.strokeRect(cart - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
  c.beginPath(); c.moveTo(cart - 9, bodyTop); c.lineTo(cart - 4, bodyTop - 8);
  c.quadraticCurveTo(cart, bodyTop - 13, cart + 4, bodyTop - 8);
  c.lineTo(cart + 9, bodyTop); c.closePath(); c.fillStyle = '#b9b9b9'; c.fill(); c.stroke();

  // Thin black rod outline with gray core, and a solid black point mass.
  line(c, cart, pivotY - 4, bobX, bobY, '#111', 6);
  line(c, cart, pivotY - 4, bobX, bobY, '#b6b6b6', 4);
  circle(c, bobX, bobY, bobRadius, '#000');
  mathLabel(c, 'm', bobX + bobRadius + 8, bobY - 7);
  mathLabel(c, 'M', cart - bodyWidth / 2 - 9, bodyTop + bodyHeight - 3, 16, 'right');
  mathLabel(c, 'l', (cart + bobX) / 2 - 17 * Math.cos(sim.theta), (pivotY + bobY) / 2 - 17 * Math.sin(sim.theta));

  // Signed angle arc: zero is vertical, with clockwise positive as in the model.
  const radius = scale * 0.68;
  const vertical = -Math.PI / 2;
  const rodAngle = vertical + sim.theta;
  if (Math.abs(sim.theta) > 0.018) {
    c.beginPath(); c.strokeStyle = '#111'; c.lineWidth = 1;
    c.arc(cart, pivotY, radius, vertical, rodAngle, sim.theta < 0); c.stroke();
    const endX = cart + radius * Math.cos(rodAngle);
    const endY = pivotY + radius * Math.sin(rodAngle);
    const tangent = rodAngle + (sim.theta > 0 ? Math.PI / 2 : -Math.PI / 2);
    arrow(c, endX - Math.cos(tangent) * 5, endY - Math.sin(tangent) * 5, endX, endY);
    const middle = vertical + sim.theta / 2;
    mathLabel(c, 'θ', cart + (radius + 15) * Math.cos(middle), pivotY + (radius + 15) * Math.sin(middle), 16, 'center');
  } else {
    mathLabel(c, `θ = ${format(sim.theta * 180 / Math.PI, 1)}°`, cart + 19, pivotY - radius, 14);
  }

  // Coordinate axes remain fixed to the ground.
  const axesX = 22, axesY = ground - 52;
  arrow(c, axesX, axesY, axesX + 36, axesY);
  arrow(c, axesX, axesY, axesX, axesY - 40);
  mathLabel(c, 'x', axesX + 37, axesY + 13, 14);
  mathLabel(c, 'y', axesX + 9, axesY - 37, 14);

  // Applied PID force acts at the cart center. Its direction follows the actual force.
  const direction = sim.force < -0.01 ? -1 : 1;
  const forceStart = cart + direction * bodyWidth / 2;
  const available = direction > 0 ? w - 12 - forceStart : forceStart - 12;
  const forceLength = Math.max(10, Math.min(available, 45 + Math.abs(sim.force) * 1.4));
  const forceEnd = forceStart + direction * forceLength;
  const forceY = bodyTop + bodyHeight / 2;
  arrow(c, forceStart, forceY, forceEnd, forceY, '#111', 1.2);
  const forceLabelX = (forceStart + forceEnd) / 2;
  mathLabel(c, 'F', forceLabelX, forceY - 9, 17, 'center');
  arrow(c, forceLabelX - 5, forceY - 27, forceLabelX + 6, forceY - 27, '#111', 0.8);

  // A separate labeled arrow distinguishes external disturbance from control effort.
  if (sim.disturbance > 0 && Math.abs(sim.wind) > 0.05) {
    const windDirection = Math.sign(sim.wind);
    const windY = bodyTop - 35;
    const windStart = cart - windDirection * (bodyWidth / 2 + 32);
    arrow(c, windStart, windY, windStart + windDirection * 27, windY, '#777');
    c.font = '10px Georgia, serif'; c.textAlign = 'center'; c.fillStyle = '#666';
    c.fillText(`disturbance ${format(sim.wind, 1)} N`, windStart + windDirection * 10, windY - 10);
  }
}

function drawChart(id, key, color, minimumScale, reference) {
  const canvas = $(id), c = canvas.getContext('2d');
  const [width, height] = resize(canvas);
  c.clearRect(0, 0, width, height);
  const startX = 25, endX = width - 4, top = 9, bottom = height - 8;
  let range = Math.max(minimumScale, ...history.map(p => Math.abs(p[key]) * 1.2), ...(reference ? history.map(p => Math.abs(p[reference]) * 1.2) : []));
  range = Math.ceil(range * 10) / 10;
  const yy = value => (top + bottom) / 2 - value / range * (bottom - top) / 2;
  for (const value of [-range, 0, range]) {
    line(c, startX, yy(value), endX, yy(value), value === 0 ? '#dfe5d5' : '#e9ede2', 1, value === 0 ? [] : [2, 4]);
    c.font = '7px ui-monospace, monospace'; c.fillStyle = '#a3ad96'; c.textAlign = 'right';
    c.fillText(format(value, range < 3 ? 1 : 0), startX - 5, yy(value) + 2);
  }
  const path = (field, stroke, dashed = false) => {
    c.beginPath(); c.lineWidth = dashed ? 1 : 1.5; c.strokeStyle = stroke; c.setLineDash(dashed ? [3, 4] : []);
    const points = history.filter(p => p.t >= sim.t - 20);
    points.forEach((p, i) => {
      const x = startX + (p.t - (sim.t - 20)) / 20 * (endX - startX);
      i === 0 ? c.moveTo(x, yy(p[field])) : c.lineTo(x, yy(p[field]));
    });
    c.stroke(); c.setLineDash([]);
    if (!dashed && points.length) { const last = points.at(-1); circle(c, startX + (last.t - sim.t + 20) / 20 * (endX - startX), yy(last[field]), 2.5, stroke); }
  };
  if (reference) path(reference, '#a7b29a', true);
  path(key, color);
}

function updateReadings() {
  const degrees = sim.theta * 180 / Math.PI;
  $('angle').innerHTML = `${format(degrees)}<span>°</span>`;
  $('angle-overlay').textContent = `${format(degrees)}°`;
  $('position').innerHTML = `${format(sim.x)} <span>m</span>`;
  $('force').innerHTML = `${format(sim.force)} <span>N</span>`;
  $('velocity').innerHTML = `${format(sim.omega * 180 / Math.PI)} <span>°/s</span>`;
  const minutes = Math.floor(sim.t / 60).toString().padStart(2, '0');
  const seconds = (sim.t % 60).toFixed(2).padStart(5, '0');
  $('clock').textContent = `${minutes}:${seconds}`;
  const status = $('status');
  const state = sim.fallen ? 'Balance lost' : paused ? 'Paused' : !sim.controller ? 'Open loop' : Math.abs(degrees) > 4 ? 'Recovering' : sim.disturbance > 0 ? 'Stabilizing' : 'Balanced';
  status.innerHTML = `<span></span> ${state}`;
  status.className = `status${sim.fallen ? ' danger' : Math.abs(degrees) > 4 || !sim.controller ? ' warning' : ''}`;
  $('fallen-overlay').hidden = !sim.fallen;
  $('phone-angle').textContent = controlMode === 'tilt' ? `${format(phoneAngle, 1)}°` : '—';
  $('target-position').textContent = `${format(sim.manual ? sim.manualTarget : sim.target)} m`;
}

function setDisturbance(value) {
  sim.disturbance = clamp(Number(value), 0, 30);
  $('disturbance').value = sim.disturbance;
  $('disturbance-value').textContent = sim.disturbance;
  $('disturbance-level').textContent = sim.disturbance === 0 ? 'All calm' : sim.disturbance < 7 ? 'Light breeze' : sim.disturbance < 15 ? 'Getting windy' : sim.disturbance < 24 ? 'Strong gusts' : 'Storm warning';
  $('disturbance').style.background = `linear-gradient(to right, #e9713b ${sim.disturbance / 30 * 100}%, #e7e9df ${sim.disturbance / 30 * 100}%)`;
  $('decrease').disabled = sim.disturbance === 0;
  $('increase').disabled = sim.disturbance === 30;
}

function setPaused(value) {
  paused = value;
  $('play').innerHTML = paused
    ? '<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M2 1L11 7L2 13Z" fill="currentColor"/></svg>'
    : '<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M2 2H5V12H2ZM8 2H11V12H8Z" fill="currentColor"/></svg>';
  $('play').setAttribute('aria-label', paused ? 'Resume simulation' : 'Pause simulation');
}

function reset() {
  sim.reset(); history = []; lastSample = -1; accumulator = 0; setPaused(false);
  $('fallen-overlay').hidden = true;
}

$('disturbance').addEventListener('input', e => setDisturbance(e.target.value));
$('increase').addEventListener('click', () => setDisturbance(sim.disturbance + 1));
$('decrease').addEventListener('click', () => setDisturbance(sim.disturbance - 1));
$('reset').addEventListener('click', reset);
$('try-again').addEventListener('click', reset);
$('play').addEventListener('click', () => setPaused(!paused));
document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
  speed = Number(button.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('selected', b === button));
}));
for (const key of ['kp', 'ki', 'kd']) $(key).addEventListener('input', e => {
  const input = e.target;
  if (input.value !== '' && Number.isFinite(input.valueAsNumber)) sim.gains[key] = clamp(input.valueAsNumber, 0, Number(input.max));
});
for (const key of ['kp', 'ki', 'kd']) $(key).addEventListener('change', () => { $(key).value = sim.gains[key]; });
$('restore').addEventListener('click', () => {
  sim.gains = { kp: 100, ki: 8, kd: 22 };
  for (const [key, value] of Object.entries(sim.gains)) $(key).value = value;
  sim.angleIntegral = 0;
});
$('pid-enabled').addEventListener('change', e => {
  sim.controller = e.target.checked; sim.angleIntegral = 0;
  $('pid-state').textContent = sim.controller ? 'PID controller active' : 'Controller off · open loop';
  $('pid-dot').style.background = sim.controller ? '' : '#d79b6a';
});
$('motion').addEventListener('change', e => { sim.motion = e.target.checked; sim.positionIntegral = 0; });
document.addEventListener('keydown', e => {
  // Leave native keyboard controls intact while editing form inputs.
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target.isContentEditable) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    selectMode('touch');
    setCartTarget(sim.manualTarget + (e.key === 'ArrowRight' ? 0.15 : -0.15));
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); setDisturbance(sim.disturbance + (e.key === 'ArrowUp' ? 1 : -1));
  } else if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') {
    e.preventDefault(); if (!e.repeat) setPaused(!paused);
  } else if (e.key.toLowerCase() === 'r' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) reset();
});

function refreshMode() {
  document.body.classList.toggle('tilt-active', controlMode === 'tilt');
  $('touch-controls').hidden = controlMode !== 'touch';
  $('input-mode').textContent = controlMode === 'tilt' ? 'PHONE TILT' : controlMode === 'demo' ? 'AUTO DEMO' : 'TOUCH CONTROL';
  $('touch-mode').setAttribute('aria-pressed', String(controlMode === 'touch'));
  $('demo-mode').setAttribute('aria-pressed', String(controlMode === 'demo'));
}

function setCartTarget(value) {
  sim.manualTarget = clamp(Number(value), -1.6, 1.6);
  $('touch-position').value = sim.manualTarget;
}

function selectMode(mode) {
  if (mode === controlMode) return;
  if (phone.running || phone.pending) phone.stop();
  controlMode = mode;
  phoneAngle = 0;
  if (mode === 'demo') {
    sim.manual = false;
    reset();
  } else {
    sim.enterManual();
    setCartTarget(sim.x);
  }
  refreshMode();
}

const phone = new PhoneTilt({
  onAngle(angle) {
    phoneAngle = angle;
    if (controlMode === 'tilt') setCartTarget(tiltTarget(angle, Number($('tilt-range').value), $('invert-tilt').checked));
  },
  onState(state, message) {
    $('motion-status').textContent = message;
    $('motion-status').dataset.state = state;
    $('enable-tilt').textContent = state === 'requesting' ? 'Waiting for permission…' : state === 'waiting' || state === 'active' ? 'Stop phone tilt' : 'Enable phone tilt';
    $('enable-tilt').disabled = state === 'requesting';
    $('calibrate').disabled = state !== 'active';
    if (state === 'waiting') {
      controlMode = 'tilt';
      sim.enterManual();
      setCartTarget(sim.x);
      phoneAngle = 0;
    } else if ((state === 'off' || state === 'error') && controlMode === 'tilt') {
      controlMode = 'touch';
      setCartTarget(sim.x);
      phoneAngle = 0;
    }
    refreshMode();
  }
});

$('enable-tilt').addEventListener('click', () => phone.running ? phone.stop() : phone.start());
$('calibrate').addEventListener('click', () => phone.calibrate());
$('touch-mode').addEventListener('click', () => selectMode('touch'));
$('demo-mode').addEventListener('click', () => selectMode('demo'));
$('touch-position').addEventListener('input', e => setCartTarget(e.target.value));
$('center-cart').addEventListener('click', () => setCartTarget(0));
function updateSensitivity() {
  $('tilt-range-label').textContent = `${$('tilt-range').value}°`;
  if (controlMode === 'tilt') setCartTarget(tiltTarget(phoneAngle, Number($('tilt-range').value), $('invert-tilt').checked));
}
$('tilt-range').addEventListener('input', updateSensitivity);
$('invert-tilt').addEventListener('change', updateSensitivity);
$('open-settings').addEventListener('click', () => {
  $('settings').open = true;
  $('settings').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.addEventListener('visibilitychange', () => {
  // A hidden page must not accumulate physics time or keep steering on old readings.
  if (document.hidden) {
    setPaused(true);
    if (phone.running || phone.pending) phone.stop('off', 'Motion paused while you were away. Resume the simulation and enable tilt again.');
  }
});
window.addEventListener('pagehide', () => phone.stop());
refreshMode();

let previous = performance.now(), lastUI = 0;
function animate(now) {
  const elapsed = Math.min((now - previous) / 1000, 0.1); previous = now;
  if (!paused && !sim.fallen) {
    accumulator += elapsed * speed;
    while (accumulator >= dt) {
      sim.step(dt); accumulator -= dt;
      if (sim.t - lastSample >= 1 / 30) {
        history.push({ t: sim.t, angle: sim.theta * 180 / Math.PI, position: sim.x, target: sim.target, force: sim.force });
        lastSample = sim.t;
        while (history.length && history[0].t < sim.t - 20) history.shift();
      }
      if (sim.fallen) { accumulator = 0; break; }
    }
  }
  drawStage();
  if (now - lastUI > 50) {
    updateReadings();
    drawChart('angle-chart', 'angle', '#df7a47', 2);
    drawChart('position-chart', 'position', '#53654a', 1.6, 'target');
    drawChart('force-chart', 'force', '#7c9870', 5);
    lastUI = now;
  }
  requestAnimationFrame(animate);
}
setDisturbance(0);
setPaused(false);
requestAnimationFrame(animate);
