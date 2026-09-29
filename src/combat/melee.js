// Pure melee geometry helpers (frame-rate independent, unit-testable).
import { angleDiff } from '../engine/util.js';

// Does a swing from (ax,az) facing `facing` (radians, forward = (sin,cos)) reach a circular target?
export function inMeleeArc(ax, az, facing, tx, tz, tr, reach, arcDeg) {
  const dx = tx - ax, dz = tz - az;
  const dist = Math.hypot(dx, dz);
  if (dist - tr > reach) return false;
  if (dist < 1e-4) return true;
  const ang = Math.abs(angleDiff(facing, Math.atan2(dx, dz)));
  const allowed = (arcDeg * Math.PI) / 360 + Math.atan2(tr, Math.max(dist, 0.05));
  return ang <= allowed;
}

// Tracks which targets a single swing already hit ("each swing hits a target at most once").
export class SwingTracker {
  constructor() { this.hit = new Set(); }
  reset() { this.hit.clear(); }
  first(target) { if (this.hit.has(target)) return false; this.hit.add(target); return true; }
}

// Attack phase from elapsed time inside a stage.
export function stagePhase(stage, t) {
  if (t < stage.windup) return 'windup';
  if (t < stage.windup + stage.active) return 'active';
  if (t < stage.windup + stage.active + stage.recover) return 'recover';
  return 'done';
}
export const stageDuration = (st) => st.windup + st.active + st.recover;
// animation anchor fractions for the clip baker
export function stageTiming(st) {
  const T = stageDuration(st);
  return { wind: st.windup / T, hit: (st.windup + st.active * 0.5) / T, follow: (st.windup + st.active) / T };
}
