// Shared internal module registry for VELOCITY's modular browser & Node runtime.
// Loaded first so audio, procedural models, weapons, and combat subsystems can
// share helpers cleanly without polluting window globals.
(function (root) {
  'use strict';
  root.VelocityInternal = root.VelocityInternal || {};
  root.VelocityModels = root.VelocityModels || {};
  root.VelocityAudio = root.VelocityAudio || {};
})(typeof self !== 'undefined' ? self : globalThis);
