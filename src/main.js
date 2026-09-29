import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;
const fill = document.getElementById('loading-fill'), text = document.getElementById('loading-text');

(async function boot() {
  try {
    const q = game.params;
    const seed = Number(q.get('seed')) || 20240607;
    await game.createWorld(seed, (f, t) => { fill.style.width = `${f * 100}%`; text.textContent = t; });
    game.mode = 'menu';
    game.menus.showMain();
    document.getElementById('loading').classList.add('hide');
    // developer/test hooks (used by automated screenshots)
    window.__ready = true;
    // deterministic stepping for automated testing (pauses the realtime loop)
    window.__advance = (sec, cb) => {
      game.manual = true;
      const n = Math.max(1, Math.round(sec * 60));
      for (let i = 0; i < n; i++) {
        game.step(1 / 60); game.time += 1 / 60;
        if (game.mode !== 'menu') { game.cameraRig.update(1 / 60, game.player, 1); game.player.updateVisual(1 / 60, 1); game.updateAfterVisual?.(1 / 60); game.fx.update(1 / 60); }
        if (cb) cb(i);
      }
      if (game.mode !== 'menu') game.terrain.update(game.player.pos.x, game.player.pos.z, Infinity);
      game.renderFrame(1 / 60);
    };
    // logic-only stepping (no rendering): fast simulation for behaviour tests
    window.__sim = (sec) => { game.manual = true; const n = Math.max(1, Math.round(sec * 60)); for (let i = 0; i < n; i++) { game.step(1 / 60); game.time += 1 / 60; } };
    window.__hold = (code, down) => { if (down) game.input.down.add(code); else game.input.down.delete(code); };
    window.__press = (code) => { game.input.onKey({ code, repeat: false, preventDefault() {} }, true); game.input.onKey({ code, repeat: false, preventDefault() {} }, false); };
    window.__click = (b = 0) => { game.input.locked = true; game.input.buttons[b] = true; game.input.buttonLatch[b] = true; };
    window.__release = (b = 0) => { game.input.buttons[b] = false; };
    window.__look = (yaw, pitch) => { game.cameraRig.yaw = yaw; if (pitch !== undefined) game.cameraRig.pitch = pitch; };
    if (q.has('autostart')) await game.startGame({ fresh: true });
    requestAnimationFrame(function loop(t) { requestAnimationFrame(loop); game.frame(t); });
  } catch (e) { console.error(e); text.textContent = 'Błąd: ' + e.message; }
})();
