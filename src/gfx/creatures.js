// Public API for the procedural creatures. See creatures/kit.js for axis conventions (creatures face +Z, +X is their left).
// createCreature(kind, {seed, scale}) -> { root, animate(dt, s), setFlash, setGlow, setOpacity, dispose, info }.
// Notes: info.headPos is a getter returning a (shared, reused) THREE.Vector3 in root-local space. Extra optional state fields on `s`:
//  s.height (bat only: metres above ground, lets a dead bat fall that far before crumpling). Crab: scuttle direction = sign of the root's
//  motion along its local X (default +X). Each creature owns its materials (dispose() frees them); geometry is cached per (kind, seed%4).
import { Wolf } from './creatures/wolf.js';
import { Boar } from './creatures/boar.js';
import { Goat } from './creatures/goat.js';
import { Rabbit } from './creatures/rabbit.js';
import { Crab } from './creatures/crab.js';
import { Bat } from './creatures/bat.js';
import { Shadow } from './creatures/shadow.js';
import { Panther } from './creatures/panther.js';

export const CREATURE_KINDS = ['rabbit', 'boar', 'goat', 'crab', 'wolf', 'panther', 'shadow', 'bat'];
export const CREATURE_INFO = {
  rabbit: { radius: 0.25, height: 0.4, length: 0.5 },
  boar: { radius: 0.55, height: 0.9, length: 1.3 },
  goat: { radius: 0.45, height: 0.9, length: 1.1 },
  crab: { radius: 0.3, height: 0.25, length: 0.5 },
  wolf: { radius: 0.4, height: 0.85, length: 1.4 },
  panther: { radius: 0.45, height: 0.8, length: 1.6 },
  shadow: { radius: 0.35, height: 2.1, length: 0.6 },
  bat: { radius: 0.3, height: 0.3, length: 0.5 },
};
const BUILDERS = { wolf: (o) => new Wolf(o), panther: (o) => new Panther(o), boar: (o) => new Boar(o), goat: (o) => new Goat(o), rabbit: (o) => new Rabbit(o), crab: (o) => new Crab(o), bat: (o) => new Bat(o), shadow: (o) => new Shadow(o) };
export function createCreature(kind, opts = {}) {
  const b = BUILDERS[kind];
  if (!b) throw new Error('unknown creature kind ' + kind);
  return b(opts);
}
