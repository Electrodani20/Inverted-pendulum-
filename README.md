# Control Lab · Inverted Pendulum

An interactive nonlinear cart-and-pendulum simulation, controlled by a cascaded position loop and angle PID. No build step or runtime dependencies. Requires Node.js 20 or newer.

```sh
npm start
```

Open `http://localhost:3000` in your browser. Set `PORT` to use a different port.

For a standalone app you can download and open directly without a server, run `npm run build` and open `dist/inverted-pendulum.html`. This version works offline.

- **↑ / ↓:** increase / decrease wind disturbance amplitude (0–30 N). Hold to repeat.
- **Space:** pause or resume. **R:** reset the experiment.
- Tune P, I, and D in real time; toggle the controller or side-to-side target motion.
- Reset preserves your selected gains, disturbance, motion setting, and controller state. Restore default gains with the dedicated button.
- Keyboard shortcuts do not override form controls while editing them.

The cart starts upright and follows a smooth sinusoidal target. Wind is a deterministic combination of varying gusts applied to the cart. High disturbance or unsuitable gains can cause the pendulum to fall or the cart to leave its ±4 m track. A failure overlay lets you reset. No hidden automatic stabilization is applied.

## Download from GitHub — no installation needed

1. On the repository page, select **Code → Download ZIP**.
2. Extract the ZIP on your computer.
3. Double-click **Inverted-Pendulum.html** in the extracted folder and open it with Chrome, Edge, Firefox, or Safari.

The standalone HTML is included in the repository, so you do not need Node.js, a terminal, or a web server to try it. GitHub displays HTML as source code; download and open the file on your computer instead of trying to run it in GitHub's file viewer. The **Up/Down** arrows change disturbance, **Space** pauses, and **R** resets. Click a blank part of the app before using shortcuts.

After changing the source files, run `npm run build` to refresh the included standalone HTML before committing it.

## Physical model

Point-mass pendulum, massless rigid rod, frictional cart, gravity 9.81 m/s². Cart mass 1 kg, bob mass 0.22 kg, rod length 1 m, actuator limited to ±30 N. θ=0 is upright. Full nonlinear coupled equations are integrated using RK4 at a fixed 240 Hz; rendering is independent. The outer loop converts position/velocity error and target acceleration into a desired lean. The inner angle PID uses anti-windup and angular-velocity damping. The angle derivative term acts on the measured angle to avoid derivative kick.

```sh
npm test
```

Tests exercise sustained tracking, disturbance recovery, open-loop instability, stationary/reset behavior, and actuator saturation. This is an educational model, not a hardware controller. External fonts are optional; system fallbacks work offline.
