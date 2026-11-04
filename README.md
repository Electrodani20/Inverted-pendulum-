# Control Lab · Inverted Pendulum

A phone-controlled, nonlinear cart-and-pendulum simulation with PID balancing. The drawing follows a classic engineering schematic: gray cart, black mass, rod, angle, and force labels. Tilt your phone to choose where the cart moves; the controller maintains balance. Motion readings stay on the device.

## Use it on your phone

Open **https://electrodani20.github.io/Inverted-pendulum-/** directly in **Safari on iPhone** or **Chrome on Android**, once GitHub Pages is enabled as described below. Do not use GitHub's HTML viewer, a downloaded local file, or an in-app browser for motion access.

1. Tap **Enable phone tilt** and allow motion access if prompted.
2. Hold the phone comfortably with its screen facing up. The first valid reading becomes neutral.
3. Tilt left to move left, right to move right. Returning to neutral brings the target to center.
4. Use **Calibrate neutral** whenever you change your grip. Portrait/landscape changes recalibrate automatically.
5. Open **Settings** to change tilt sensitivity, reverse direction, add wind disturbance, tune PID gains, or disable the controller.

Steering changes a position target within ±1.6 m, with a dead zone and smoothing. A trajectory planner limits target speed to 0.65 m/s and acceleration to 0.6 m/s², allowing the pendulum to remain balanced during abrupt changes. Wind is an independent cart disturbance; tilt does not change wind strength. The controller can still fail at extreme wind or unsuitable gains.

**Touch control** works without sensors. Use the slider or desktop **← / →** keys to move the cart. **Watch demo** restores the automatic side-to-side motion. **↑ / ↓** change wind, **Space** pauses/resumes, and **R** resets. Shortcuts do not override editing inside form inputs. Reset preserves selected settings; restore PID defaults with the dedicated button.

If motion is denied, unavailable, or stops sending valid readings, the app gives a specific message and falls back to touch control. Leaving the page pauses physics and disconnects tilt; resume and re-enable motion when you return. Tilt must be enabled again after a reload. Settings are per session.

## Enable GitHub Pages once

The `gh-pages` branch contains the standalone site, including `index.html` and `.nojekyll`.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose **gh-pages** and **/(root)**, then **Save**.
4. Wait for GitHub to show a successful deployment and the HTTPS site URL.

GitHub handles HTTPS. The cloud development server is not a public phone URL. Publication and motion on real iOS/Android hardware must be verified on the phone; automated tests use synthetic orientation readings.

## Develop locally

Requires Node.js 20+. No package installation or build step is needed to start the development server.

```sh
npm start
```

Open `http://localhost:3000` on the development machine. `PORT` changes the port. A plain HTTP LAN address on your phone normally cannot use motion sensors; use an HTTPS deployment.

```sh
npm test
npm run build
```

The build creates the tracked portable **Inverted-Pendulum.html**, plus **dist/index.html**, **dist/inverted-pendulum.html**, and **dist/.nojekyll**. The dist directory is a ready-to-publish static site with no external dependencies or absolute asset paths. Rebuild after changing source, then include the updated portable HTML in the source commit and publish dist to the `gh-pages` branch.

For desktop/offline touch or demo mode, download the repository ZIP, extract it, and double-click **Inverted-Pendulum.html**. Phone tilt requires the HTTPS site; the local-file version explains this and provides touch control.

## Physical model

A point-mass pendulum with massless rigid rod and frictional cart. Gravity 9.81 m/s², cart mass 1 kg, bob mass 0.22 kg, rod length 1 m, actuator force limited to ±30 N. θ=0 is upright. Coupled nonlinear equations are integrated using RK4 at a fixed 240 Hz, independently of rendering. A position loop turns tracking error and target acceleration into desired lean. The angle PID uses anti-windup and measured angular-velocity damping. There is no hidden stabilization; turning PID off causes instability under disturbance.

Tests exercise sustained automatic tracking, manual steering with acceleration limits, wind recovery, orientation projection, sensitivity/inversion, stationary/reset behavior, open-loop instability, and actuator saturation. This is an educational model, not a hardware controller.
