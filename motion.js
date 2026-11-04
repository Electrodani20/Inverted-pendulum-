const limit = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const radians = Math.PI / 180;

// Project the gravity vector onto the current screen's horizontal axis.
// This handles portrait and both landscape orientations without using compass data.
export function screenRoll(beta, gamma, screenAngle = 0) {
  if (![beta, gamma, screenAngle].every(Number.isFinite)) return null;
  const b = beta * radians, g = gamma * radians, a = screenAngle * radians;
  const horizontal = Math.cos(b) * Math.sin(g) * Math.cos(a) + Math.sin(b) * Math.sin(a);
  const normal = Math.cos(b) * Math.cos(g);
  if (Math.hypot(horizontal, normal) < 0.08) return null; // Phone nearly edge-on to gravity.
  return Math.atan2(horizontal, normal) / radians;
}

export function tiltTarget(angle, fullTilt = 25, invert = false) {
  const magnitude = Math.max(0, Math.abs(angle) - 1.5); // Small dead zone for hand tremor.
  const normalized = limit(magnitude / (fullTilt - 1.5), 0, 1);
  return Math.sign(angle) * normalized * 1.6 * (invert ? -1 : 1);
}

export class PhoneTilt {
  constructor({ onAngle, onState }) {
    this.onAngle = onAngle;
    this.onState = onState;
    this.running = false;
    this.pending = false;
    this.session = 0;
    this.neutral = null;
    this.latest = null;
    this.filtered = 0;
    this.lastReading = 0;
    this.handle = event => this.read(event);
  }

  async start() {
    if (this.pending || this.running) return;
    const Type = window.DeviceOrientationEvent;
    if (!window.isSecureContext || location.protocol === 'file:') {
      this.onState('error', 'Open the HTTPS website on your phone to use motion. The touch slider works here.');
      return;
    }
    if (!Type) {
      this.onState('error', 'This browser has no motion sensor access. Try Safari on iPhone or Chrome on Android, or use touch.');
      return;
    }
    this.pending = true;
    const session = ++this.session;
    this.onState('requesting', 'Allow motion access when your phone asks.');
    try {
      // Must be called directly from the user's tap on iOS, before any other await.
      const permission = typeof Type.requestPermission === 'function' ? await Type.requestPermission() : 'granted';
      if (session !== this.session) return;
      this.pending = false;
      if (permission !== 'granted') {
        this.onState('error', 'Motion permission was denied. Allow motion in your browser settings, reload, and try again. Touch control is available.');
        return;
      }
      this.running = true;
      this.neutral = null;
      this.latest = null;
      this.filtered = 0;
      this.lastReading = 0;
      this.started = performance.now();
      this.screenAngle = this.orientation();
      window.addEventListener('deviceorientation', this.handle);
      this.onState('waiting', 'Hold your phone comfortably, screen facing up. Waiting for a motion reading…');
      this.watchdog = setInterval(() => {
        const now = performance.now();
        if (!this.lastReading && now - this.started > 5000) {
          this.stop('error', 'No motion readings arrived. Open this link directly in Safari or Chrome, check motion permissions, or use touch.');
        } else if (this.lastReading && !document.hidden && now - this.lastReading > 3000) {
          this.stop('error', 'Motion readings stopped. The cart is holding its position. Tap Enable phone tilt to reconnect.');
        }
      }, 500);
    } catch {
      if (session !== this.session) return;
      this.pending = false;
      this.onState('error', 'The browser could not enable motion. Open the HTTPS link directly in Safari or Chrome, or use touch control.');
    }
  }

  orientation() { return window.screen.orientation?.angle ?? window.orientation ?? 0; }

  read(event) {
    if (!this.running || document.hidden) return;
    const screenAngle = this.orientation();
    const raw = screenRoll(event.beta, event.gamma, screenAngle);
    if (raw === null) return;
    const now = performance.now();
    if (screenAngle !== this.screenAngle) {
      this.screenAngle = screenAngle;
      this.neutral = null;
    }
    this.latest = raw;
    if (this.neutral === null) {
      this.neutral = raw;
      this.filtered = 0;
      this.onState('active', 'Tilt left to go left, right to go right. Your current hold is the neutral position.');
    }
    const difference = ((raw - this.neutral + 540) % 360) - 180;
    const elapsed = this.lastReading ? limit((now - this.lastReading) / 1000, 0.001, 0.1) : 0.016;
    this.filtered += (limit(difference, -60, 60) - this.filtered) * (1 - Math.exp(-elapsed / 0.12));
    this.lastReading = now;
    this.onAngle(this.filtered);
  }

  calibrate() {
    if (!this.running || this.latest === null) return;
    this.neutral = this.latest;
    this.filtered = 0;
    this.onAngle(0);
    this.onState('active', 'Neutral calibrated. Keep this comfortable hold, then tilt gently left or right.');
  }

  stop(state = 'off', message = 'Phone tilt is off. Move the touch slider, or enable tilt again.') {
    ++this.session;
    this.pending = false;
    this.running = false;
    this.latest = null;
    this.neutral = null;
    clearInterval(this.watchdog);
    window.removeEventListener('deviceorientation', this.handle);
    this.onState(state, message);
  }
}
