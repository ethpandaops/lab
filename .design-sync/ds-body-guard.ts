// Some lab modules probe CSS variables at import time by appending a temporary
// element to document.body (getDataVizColors → resolveCssColorToHex). When the
// bundle is evaluated in a minimal document that has no <body> yet (e.g. a
// headless smoke check that injects scripts into <head>), that probe throws and
// aborts the whole bundle before window.<global> is assigned. Ensuring a body
// exists before any component module evaluates keeps the bundle robust in those
// contexts; in a normal page the body already exists and this is a no-op.
if (typeof document !== 'undefined' && document.body == null && document.documentElement) {
  document.documentElement.appendChild(document.createElement('body'));
}
