// Survival stats: hunger, thirst, temperature, fear, health regeneration/damage, buffs and food effects. ALL numbers ROBOCZE.
import { ITEMS } from '../../data/items.js';
import { clamp, lerp, smoothstep } from '../engine/util.js';

export const BUFF_NAMES = { regen: 'Regeneracja', nightvision: 'Nocne widzenie', warm: 'Odporność na zimno', poison: 'Zatrucie', tea: 'Spokój' };

export class Survival {
  constructor(game) {
    this.game = game;
    this.buffs = {};            // id -> seconds left
    this.coldT = 0; this.msgT = 0;
    this.envTemp = 50; this.darkness = 0;
  }
  hasBuff(id) { return (this.buffs[id] || 0) > 0; }
  addBuff(id, dur) { this.buffs[id] = Math.max(this.buffs[id] || 0, dur); this.game.hud?.refreshBuffs?.(); }

  rates() {
    const p = this.game.player, sk = p.skills || {};
    const hungerMul = (1 - 0.08 * (sk.hungerRes || 0)) * this.game.diff.hunger;
    return { hunger: 0.045 * hungerMul, thirst: 0.06 * hungerMul };
  }

  // Environment warmth for the current position/time.
  targetTemp() {
    const g = this.game, p = g.player, atm = g.atmos;
    const day = atm.dayness, night = 1 - day;
    let t = 56 + day * 10 - night * 30;
    if (g.weather?.raining) t -= 14 * g.weather.intensity;
    if (g.weather?.storm) t -= 6;
    if (p.wading) t -= 12;
    // volcano heat
    const V = g.world.volcanoHeat?.(p.pos.x, p.pos.z) || 0; t += V * 40;
    // fire / torch warmth
    let fire = 0;
    for (const s of g.lights.sources) { if (!s.on || !s.warm) continue; const d = Math.hypot(s.x - p.pos.x, s.z - p.pos.z); if (d < s.warm) fire = Math.max(fire, 1 - d / s.warm); }
    t += fire * 34;
    if (p.heldId === 'torch') t += 4;
    t += p.armorWarm || 0;
    if (this.hasBuff('warm')) t += 26;
    return { t: clamp(t, 0, 100), fire };
  }

  update(dt) {
    const g = this.game, p = g.player, st = p.stats;
    if (p.dead) return;
    const r = this.rates();
    const sprint = p.sprinting ? 1.5 : 1;
    st.hunger = clamp(st.hunger - r.hunger * dt * sprint, 0, 100);
    st.thirst = clamp(st.thirst - r.thirst * dt * sprint * (this.hasBuff('poison') ? 1.8 : 1), 0, 100);
    // temperature drifts toward the environment
    const { t, fire } = this.targetTemp();
    this.envTemp = t;
    st.temp += (t - st.temp) * (1 - Math.exp(-dt / 14));
    // fear
    const light = g.lights.scareAt(p.pos.x, p.pos.z);
    const night = 1 - g.atmos.dayness;
    let fearD = 0;
    const inDark = night > 0.4 && light < 0.08 && !this.hasBuff('nightvision');
    this.darkness = inDark ? night : 0;
    if (inDark) fearD += 2.4 * night;
    if (light > 0.1) fearD -= 5 * light;
    if (fire > 0.05) fearD -= 6 * fire;
    if (g.atmos.dayness > 0.7) fearD -= 2.2;
    let threat = 0;
    if (g.entities) g.entities.near(p.pos.x, p.pos.z, 24, (e) => { if (!e.dead && e.def.brain !== 'prey' && (e.mode === 'chase' || e.mode === 'circle' || e.mode === 'stalk' || e.mode === 'windup')) threat += (24 - e.playerDist) / 24; });
    fearD += Math.min(5, threat * 2.6);
    if (this.hasBuff('tea')) fearD -= 4;
    st.fear = clamp(st.fear + fearD * dt, 0, 100);
    // health
    let hp = 0;
    if (st.hunger <= 0) hp -= 0.7;
    if (st.thirst <= 0) hp -= 1.0;
    if (st.temp < 22) hp -= 0.03 * (22 - st.temp);           // freezing
    if (st.temp > 88) hp -= 0.05 * (st.temp - 88);            // overheating
    if (this.hasBuff('poison')) hp -= 0.9;
    if (this.hasBuff('regen')) hp += 1.6;
    if (hp >= 0 && st.hunger > 45 && st.thirst > 45 && st.temp > 30 && !p.stun && st.health < st.maxHealth) hp += 0.35 + 0.15 * (p.skills?.vitality || 0) * 0.5;
    if (hp !== 0) st.health = clamp(st.health + hp * dt, 0, st.maxHealth);
    if (hp < 0 && st.health <= 0 && !p.dead) p.die({ dir: p.yaw + Math.PI, cause: st.hunger <= 0 ? 'głód' : st.thirst <= 0 ? 'pragnienie' : st.temp < 22 ? 'wychłodzenie' : 'osłabienie' });
    // messages
    this.msgT -= dt;
    if (this.msgT <= 0) {
      if (st.hunger < 15) { g.notify('Jesteś bardzo głodny.', 'warn'); this.msgT = 40; }
      else if (st.thirst < 15) { g.notify('Umierasz z pragnienia.', 'warn'); this.msgT = 40; }
      else if (st.temp < 24) { g.notify('Trzęsiesz się z zimna. Rozpal ognisko.', 'warn'); this.msgT = 45; }
      else if (st.fear > 80) { g.notify('Ciemność szepcze… Zapal światło!', 'warn'); this.msgT = 40; }
    }
    // buffs tick
    for (const id of Object.keys(this.buffs)) { this.buffs[id] -= dt; if (this.buffs[id] <= 0) { delete this.buffs[id]; g.hud?.refreshBuffs?.(); if (id === 'poison') g.notify('Zatrucie ustąpiło.'); } }
  }

  // Consume an item's food effects. Returns true if consumed.
  consume(id) {
    const d = ITEMS[id]; if (!d || !d.food) return false;
    const g = this.game, st = g.player.stats, f = d.food;
    if (f.hunger) st.hunger = clamp(st.hunger + f.hunger, 0, 100);
    if (f.thirst) st.thirst = clamp(st.thirst + f.thirst, 0, 100);
    if (f.health) st.health = clamp(st.health + f.health, 0, st.maxHealth);
    if (f.fear) st.fear = clamp(st.fear + f.fear, 0, 100);
    if (f.temp) st.temp = clamp(st.temp + f.temp, 0, 100);
    if (f.buff) { this.addBuff(f.buff.id, f.buff.dur); if (f.buff.id === 'regen') g.notify('Czujesz, jak rany się zasklepiają.'); }
    if (f.fear < 0) this.addBuff('tea', 25);
    if (f.poison && Math.random() < f.poison) { this.addBuff('poison', 35); g.notify('Zatrułeś się surowym mięsem!', 'warn'); }
    if (f.returns) g.giveItem(f.returns, 1);
    g.audio?.play(f.thirst > 0 && !f.hunger ? 'drink' : 'eat');
    return true;
  }
  drinkWater(fresh) {
    const g = this.game, st = g.player.stats;
    if (fresh) { st.thirst = clamp(st.thirst + 30, 0, 100); g.notify('Woda jest chłodna i słodka.'); }
    else { st.thirst = clamp(st.thirst - 8, 0, 100); this.addBuff('poison', 18); g.notify('Woda morska! Odwadnia i mdli.', 'warn'); }
    g.audio?.play('drink');
  }
  serialize() { return { buffs: { ...this.buffs } }; }
  restore(d) { if (d) this.buffs = { ...d.buffs }; }
}
