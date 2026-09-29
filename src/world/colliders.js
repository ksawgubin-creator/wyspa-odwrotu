// Pure 2D collision world: circles and oriented boxes stored in a uniform spatial grid.
// Used by the player, animals, enemies, building placement and the camera arm.
const CELL = 8;
const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;

export class Colliders {
  constructor() {
    this.cells = new Map();
    this.all = new Set();
    this.nextId = 1;
  }
  // circle: {x,z,r}; box: {x,z,hw,hd,rot}. Optional: top (height above ground base y), base (y of the base), tag, ref, solid.
  add(c) {
    c.id = this.nextId++;
    c.solid = c.solid !== false;
    if (c.hw !== undefined) {
      c.type = 'box';
      const ext = Math.hypot(c.hw, c.hd);
      c.bound = ext;
    } else { c.type = 'circle'; c.bound = c.r; }
    c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0);
    c._cells = [];
    const x0 = Math.floor((c.x - c.bound) / CELL), x1 = Math.floor((c.x + c.bound) / CELL);
    const z0 = Math.floor((c.z - c.bound) / CELL), z1 = Math.floor((c.z + c.bound) / CELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const k = key(cx, cz);
      let arr = this.cells.get(k);
      if (!arr) { arr = []; this.cells.set(k, arr); }
      arr.push(c); c._cells.push(arr);
    }
    this.all.add(c);
    return c;
  }
  remove(c) {
    if (!c || !this.all.has(c)) return;
    for (const arr of c._cells) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); }
    c._cells.length = 0;
    this.all.delete(c);
  }
  // iterate unique colliders near a point
  forEachNear(x, z, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    const stamp = (this._stamp = (this._stamp || 0) + 1);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.cells.get(key(cx, cz));
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (c._stamp === stamp) continue;
        c._stamp = stamp;
        fn(c);
      }
    }
  }
  // Signed penetration of a circle (x,z,r) into collider c. Returns null or {nx,nz,depth}.
  static penetration(c, x, z, r) {
    if (c.type === 'circle') {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), rr = r + c.r;
      if (d >= rr) return null;
      if (d < 1e-6) return { nx: 1, nz: 0, depth: rr };
      return { nx: dx / d, nz: dz / d, depth: rr - d };
    }
    // oriented box: work in local space
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos;
    const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
    let ox = lx - qx, oz = lz - qz;
    const d = Math.hypot(ox, oz);
    let nlx, nlz, depth;
    if (d > 1e-6) {
      if (d >= r) return null;
      nlx = ox / d; nlz = oz / d; depth = r - d;
    } else {                                    // centre inside the box: push out through the nearest face
      const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
      if (px < pz) { nlx = Math.sign(lx) || 1; nlz = 0; depth = px + r; } else { nlx = 0; nlz = Math.sign(lz) || 1; depth = pz + r; }
    }
    return { nx: nlx * c.cos - nlz * c.sin, nz: nlx * c.sin + nlz * c.cos, depth };
  }
  // Push a circle out of every solid collider. y/h optional vertical filter: colliders whose top is below y are ignored (stepping over).
  resolveCircle(pos, r, y = -1e9, mask = null) {
    let hit = false;
    for (let it = 0; it < 3; it++) {
      let moved = false;
      this.forEachNear(pos.x, pos.z, r + 3, (c) => {
        if (!c.solid || (mask && mask(c) === false)) return;
        if (c.top !== undefined && c.base !== undefined && c.base + c.top < y) return;
        const p = Colliders.penetration(c, pos.x, pos.z, r);
        if (p) { pos.x += p.nx * p.depth; pos.z += p.nz * p.depth; moved = true; hit = true; }
      });
      if (!moved) break;
    }
    return hit;
  }
  // Does a point (radius r) overlap anything solid? Optionally returns the first collider.
  overlaps(x, z, r, mask = null) {
    let found = null;
    this.forEachNear(x, z, r + 3, (c) => {
      if (found || !c.solid || (mask && mask(c) === false)) return;
      if (Colliders.penetration(c, x, z, r)) found = c;
    });
    return found;
  }
  // First blocking point along a 3D segment (used by the camera arm). Returns t in [0,1] or 1 when free.
  segmentT(ax, ay, az, bx, by, bz, radius, groundFn) {
    const steps = 24;
    let last = 0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
      let blocked = groundFn && y < groundFn(x, z) + radius * 0.8;
      if (!blocked) {
        this.forEachNear(x, z, radius + 2, (c) => {
          if (blocked || !c.solid || c.noCamera) return;
          if (c.top !== undefined && c.base !== undefined && y > c.base + c.top + radius) return;
          if (Colliders.penetration(c, x, z, radius)) blocked = true;
        });
      }
      if (blocked) return last;
      last = t;
    }
    return 1;
  }
}
