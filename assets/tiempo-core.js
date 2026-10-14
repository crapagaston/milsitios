/* Pure rules shared by the UI and deterministic checks. */
(() => {
  'use strict';
  const names = ['Clásico', 'A ciegas', 'Cuenta regresiva', 'Destellos', 'Objetivo cambiante', 'Sin ayuda'];
  function challenge(config, level, attempt) {
    const variant = config.mode === 'practice' ? config.variant : (level - 1) % 6;
    const target = config.target * (variant === 4 ? [0.7, 1.2, 0.9, 1.4][attempt % 4] : 1);
    const tolerance = Math.max(0.07, ({easy:0.9, normal:0.55, hard:0.3}[config.difficulty]) * Math.pow(0.91, level - 1));
    const visible = variant === 1 ? 0 : variant === 5 ? Math.max(0.2, 0.8 - level * 0.025) : Math.max(0.3, 2 - (level - 1) * 0.1);
    return { variant, name:names[variant], target, tolerance, visible };
  }
  function score(elapsed, c) {
    const error = elapsed - c.target, success = Math.abs(error) <= c.tolerance + 1e-9;
    return { error, success, points:success ? Math.max(100, Math.round(1000 * (1 - Math.abs(error) / c.tolerance))) : 0 };
  }
  const api = {challenge, score};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.TimeRules = api;
})();
