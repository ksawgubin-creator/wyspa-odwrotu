// Keyboard / mouse input with rebindable actions, latched key presses (so fixed-step logic never misses a tap),
// Shift tap (dodge) vs hold (sprint), pointer lock and accumulated mouse deltas.
const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], sneak: ['ControlLeft', 'KeyX'], interact: ['KeyE'],
  inventory: ['Tab', 'KeyI'], craft: ['KeyC'], build: ['KeyB'], rotate: ['KeyR'], map: ['KeyM'], pause: ['Escape'], debug: ['F3'],
  hotbar1: ['Digit1'], hotbar2: ['Digit2'], hotbar3: ['Digit3'], hotbar4: ['Digit4'], hotbar5: ['Digit5'],
  hotbar6: ['Digit6'], hotbar7: ['Digit7'], hotbar8: ['Digit8'], hotbar9: ['Digit9'],
};
export const ACTION_LABELS = {
  forward: 'Do przodu', back: 'Do tyłu', left: 'W lewo', right: 'W prawo', jump: 'Skok', sprint: 'Sprint / unik (Shift)', sneak: 'Skradanie', interact: 'Interakcja',
  inventory: 'Ekwipunek', craft: 'Crafting', build: 'Budowanie', rotate: 'Obróć element', map: 'Mapa', pause: 'Pauza', debug: 'Debug (F3)',
};
const TAP_TIME = 0.22;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    try { const saved = JSON.parse(localStorage.getItem('wo_bindings') || 'null'); if (saved) Object.assign(this.bindings, saved); } catch (e) { /* ignore */ }
    this.down = new Set();          // physical codes held
    this.latched = new Set();       // action names pressed since last consume
    this.buttons = [false, false, false];
    this.buttonLatch = [false, false, false];
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.locked = false;
    this.shiftDownAt = -1; this.shiftUsed = false;
    this.now = 0;
    this.enabled = true;            // false while a menu captures input
    this.rebinding = null;
    this.listeners = new Set();     // fn(action, type) for UI hooks
    this.actionByCode = new Map();
    this.rebuild();
    const on = (t, fn, o) => window.addEventListener(t, fn, o);
    on('keydown', (e) => this.onKey(e, true));
    on('keyup', (e) => this.onKey(e, false));
    on('mousedown', (e) => this.onMouse(e, true));
    on('mouseup', (e) => this.onMouse(e, false));
    on('mousemove', (e) => { if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } });
    on('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    on('contextmenu', (e) => e.preventDefault());
    on('blur', () => this.releaseAll());
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.canvas; if (!this.locked) this.releaseAll(); this.onLockChange?.(this.locked); });
  }
  rebuild() {
    this.actionByCode.clear();
    for (const [a, codes] of Object.entries(this.bindings)) for (const c of codes) { const arr = this.actionByCode.get(c) || []; arr.push(a); this.actionByCode.set(c, arr); }
  }
  setBinding(action, code) {
    // steal the key from other actions
    for (const [a, codes] of Object.entries(this.bindings)) this.bindings[a] = codes.filter((c) => c !== code);
    this.bindings[action] = [code, ...(this.bindings[action] || []).slice(0, 1)];
    this.rebuild();
    try { localStorage.setItem('wo_bindings', JSON.stringify(this.bindings)); } catch (e) { /* ignore */ }
  }
  resetBindings() { this.bindings = structuredClone(DEFAULT_BINDINGS); this.rebuild(); try { localStorage.removeItem('wo_bindings'); } catch (e) { /* ignore */ } }
  releaseAll() { this.down.clear(); this.buttons.fill(false); this.shiftDownAt = -1; }
  requestLock() { if (!this.locked) { try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } } }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  onKey(e, isDown) {
    if (this.rebinding) { if (isDown) { e.preventDefault(); const cb = this.rebinding; this.rebinding = null; cb(e.code); } return; }
    const acts = this.actionByCode.get(e.code);
    if (e.code === 'Tab' || e.code === 'F3' || e.code === 'Space' || (acts && this.enabled && e.code.startsWith('Arrow'))) e.preventDefault();
    if (isDown) {
      if (e.repeat) return;
      this.down.add(e.code);
      if (acts) for (const a of acts) { this.latched.add(a); this.listeners.forEach((f) => f(a, 'down')); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.shiftDownAt = this.now; }
    } else {
      this.down.delete(e.code);
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.shiftDownAt >= 0) {
        if (this.now - this.shiftDownAt < TAP_TIME) { this.latched.add('dodge'); this.listeners.forEach((f) => f('dodge', 'down')); }
        this.shiftDownAt = -1;
      }
      if (acts) for (const a of acts) this.listeners.forEach((f) => f(a, 'up'));
    }
  }
  onMouse(e, isDown) {
    if (!this.locked) return;
    this.buttons[e.button] = isDown;
    if (isDown) { this.buttonLatch[e.button] = true; this.listeners.forEach((f) => f(e.button === 0 ? 'attack' : e.button === 2 ? 'block' : 'mid', 'down')); }
    else this.listeners.forEach((f) => f(e.button === 0 ? 'attack' : e.button === 2 ? 'block' : 'mid', 'up'));
  }
  tick(dt) { this.now += dt; }

  isDown(action) {
    if (!this.enabled) return false;
    const codes = this.bindings[action];
    if (codes) for (const c of codes) if (this.down.has(c)) return true;
    return false;
  }
  sprintHeld() { return this.enabled && this.shiftDownAt >= 0 && this.now - this.shiftDownAt >= TAP_TIME; }
  // consume a latched press
  pressed(action) { const has = this.latched.has(action); if (has) this.latched.delete(action); return has && this.enabled; }
  peek(action) { return this.latched.has(action); }
  mousePressed(b) { const v = this.buttonLatch[b]; this.buttonLatch[b] = false; return v && this.enabled; }
  mouseDown(b) { return this.enabled && this.buttons[b]; }
  takeMouse() { const d = { x: this.mouseDX, y: this.mouseDY }; this.mouseDX = 0; this.mouseDY = 0; return d; }
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  clearLatches() { this.latched.clear(); this.buttonLatch.fill(false); }
  axis() {
    let x = 0, z = 0;
    if (this.isDown('right')) x += 1; if (this.isDown('left')) x -= 1;
    if (this.isDown('forward')) z += 1; if (this.isDown('back')) z -= 1;
    return { x, z };
  }
}
export const keyLabel = (code) => code.replace('Key', '').replace('Digit', '').replace('Arrow', '↑↓←→'.includes('') ? '' : '').replace('Space', 'Spacja').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift').replace('ControlLeft', 'Ctrl').replace('Escape', 'Esc');
