// Melee & tool combat stats keyed by item id (falls back to `fists`). Times in seconds. ALL numbers are ROBOCZE.
// combo stage: {clip, windup, active, recover, dmg (multiplier of base), knock (m/s impulse), stamina, lunge (m/s during windup+active), chain (fraction of recover after which the next stage may start)}
const stage = (clip, windup, active, recover, dmg, knock, stamina, lunge, chain = 0.45) => ({ clip, windup, active, recover, dmg, knock, stamina, lunge, chain });

export const WEAPONS = {
  fists: { name: 'Pięści', cls: 'fist', base: 6, reach: 1.5, arc: 100, tier: 0,
    combo: [stage('punch', 0.09, 0.08, 0.2, 1.0, 3, 5, 1.2), stage('punch', 0.09, 0.08, 0.22, 1.0, 3, 5, 1.2), stage('punch', 0.14, 0.09, 0.3, 1.6, 6, 8, 2.0)] },
  rusty_axe: { name: 'Zardzewiała siekiera', cls: 'axe', base: 11, reach: 1.9, arc: 110, tier: 1,
    combo: [stage('slashR', 0.16, 0.11, 0.26, 1.0, 4, 8, 1.6), stage('slashL', 0.15, 0.11, 0.27, 1.0, 4, 8, 1.6), stage('overhead', 0.24, 0.13, 0.4, 1.7, 8, 14, 2.4)] },
  stone_axe: { name: 'Kamienna siekiera', cls: 'axe', base: 14, reach: 1.9, arc: 110, tier: 1,
    combo: [stage('slashR', 0.16, 0.11, 0.26, 1.0, 4, 8, 1.6), stage('slashL', 0.15, 0.11, 0.27, 1.0, 4, 8, 1.6), stage('overhead', 0.24, 0.13, 0.4, 1.7, 8, 14, 2.4)] },
  stone_pickaxe: { name: 'Kamienny kilof', cls: 'pickaxe', base: 10, reach: 1.9, arc: 90, tier: 1,
    combo: [stage('overhead', 0.22, 0.12, 0.36, 1.0, 4, 10, 1.2, 0.5), stage('overhead', 0.22, 0.12, 0.38, 1.0, 4, 10, 1.2, 0.5)] },
  torch: { name: 'Pochodnia', cls: 'torch', base: 4, reach: 1.6, arc: 100, tier: 0,
    combo: [stage('slashR', 0.14, 0.1, 0.24, 1.0, 3, 6, 1.4), stage('slashL', 0.14, 0.1, 0.26, 1.0, 3, 6, 1.4)] },
  stone_spear: { name: 'Kamienna dzida', cls: 'spear', base: 15, reach: 2.7, arc: 55, tier: 1,
    combo: [stage('thrust', 0.2, 0.1, 0.3, 1.0, 5, 9, 2.6), stage('thrust', 0.2, 0.1, 0.3, 1.0, 5, 9, 2.6), stage('thrust', 0.3, 0.12, 0.42, 1.8, 9, 15, 3.4)] },
};
export const weaponFor = (id) => WEAPONS[id] || WEAPONS.fists;
