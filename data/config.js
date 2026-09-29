// Global tunables. Every invented gameplay number is marked ROBOCZE (working value, to be tuned after playtests).
export const CONFIG = {
  seed: 20240607,                 // default world seed
  fixedDt: 1 / 60,                // logic step
  // --- time of day (seconds, real time) ---
  dayLength: 300,                 // ROBOCZE  5 min of daylight
  nightLength: 180,               // ROBOCZE  3 min of night
  startTimeOfDay: 0.30,           // fraction of the whole cycle (0 = dawn)
  // --- player ---
  player: {
    height: 1.8,
    radius: 0.42,
    walkSpeed: 4.2,               // ROBOCZE
    sprintSpeed: 7.0,             // ROBOCZE
    sneakSpeed: 2.1,              // ROBOCZE
    jumpSpeed: 6.4,               // ROBOCZE
    gravity: 20,                  // ROBOCZE
    maxHealth: 100,               // ROBOCZE
    maxStamina: 100,              // ROBOCZE
    staminaRegen: 22,             // ROBOCZE per second
    sprintCost: 14,               // ROBOCZE per second
    jumpCost: 8,                  // ROBOCZE
    dodgeCost: 20,                // ROBOCZE
    dodgeTime: 0.52,              // ROBOCZE
    dodgeInvuln: 0.30,            // ROBOCZE  i-frames from dodge start
    dodgeSpeed: 9.5,              // ROBOCZE
    parryWindow: 0.20,            // ROBOCZE
    blockStaminaPerDamage: 0.6,   // ROBOCZE
    maxSlope: 1.0,                // max walkable gradient (dh/ds)
    maxWadeDepth: 1.25,           // water deeper than this blocks the player
    wadeSlow: 0.55,               // speed factor while wading
    reach: 2.3,                   // interaction distance
  },
  camera: {
    distance: 4.6,
    shoulder: 0.55,
    height: 1.55,
    minPitch: -0.55,
    maxPitch: 1.15,
    fov: 62,
    sensitivity: 0.0022,
  },
  world: {
    viewDistance: 300,
    grassRadius: 44,
  },
};
