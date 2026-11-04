export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// Nonlinear point-mass inverted pendulum. θ = 0 is upright; positive θ leans right.
// M x'' + m L θ'' cos θ - m L θ'² sin θ = F
// L θ'' = g sin θ - x'' cos θ
export class Simulation {
  constructor() {
    this.gains = { kp: 100, ki: 8, kd: 22 };
    this.disturbance = 0;
    this.controller = true;
    this.motion = true;
    this.manual = false;
    this.manualTarget = 0;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.x = 0;
    this.v = !this.manual && this.motion ? 1.2 * 0.34 : 0;
    this.commandPosition = 0;
    this.commandVelocity = 0;
    this.commandAcceleration = 0;
    this.theta = 0;
    this.omega = 0;
    this.angleIntegral = 0;
    this.positionIntegral = 0;
    this.force = 0;
    this.wind = 0;
    this.fallen = false;
    this.peak = 0;
  }

  enterManual() {
    this.manual = true;
    this.manualTarget = this.x;
    this.commandPosition = this.x;
    this.commandVelocity = this.v;
    this.commandAcceleration = 0;
    this.positionIntegral = 0;
  }

  get target() { return this.manual ? this.commandPosition : this.motion ? 1.2 * Math.sin(this.t * 0.34) : 0; }
  get targetVelocity() { return this.manual ? this.commandVelocity : this.motion ? 1.2 * 0.34 * Math.cos(this.t * 0.34) : 0; }
  get targetAcceleration() { return this.manual ? this.commandAcceleration : this.motion ? -1.2 * 0.34 ** 2 * Math.sin(this.t * 0.34) : 0; }

  step(dt) {
    if (this.fallen) return;
    this.t += dt;
    if (this.manual) {
      // Rate- and acceleration-limited target: rapid phone movements never teleport the cart.
      const destination = clamp(this.manualTarget, -1.6, 1.6);
      const wantedVelocity = clamp((destination - this.commandPosition) * 1.5, -0.65, 0.65);
      const previousVelocity = this.commandVelocity;
      this.commandVelocity += clamp(wantedVelocity - previousVelocity, -0.6 * dt, 0.6 * dt);
      this.commandPosition += this.commandVelocity * dt;
      this.commandAcceleration = (this.commandVelocity - previousVelocity) / dt;
    }
    this.positionIntegral = clamp(this.positionIntegral + (this.target - this.x) * dt, -2, 2);
    const feedforward = this.targetAcceleration / 9.81;
    const desiredAngle = clamp(feedforward + 0.11 * (this.target - this.x) + 0.14 * (this.targetVelocity - this.v) + 0.008 * this.positionIntegral, -0.25, 0.25);
    const error = this.theta - desiredAngle;
    // Conditional integration prevents integral windup when the actuator saturates.
    const requested = this.gains.kp * error + this.gains.ki * this.angleIntegral + this.gains.kd * this.omega;
    if (this.controller && (Math.abs(requested) < 30 || Math.sign(error) !== Math.sign(requested))) {
      this.angleIntegral = clamp(this.angleIntegral + error * dt, -1, 1);
    }
    this.force = this.controller ? clamp(this.gains.kp * error + this.gains.ki * this.angleIntegral + this.gains.kd * this.omega, -30, 30) : 0;
    this.wind = this.disturbance * (0.65 * Math.sin(0.9 * this.t) + 0.25 * Math.sin(2.3 * this.t) + 0.10 * Math.sin(5.1 * this.t));
    const force = this.force + this.wind - 0.08 * this.v;
    // RK4 integration at a fixed 240 Hz; independent of rendering speed.
    const derivative = ([x, v, theta, omega]) => {
      const sin = Math.sin(theta), cos = Math.cos(theta);
      const a = (force + 0.22 * sin * (omega * omega - 9.81 * cos)) / (1 + 0.22 * sin * sin);
      return [v, a, omega, 9.81 * sin - a * cos - 0.025 * omega];
    };
    const y = [this.x, this.v, this.theta, this.omega];
    const add = (a, b, scale) => a.map((v, i) => v + b[i] * scale);
    const k1 = derivative(y);
    const k2 = derivative(add(y, k1, dt / 2));
    const k3 = derivative(add(y, k2, dt / 2));
    const k4 = derivative(add(y, k3, dt));
    [this.x, this.v, this.theta, this.omega] = y.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    this.peak = Math.max(this.peak, Math.abs(this.theta));
    if (Math.abs(this.theta) >= Math.PI / 2 || Math.abs(this.x) >= 4) this.fallen = true;
  }
}
