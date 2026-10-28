/* uikit.js – grafika (herby, koszulki, wykresy, boisko, efekty) dla widoków gry.
   Klasyczny skrypt bez zależności. Funkcje publiczne są globalne, pomocnicze mają prefiks uk_.
   Wszystkie funkcje *SVG zwracają łańcuch HTML/SVG i nigdy nie rzucają wyjątków. */

var uk__n = 0;
function uk_uid(p) { uk__n++; return (p || 'uk') + uk__n.toString(36) + Math.random().toString(36).slice(2, 6); }
function uk_esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function uk_clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function uk_numOk(v) { return typeof v === 'number' && isFinite(v); }
function uk_hash(s) { s = String(s == null ? '' : s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function uk_r(v) { return Math.round(v * 100) / 100; }

/* Liczby po polsku: przecinek dziesiętny, spacja (nbsp) jako separator tysięcy od 10 000. */
function uk_fmt(v, dec) {
  if (!uk_numOk(v)) return '–';
  dec = dec == null ? 1 : dec;
  var neg = v < 0, s = Math.abs(v).toFixed(dec);
  if (dec > 0) s = s.replace(/\.?0+$/, '');
  var parts = s.split('.'), int = parts[0];
  if (int.length > 4) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg && +s !== 0 ? '−' : '') + int + (parts[1] ? ',' + parts[1] : '');
}
function uk_short(v) {
  if (!uk_numOk(v)) return '–';
  var a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e9) return s + uk_fmt(a / 1e9, a >= 1e10 ? 0 : 1) + ' mld';
  if (a >= 1e6) return s + uk_fmt(a / 1e6, a >= 1e8 ? 0 : 1) + ' mln';
  if (a >= 1e3) return s + uk_fmt(a / 1e3, a >= 1e4 ? 0 : 1) + ' tys.';
  return s + uk_fmt(a, a < 10 && a % 1 ? 1 : 0);
}

/* Kolory */
function uk_col(c, fb) {
  if (typeof c !== 'string') return fb;
  c = c.trim();
  return c && /^[#\w\s(),.%-]+$/.test(c) && c.length < 60 ? c : fb;
}
function uk_rgb(c) {
  if (typeof c !== 'string') return null;
  c = c.trim().toLowerCase();
  var m = /^#([0-9a-f]{3,8})$/.exec(c);
  if (m) {
    var h = m[1];
    if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(c);
  if (m) return [+m[1], +m[2], +m[3]];
  var named = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0], yellow: [255, 255, 0], navy: [0, 0, 128], gold: [255, 215, 0], orange: [255, 165, 0], purple: [128, 0, 128], maroon: [128, 0, 0], gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192], sky: [135, 206, 235] };
  return named[c] || null;
}
function uk_lum(c) {
  var r = uk_rgb(c); if (!r) return 0.5;
  var f = function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r[0]) + 0.7152 * f(r[1]) + 0.0722 * f(r[2]);
}
function uk_hex(r) { return '#' + r.map(function (x) { return ('0' + Math.round(uk_clamp(x, 0, 255)).toString(16)).slice(-2); }).join(''); }
function uk_mix(c, c2, t) { var a = uk_rgb(c), b = uk_rgb(c2); if (!a || !b) return c; return uk_hex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
function uk_dist(c1, c2) { var a = uk_rgb(c1), b = uk_rgb(c2); if (!a || !b) return 999; return Math.sqrt(Math.pow(a[0] - b[0], 2) * 0.3 + Math.pow(a[1] - b[1], 2) * 0.59 + Math.pow(a[2] - b[2], 2) * 0.11); }
/* kolor tekstu czytelny na tle bg */
function uk_textOn(bg) { var L = uk_lum(bg), cw = 1.05 / (L + 0.05), cd = (L + 0.05) / 0.056; return cw * 1.25 >= cd ? '#ffffff' : '#0b1220'; }
/* rozjaśnij kolor zbyt ciemny dla ciemnego motywu */
function uk_vis(c, fb) {
  c = uk_col(c, fb);
  if (!uk_rgb(c)) return c;
  var L = uk_lum(c);
  return L < 0.045 ? uk_mix(c, '#ffffff', 0.55) : L < 0.09 ? uk_mix(c, '#ffffff', 0.35) : c;
}
function uk_cols(col) {
  col = Array.isArray(col) ? col : [];
  var a = uk_col(col[0], '#3a4a6b'), b = uk_col(col[1], null);
  if (!b) b = uk_lum(a) > 0.4 ? '#1b2540' : '#ffffff';
  return [a, b];
}
function uk_svgOpen(w, h, cls, extra) {
  return '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"' + (extra || '') + '>';
}

/* ---------------------------------------------------------------- 1. Herb */
var UK_CREST_PAT = ['border', 'vstripes', 'band', 'sash', 'quarter', 'chevron'];
function crestSVG(t, size) {
  try {
    t = t || {};
    size = uk_numOk(+size) && +size > 0 ? +size : 36;
    var c = uk_cols(t.col), c0 = c[0], c1 = c[1];
    var code = String(t.short || t.name || '?').trim().toUpperCase().slice(0, 4) || '?';
    var pat = UK_CREST_PAT[uk_hash(code) % UK_CREST_PAT.length];
    if (uk_dist(c0, c1) < 30) c1 = uk_lum(c0) > 0.4 ? uk_mix(c0, '#000000', 0.45) : uk_mix(c0, '#ffffff', 0.55);
    var id = uk_uid('ukc'), S = 'M24 2.5 L41.5 7.5 V22 C41.5 33.5 34 41.5 24 45.5 C14 41.5 6.5 33.5 6.5 22 V7.5 Z';
    var p = '', behind = c0;
    switch (pat) {
      case 'vstripes': p = '<path d="M11.5 0h5v48h-5zM21.5 0h5v48h-5zM31.5 0h5v48h-5z" fill="' + c1 + '"/>'; behind = 'mixed'; break;
      case 'band': p = '<rect x="0" y="17" width="48" height="14" fill="' + c1 + '"/>'; behind = c1; break;
      case 'sash': p = '<path d="M0 6 L10 0 L48 38 L48 52 Z" fill="' + c1 + '"/>'; behind = 'mixed'; break;
      case 'quarter': p = '<path d="M24 0H48V24H24zM0 24H24V48H0z" fill="' + c1 + '"/>'; behind = 'mixed'; break;
      case 'chevron': p = '<path d="M4 30 L24 40 L44 30 V37 L24 47 L4 37 Z" fill="' + c1 + '"/>'; break;
      default: p = '<path d="M24 7 L37.5 10.8 V22 C37.5 31.2 31.6 37.6 24 40.8 C16.4 37.6 10.5 31.2 10.5 22 V10.8 Z" fill="none" stroke="' + c1 + '" stroke-width="2.2"/>';
    }
    /* kolor tekstu: kontrast do pola za napisem; przy polu mieszanym – do jaśniejszego/średniego */
    var tc, sc;
    if (behind === 'mixed') {
      var L = (uk_lum(c0) + uk_lum(c1)) / 2;
      tc = L > 0.35 ? '#0b1220' : '#ffffff';
    } else tc = uk_textOn(behind);
    sc = tc === '#ffffff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.6)';
    var tiny = size < 22, txt = tiny ? code[0] : code, n = txt.length;
    var fs = tiny ? 21 : n >= 4 ? 10.5 : n === 3 ? (size <= 26 ? 14 : 13) : n === 2 ? 16 : 19;
    var sw = (behind === 'mixed' ? 2.2 : 1.2) * (size <= 26 ? 0.8 : 1);
    var tl = n >= 3 && !tiny ? ' textLength="' + (n >= 4 ? 30 : size <= 26 ? 30 : 27) + '" lengthAdjust="spacingAndGlyphs"' : '';
    var rim = uk_lum(c0) < 0.06 && uk_lum(c1) < 0.06 ? 'rgba(255,255,255,.45)' : c1;
    return '<svg class="crest" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="' + size + '" height="' + size + '" role="img" aria-label="' + uk_esc(t.name || code) + '">' +
      '<defs><clipPath id="' + id + 'c"><path d="' + S + '"/></clipPath>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>' +
      '<path d="' + S + '" fill="' + c0 + '"/>' +
      '<g clip-path="url(#' + id + 'c)">' + p + '<path d="' + S + '" fill="url(#' + id + 'g)"/></g>' +
      '<path d="' + S + '" fill="none" stroke="' + rim + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="' + S + '" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8" stroke-linejoin="round" transform="translate(24 24) scale(1.06) translate(-24 -24)"/>' +
      '<text x="24" y="' + (tiny ? 25 : 24.3) + '" text-anchor="middle" dominant-baseline="central" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-weight="800" font-size="' + fs + '"' + tl +
      ' fill="' + tc + '" stroke="' + sc + '" stroke-width="' + sw + '" paint-order="stroke" stroke-linejoin="round">' + uk_esc(txt) + '</text></svg>';
  } catch (e) { return '<svg class="crest" viewBox="0 0 48 48" width="36" height="36"></svg>'; }
}

/* ---------------------------------------------------------------- 2. Koszulka */
function kitSVG(col, size, pattern) {
  try {
    size = uk_numOk(+size) && +size > 0 ? +size : 28;
    var c = uk_cols(col), c0 = c[0], c1 = c[1];
    var pats = ['plain', 'stripes', 'hoops', 'sash'];
    if (pats.indexOf(pattern) < 0) pattern = pats[uk_hash(c0 + '|' + c1) % 4];
    var id = uk_uid('ukk');
    var body = 'M14.5 4 Q20 8.6 25.5 4 L32.8 6.4 Q35.5 7.4 37 9.6 L39.4 13.6 L33.6 18.4 L30.6 15.4 V35.4 Q30.6 36.6 29.4 36.6 H10.6 Q9.4 36.6 9.4 35.4 V15.4 L6.4 18.4 L0.6 13.6 L3 9.6 Q4.5 7.4 7.2 6.4 Z';
    var p = '';
    if (pattern === 'stripes') p = '<path d="M12.6 0h3.6v40h-3.6zM18.2 0h3.6v40h-3.6zM23.8 0h3.6v40h-3.6z" fill="' + c1 + '"/>';
    else if (pattern === 'hoops') p = '<path d="M0 13h40v4.4H0zM0 21.8h40v4.4H0zM0 30.6h40v4.4H0z" fill="' + c1 + '"/>';
    else if (pattern === 'sash') p = '<path d="M8 6 L13 4 L36 36 L28 40 Z" fill="' + c1 + '"/>';
    var dark = uk_lum(c0) < 0.12;
    var ol = dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)';
    return '<svg class="uk-kit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs>' +
      '<path d="' + body + '" fill="' + c0 + '"/>' +
      '<g clip-path="url(#' + id + ')">' + p +
      '<path d="M0.6 13.6 L6.4 18.4 L8 16.9 L2.2 12.1 Z M39.4 13.6 L33.6 18.4 L32 16.9 L37.8 12.1 Z" fill="' + c1 + '"/>' +
      '<path d="M9.4 15.4 V35 M30.6 15.4 V35" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>' +
      '<path d="' + body + '" fill="url(#' + id + 'g)"/></g>' +
      '<path d="M14.2 4 Q20 9.6 25.8 4" fill="none" stroke="' + c1 + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="' + body + '" fill="none" stroke="' + ol + '" stroke-width="1" stroke-linejoin="round"/></svg>';
  } catch (e) { return '<svg class="uk-kit" viewBox="0 0 40 40" width="28" height="28"></svg>'; }
}

/* ---------------------------------------------------------------- 3. Sparkline */
function uk_vals(a) { return (Array.isArray(a) ? a : []).map(function (v) { return v == null || v === '' ? NaN : +v; }); }
function sparkSVG(values, o) {
  try {
    o = o || {};
    var w = +o.w || 80, h = +o.h || 22, color = uk_col(o.color, 'var(--acc)'), fill = o.fill !== false, inv = !!o.invert;
    var v = uk_vals(values), ok = v.filter(uk_numOk);
    var out = uk_svgOpen(w, h, 'uk-spark', ' aria-hidden="true"');
    if (ok.length < 2) {
      out += '<line x1="2" x2="' + (w - 2) + '" y1="' + h / 2 + '" y2="' + h / 2 + '" style="stroke:var(--line)" stroke-width="1.2" stroke-dasharray="3 3"/>';
      if (ok.length === 1) out += '<circle cx="' + (w - 3) + '" cy="' + h / 2 + '" r="2.2" style="fill:' + color + '"/>';
      return out + '</svg>';
    }
    var mn = Math.min.apply(null, ok), mx = Math.max.apply(null, ok);
    if (mx === mn) { mx += 1; mn -= 1; }
    var pad = 2.5, n = v.length;
    var X = function (i) { return uk_r(pad + (w - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1))); };
    var Y = function (x) { var t = (x - mn) / (mx - mn); if (inv) t = 1 - t; return uk_r(h - pad - (h - 2 * pad) * t); };
    var segs = [], cur = [];
    v.forEach(function (x, i) { if (uk_numOk(x)) cur.push([X(i), Y(x)]); else if (cur.length) { segs.push(cur); cur = []; } });
    if (cur.length) segs.push(cur);
    var id = uk_uid('uks');
    if (fill) {
      out += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.32"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>';
      segs.forEach(function (s) { if (s.length > 1) out += '<path d="M' + s[0][0] + ' ' + h + 'L' + s.map(function (p) { return p.join(' '); }).join('L') + 'L' + s[s.length - 1][0] + ' ' + h + 'Z" fill="url(#' + id + ')"/>'; });
    }
    segs.forEach(function (s) { out += s.length > 1 ? '<polyline points="' + s.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" style="stroke:' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' : '<circle cx="' + s[0][0] + '" cy="' + s[0][1] + '" r="1.4" style="fill:' + color + '"/>'; });
    var last = segs[segs.length - 1]; last = last[last.length - 1];
    out += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.3" style="fill:' + color + ';stroke:var(--panel)" stroke-width="1"/>';
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-spark" width="80" height="22"></svg>'; }
}

/* ---------------------------------------------------------------- wspólne osie */
function uk_ticks(mn, mx, n) {
  if (!(mx > mn)) { mx = mn + 1; }
  var raw = (mx - mn) / (n || 4), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  var lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step, t = [];
  for (var x = lo; x <= hi + step / 2; x += step) t.push(Math.round(x / step) * step);
  return t;
}

/* ---------------------------------------------------------------- 4. Słupki */
function barsSVG(items, o) {
  try {
    o = o || {};
    var w = +o.w || 300, h = +o.h || 120, stacked = !!o.stacked;
    var ca = uk_col(o.colA, 'var(--acc)'), cb = uk_col(o.colB, 'var(--bad)');
    var it = (Array.isArray(items) ? items : []).filter(Boolean).map(function (d) { return { l: d.label == null ? '' : String(d.label), a: uk_numOk(+d.a) ? +d.a : 0, b: uk_numOk(+d.b) ? +d.b : 0 }; });
    var leg = Array.isArray(o.legend) ? o.legend : null;
    var top = leg ? 22 : 6, bot = 15, left = 34, right = 4;
    var out = uk_svgOpen(w, h, 'uk-chart uk-bars', ' role="img"');
    if (leg) out += '<g class="uk-leg"><rect x="' + left + '" y="3" width="8" height="8" rx="2" style="fill:' + ca + '"/><text x="' + (left + 11) + '" y="10">' + uk_esc(leg[0] || '') + '</text>' +
      '<rect x="' + (left + 16 + String(leg[0] || '').length * 5.6) + '" y="3" width="8" height="8" rx="2" style="fill:' + cb + '"/><text x="' + (left + 27 + String(leg[0] || '').length * 5.6) + '" y="10">' + uk_esc(leg[1] || '') + '</text></g>';
    if (!it.length) return out + '<text class="uk-empty" x="' + w / 2 + '" y="' + (h / 2 + 3) + '" text-anchor="middle">Brak danych</text></svg>';
    var vals = [0];
    it.forEach(function (d) { if (stacked) { vals.push(d.a + d.b); vals.push(Math.min(0, d.a) + Math.min(0, d.b)); } else { vals.push(d.a, d.b); } });
    var tk = uk_ticks(Math.min.apply(null, vals), Math.max.apply(null, vals), 3), mn = tk[0], mx = tk[tk.length - 1];
    var ph = h - top - bot, pw = w - left - right;
    var Y = function (v) { return uk_r(top + ph * (1 - (v - mn) / (mx - mn))); };
    tk.forEach(function (t) { out += '<line class="uk-grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"' + (t === 0 ? ' style="stroke:var(--mut);stroke-opacity:.5"' : '') + '/><text x="' + (left - 4) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + uk_short(t) + '</text>'; });
    var n = it.length, slot = pw / n, gap = Math.min(slot * 0.28, 10), bw = stacked ? Math.min(slot - gap, 26) : Math.min((slot - gap) / 2, 14);
    var every = Math.ceil(n / Math.max(1, Math.floor(pw / 34)));
    var rb = function (x, y0, y1, c, rr) {
      var y = Math.min(y0, y1), hh = Math.abs(y1 - y0); if (hh < 0.01) return '';
      return '<rect x="' + uk_r(x) + '" y="' + uk_r(y) + '" width="' + uk_r(bw) + '" height="' + uk_r(hh) + '" rx="' + Math.min(rr, hh / 2, bw / 2) + '" style="fill:' + c + '"/>';
    };
    it.forEach(function (d, i) {
      var cx = left + slot * (i + 0.5);
      if (stacked) {
        var x = cx - bw / 2, pa = Math.max(0, d.a), pb = Math.max(0, d.b);
        out += rb(x, Y(0), Y(pa), ca, 1.5) + rb(x, Y(pa), Y(pa + pb), cb, 1.5);
        if (d.a < 0) out += rb(x, Y(0), Y(d.a), ca, 1.5);
        if (d.b < 0) out += rb(x, Y(Math.min(0, d.a)), Y(Math.min(0, d.a) + d.b), cb, 1.5);
      } else {
        out += rb(cx - bw - 0.75, Y(0), Y(d.a), ca, 2) + rb(cx + 0.75, Y(0), Y(d.b), cb, 2);
      }
      if (i % every === 0) out += '<text x="' + uk_r(cx) + '" y="' + (h - 3) + '" text-anchor="middle">' + uk_esc(d.l.length > 7 ? d.l.slice(0, 6) + '…' : d.l) + '</text>';
    });
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-chart" width="300" height="120"></svg>'; }
}

/* ---------------------------------------------------------------- 5. Radar */
function radarSVG(values, labels, o) {
  try {
    o = o || {};
    var size = +o.size || 180, max = +o.max || 99, color = uk_col(o.color, 'var(--acc)'), cmpCol = uk_col(o.compareColor, 'var(--blue)');
    var v = uk_vals(values), cmp = Array.isArray(o.compare) ? uk_vals(o.compare) : null;
    var lb = Array.isArray(labels) && labels.length ? labels : ['TEM', 'STR', 'POD', 'DRY', 'OBR', 'FIZ'];
    var n = Math.max(3, lb.length, Math.min(v.length, 12));
    var c = size / 2, sideW = cmp ? 36 : 26, R = Math.max(10, Math.min(c - 27, (c - sideW - 6) / 0.87)), out = uk_svgOpen(size, size, 'uk-chart uk-radar', ' role="img"');
    var pt = function (i, rr) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return [uk_r(c + rr * Math.cos(a)), uk_r(c + rr * Math.sin(a))]; };
    var poly = function (f) { var s = []; for (var i = 0; i < n; i++) s.push(pt(i, f(i)).join(',')); return s.join(' '); };
    [0.25, 0.5, 0.75, 1].forEach(function (k) { out += '<polygon points="' + poly(function () { return R * k; }) + '" class="uk-grid' + (k === 1 ? ' uk-grid-o' : '') + '" fill="' + (k === 1 ? 'rgba(255,255,255,.02)' : 'none') + '"/>'; });
    for (var i = 0; i < n; i++) { var e = pt(i, R); out += '<line class="uk-grid" x1="' + c + '" y1="' + c + '" x2="' + e[0] + '" y2="' + e[1] + '"/>'; }
    var rv = function (arr) { return function (i) { var x = arr[i]; return R * uk_clamp(uk_numOk(x) ? x : 0, 0, max) / max; }; };
    if (cmp) out += '<polygon points="' + poly(rv(cmp)) + '" style="fill:' + cmpCol + ';stroke:' + cmpCol + '" fill-opacity=".14" stroke-width="1.4" stroke-dasharray="3 2" stroke-linejoin="round"/>';
    out += '<polygon points="' + poly(rv(v)) + '" style="fill:' + color + ';stroke:' + color + '" fill-opacity=".26" stroke-width="1.8" stroke-linejoin="round"/>';
    for (i = 0; i < n; i++) { var q = pt(i, rv(v)(i)); out += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="2.2" style="fill:' + color + '"/>'; }
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n, dx = Math.cos(a), dy = Math.sin(a);
      var vx = pt(i, R), anc = Math.abs(dx) < 0.2 ? 'middle' : dx > 0 ? 'start' : 'end';
      var px = vx[0] + (anc === 'start' ? 6 : anc === 'end' ? -6 : 0);
      var cy = anc !== 'middle' ? vx[1] + dy * 6 - 2 : dy < 0 ? vx[1] - 16 : vx[1] + 16;
      var val = uk_numOk(v[i]) ? Math.round(v[i]) : '–';
      out += '<text x="' + uk_r(px) + '" y="' + uk_r(cy - 2) + '" text-anchor="' + anc + '" class="uk-rl">' + uk_esc(lb[i] == null ? '' : lb[i]) + '</text>';
      out += '<text x="' + uk_r(px) + '" y="' + uk_r(cy + 10) + '" text-anchor="' + anc + '" class="uk-rv"><tspan style="fill:' + color + '">' + val + '</tspan>' +
        (cmp ? '<tspan class="uk-rc" style="fill:' + cmpCol + '"> ' + (uk_numOk(cmp[i]) ? Math.round(cmp[i]) : '–') + '</tspan>' : '') + '</text>';
    }
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-chart" width="180" height="180"></svg>'; }
}

/* ---------------------------------------------------------------- 6. Pierścień */
function donutSVG(pct, o) {
  try {
    o = o || {};
    var size = +o.size || 56, p = uk_numOk(+pct) ? uk_clamp(+pct, 0, 100) : 0;
    var color = uk_col(o.color, p >= 66 ? 'var(--good)' : p >= 33 ? 'var(--warn)' : 'var(--bad)');
    var sw = Math.max(3, size * 0.1), r = size / 2 - sw / 2 - 0.5, c = size / 2;
    var label = o.label == null ? (uk_numOk(+pct) ? Math.round(p) + '%' : '–') : String(o.label);
    var fs = Math.max(10, Math.min(size * 0.27, (2 * r - sw) / (Math.max(2, label.length) * 0.6)));
    var out = uk_svgOpen(size, size, 'uk-donut', ' role="img"') +
      '<circle cx="' + c + '" cy="' + c + '" r="' + uk_r(r) + '" fill="none" style="stroke:var(--line)" stroke-width="' + uk_r(sw) + '"/>';
    if (p > 0) out += '<circle cx="' + c + '" cy="' + c + '" r="' + uk_r(r) + '" fill="none" style="stroke:' + color + '" stroke-width="' + uk_r(sw) + '" stroke-linecap="round" pathLength="100" stroke-dasharray="' + uk_r(p >= 100 ? 100 : Math.max(0.01, p)) + ' 100" transform="rotate(-90 ' + c + ' ' + c + ')"/>';
    out += '<text x="' + c + '" y="' + uk_r(c + 0.5) + '" text-anchor="middle" dominant-baseline="central" font-size="' + uk_r(fs) + '" font-weight="700" style="fill:var(--txt)">' + uk_esc(label) + '</text>';
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-donut" width="56" height="56"></svg>'; }
}

/* ---------------------------------------------------------------- 7. Linie */
var UK_PAL = ['var(--acc)', 'var(--blue)', 'var(--warn)', 'var(--bad)', '#c084fc', '#f472b6'];
function lineSVG(series, o) {
  try {
    o = o || {};
    var w = +o.w || 300, h = +o.h || 120, labels = Array.isArray(o.labels) ? o.labels : [], inv = !!o.invert;
    var ss = (Array.isArray(series) ? series : []).filter(Boolean).map(function (s, i) { return { name: s.name == null ? '' : String(s.name), color: uk_col(s.color, UK_PAL[i % UK_PAL.length]), v: uk_vals(s.values) }; });
    var top = ss.some(function (s) { return s.name; }) ? 22 : 8, bot = labels.length ? 15 : 6, left = 30, right = 8;
    var out = uk_svgOpen(w, h, 'uk-chart uk-line', ' role="img"');
    var lx = left;
    ss.forEach(function (s) { if (!s.name) return; out += '<line x1="' + lx + '" x2="' + (lx + 10) + '" y1="7" y2="7" style="stroke:' + s.color + '" stroke-width="2.4" stroke-linecap="round"/><text x="' + (lx + 14) + '" y="10.5">' + uk_esc(s.name) + '</text>'; lx += 24 + s.name.length * 5.7; });
    var all = []; ss.forEach(function (s) { s.v.forEach(function (x) { if (uk_numOk(x)) all.push(x); }); });
    var n = Math.max(labels.length, Math.max.apply(null, [0].concat(ss.map(function (s) { return s.v.length; }))));
    if (!all.length || n < 1) return out + '<text class="uk-empty" x="' + w / 2 + '" y="' + (h / 2 + 5) + '" text-anchor="middle">Brak danych</text></svg>';
    var mn = uk_numOk(+o.min) && o.min != null ? +o.min : Math.min.apply(null, all), mx = uk_numOk(+o.max) && o.max != null ? +o.max : Math.max.apply(null, all);
    var tk = uk_ticks(mn, mx === mn ? mn + 1 : mx, 3); mn = tk[0]; mx = tk[tk.length - 1];
    var ph = h - top - bot, pw = w - left - right;
    var X = function (i) { return uk_r(left + (n <= 1 ? pw / 2 : pw * i / (n - 1))); };
    var Y = function (v) { var t = (v - mn) / (mx - mn); if (inv) t = 1 - t; return uk_r(top + ph * (1 - t)); };
    tk.forEach(function (t) { out += '<line class="uk-grid" x1="' + left + '" x2="' + (w - right) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (left - 4) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + uk_short(t) + '</text>'; });
    if (labels.length) {
      var every = Math.ceil(n / Math.max(1, Math.floor(pw / 30)));
      for (var i = 0; i < n; i += every) out += '<text x="' + X(i) + '" y="' + (h - 3) + '" text-anchor="' + (i === 0 && n > 1 ? 'start' : 'middle') + '">' + uk_esc(labels[i] == null ? '' : labels[i]) + '</text>';
    }
    ss.forEach(function (s) {
      var segs = [], cur = [];
      s.v.forEach(function (x, i) { if (uk_numOk(x)) cur.push([X(i), Y(x)]); else if (cur.length) { segs.push(cur); cur = []; } });
      if (cur.length) segs.push(cur);
      segs.forEach(function (sg) { out += sg.length > 1 ? '<polyline points="' + sg.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" style="stroke:' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' : ''; });
      if (segs.length) { var l = segs[segs.length - 1]; l = l[l.length - 1]; out += '<circle cx="' + l[0] + '" cy="' + l[1] + '" r="2.8" style="fill:' + s.color + ';stroke:var(--panel)" stroke-width="1.2"/>'; }
      segs.forEach(function (sg) { if (sg.length === 1) out += '<circle cx="' + sg[0][0] + '" cy="' + sg[0][1] + '" r="2" style="fill:' + s.color + '"/>'; });
    });
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-chart" width="300" height="120"></svg>'; }
}

/* ---------------------------------------------------------------- 8–9. Efekty */
function uk_haptic(kind) {
  try {
    var p = { tap: 10, ok: 20, bad: [30, 40, 30], goal: 200 }[kind];
    if (p == null) p = 10;
    if (typeof navigator !== 'undefined' && navigator && typeof navigator.vibrate === 'function') navigator.vibrate(p);
  } catch (e) { /* brak wsparcia */ }
}
function uk_goalOverlay(text, sub) {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    text = text == null ? 'GOL!' : text;
    var old = document.querySelectorAll('.uk-goal'); for (var i = 0; i < old.length; i++) old[i].remove();
    var el = document.createElement('div');
    el.className = 'uk-goal';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="uk-goal-in"><div class="uk-goal-t">' + uk_esc(text) + '</div>' + (sub ? '<div class="uk-goal-s">' + uk_esc(sub) + '</div>' : '') + '</div>';
    document.body.appendChild(el);
    var done = false, rm = function () { if (done) return; done = true; if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', function (e) { if (e.target === el) rm(); });
    setTimeout(rm, 1800);
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) { /* */ }
  } catch (e) { /* */ }
}

/* ---------------------------------------------------------------- 10. Przeciąganie arkusza */
function uk_enableSheetSwipe(el, onClose) {
  try {
    if (!el || el.__ukSwipe || typeof el.addEventListener !== 'function') return;
    el.__ukSwipe = true;
    if (!(el.firstElementChild && el.firstElementChild.classList.contains('uk-sheet-drag'))) {
      var hd = document.createElement('div'); hd.className = 'uk-sheet-drag'; hd.setAttribute('aria-hidden', 'true');
      el.insertBefore(hd, el.firstChild);
    }
    var y0 = 0, x0 = 0, t0 = 0, dy = 0, drag = false, can = false, decided = false;
    var scrolledInside = function (t) {
      for (var n = t; n && n !== el; n = n.parentElement) if (n.scrollTop > 0 && n.scrollHeight > n.clientHeight) return true;
      return el.scrollTop > 0;
    };
    var back = el.parentElement;
    var setBack = function (k) { if (back && back.id === 'modal') back.style.backgroundColor = k == null ? '' : 'rgba(0,0,0,' + (0.62 * k).toFixed(3) + ')'; };
    el.addEventListener('touchstart', function (e) {
      if (!e.touches || e.touches.length !== 1) { can = false; return; }
      var t = e.touches[0]; y0 = t.clientY; x0 = t.clientX; t0 = Date.now(); dy = 0; drag = false; decided = false;
      can = !scrolledInside(e.target);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (!can || !e.touches || !e.touches[0]) return;
      var t = e.touches[0], d = t.clientY - y0, dx = t.clientX - x0;
      if (!decided) {
        if (Math.abs(d) < 6 && Math.abs(dx) < 6) return;
        decided = true;
        drag = d > 0 && Math.abs(d) > Math.abs(dx) && el.scrollTop <= 0;
        if (!drag) { can = false; return; }
        y0 = t.clientY; t0 = Date.now(); d = 0;
      }
      dy = Math.max(0, d);
      if (e.cancelable) e.preventDefault();
      el.style.transition = 'none';
      el.style.transform = 'translateY(' + dy + 'px)';
      setBack(Math.max(0.15, 1 - dy / (el.offsetHeight || 600)));
    }, { passive: false });
    var end = function () {
      if (!drag) { can = false; return; }
      drag = false; can = false;
      var dt = Math.max(1, Date.now() - t0), v = dy / dt;
      if (dy > 110 || (v > 0.55 && dy > 24)) {
        el.style.transition = 'transform .18s ease-in';
        el.style.transform = 'translateY(110%)';
        setBack(0.05);
        setTimeout(function () { try { el.style.transform = ''; el.style.transition = ''; setBack(null); if (typeof onClose === 'function') onClose(); } catch (e) { /* */ } }, 170);
      } else {
        el.style.transition = 'transform .22s cubic-bezier(.2,.9,.3,1.2)';
        el.style.transform = '';
        setBack(null);
        setTimeout(function () { el.style.transition = ''; }, 240);
      }
    };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
  } catch (e) { /* */ }
}

/* ---------------------------------------------------------------- 11. Zakładki */
function uk_scrollActiveTabs(root, smooth) {
  try {
    root = root || (typeof document !== 'undefined' ? document : null);
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll('.tabs');
    for (var i = 0; i < list.length; i++) {
      var c = list[i], b = c.querySelector('.on');
      if (!b || c.scrollWidth <= c.clientWidth) continue;
      var cr = c.getBoundingClientRect(), br = b.getBoundingClientRect();
      var target = uk_clamp(c.scrollLeft + (br.left + br.width / 2) - (cr.left + cr.width / 2), 0, c.scrollWidth - c.clientWidth);
      if (smooth && c.scrollTo) c.scrollTo({ left: target, behavior: 'smooth' }); else c.scrollLeft = target;
    }
  } catch (e) { /* */ }
}

/* ---------------------------------------------------------------- 12. Boisko meczowe */
var UK_PW = 300, UK_PH = 184, UK_X0 = 12, UK_X1 = 288, UK_Y0 = 8, UK_Y1 = 176;
/* głębokość (0 = własna bramka, 0.5 = środek) i szerokość (0 = lewa strona drużyny) */
var UK_FPOS = { GK: [0.035, 0.5], CB: [0.16, 0.5], LB: [0.2, 0.13], RB: [0.2, 0.87], CDM: [0.27, 0.5], CM: [0.34, 0.5], LM: [0.37, 0.12], RM: [0.37, 0.88], CAM: [0.41, 0.5], LW: [0.44, 0.16], RW: [0.44, 0.84], ST: [0.47, 0.5] };
function uk_formation(pitch) {
  var arr = (Array.isArray(pitch) ? pitch : []).filter(Boolean).map(function (s) { var p = String((s && s.pos) || 'CM').toUpperCase(); return UK_FPOS[p] ? p : 'CM'; });
  var groups = {}; arr.forEach(function (p) { (groups[p] = groups[p] || []).push(p); });
  var res = [];
  Object.keys(groups).forEach(function (p) {
    var g = groups[p], n = g.length, b = UK_FPOS[p];
    g.forEach(function (_, k) {
      var y = b[1], x = b[0];
      if (n > 1) {
        if (b[1] === 0.5) { var spread = Math.min(0.2 * (n - 1), p === 'ST' || p === 'CAM' ? 0.36 : 0.56); y = 0.5 - spread / 2 + spread * k / (n - 1); }
        else { y = b[1] + (b[1] < 0.5 ? 1 : -1) * 0.12 * k; x = b[0] + 0.03 * k; }
      }
      if (p === 'CM' && n === 3 && k === 1) x -= 0.03;
      res.push({ pos: p, x: x, y: y });
    });
  });
  return res;
}
function uk_px(fx) { return UK_X0 + (UK_X1 - UK_X0) * fx; }
function uk_py(fy) { return UK_Y0 + (UK_Y1 - UK_Y0) * fy; }
function uk_momentumOf(m) {
  var e = (m && Array.isArray(m.ev)) ? m.ev : [], now = m && uk_numOk(m.minute) ? m.minute : (e.length ? e[e.length - 1].min || 0 : 0);
  if (m && Array.isArray(m.mom) && m.mom.length) {
    var s = 0, k = 0;
    for (var i = Math.max(0, m.mom.length - 6); i < m.mom.length; i++) if (uk_numOk(+m.mom[i])) { s += +m.mom[i]; k++; }
    if (k) return uk_clamp(s / k / 3, -1, 1);
  }
  var b = 0;
  e.forEach(function (x) {
    if (!x || !x.side || !uk_numOk(x.min) || now - x.min > 12) return;
    var w = x.type === 'goal' ? 2 : x.type === 'chance' ? 1 : x.type === 'yellow' || x.type === 'red' ? -0.4 : 0;
    b += (x.side === 'h' ? 1 : -1) * w * (1 - (now - x.min) / 14);
  });
  return uk_clamp(b / 3, -1, 1);
}
function matchPitchSVG(m, userSide) {
  try {
    m = m || {};
    var H = m.home || {}, A = m.away || {}, ht = H.t || {}, at = A.t || {};
    var hc = uk_cols(ht.col), ac = uk_cols(at.col);
    var hCol = hc[0], aCol = ac[0], aSec = ac[1];
    if (uk_dist(hCol, aCol) < 70) { aCol = uk_dist(hCol, ac[1]) >= 70 ? ac[1] : (uk_lum(hCol) > 0.3 ? '#1c2c5b' : '#f4f6fb'); aSec = ac[0]; }
    var id = uk_uid('ukp'), W = UK_PW, Hh = UK_PH, X0 = UK_X0, X1 = UK_X1, Y0 = UK_Y0, Y1 = UK_Y1, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    var L = X1 - X0, Wd = Y1 - Y0, sx = L / 105, sy = Wd / 68;
    var out = '<svg class="uk-pitch" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Boisko">';
    out += '<defs><radialGradient id="' + id + 'v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
      '<radialGradient id="' + id + 'f" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".4" stop-color="#ffe680" stop-opacity=".55"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></radialGradient></defs>';
    out += '<rect x="0" y="0" width="' + W + '" height="' + Hh + '" rx="10" fill="#174a31"/>';
    var nst = 12, sw = L / nst;
    for (var i = 0; i < nst; i += 2) out += '<rect x="' + uk_r(X0 + i * sw) + '" y="' + Y0 + '" width="' + uk_r(sw) + '" height="' + Wd + '" fill="#1b5638"/>';
    out += '<rect x="0" y="0" width="' + W + '" height="' + Hh + '" rx="10" fill="url(#' + id + 'v)"/>';
    var ln = ' fill="none" stroke="rgba(255,255,255,.62)" stroke-width="1.1"';
    var pbD = 16.5 * sx, pbH = 40.3 * sy, gbD = 5.5 * sx, gbH = 18.32 * sy, spot = 11 * sx, gH = 7.32 * sy, rC = 9.15 * sx;
    out += '<rect x="' + X0 + '" y="' + Y0 + '" width="' + L + '" height="' + Wd + '"' + ln + '/>' +
      '<line x1="' + cx + '" y1="' + Y0 + '" x2="' + cx + '" y2="' + Y1 + '"' + ln + '/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + uk_r(rC) + '"' + ln + '/><circle cx="' + cx + '" cy="' + cy + '" r="1.5" fill="rgba(255,255,255,.75)"/>';
    [0, 1].forEach(function (s) {
      var gx = s ? X1 : X0, dir = s ? -1 : 1;
      out += '<rect x="' + uk_r(s ? X1 - pbD : X0) + '" y="' + uk_r(cy - pbH / 2) + '" width="' + uk_r(pbD) + '" height="' + uk_r(pbH) + '"' + ln + '/>' +
        '<rect x="' + uk_r(s ? X1 - gbD : X0) + '" y="' + uk_r(cy - gbH / 2) + '" width="' + uk_r(gbD) + '" height="' + uk_r(gbH) + '"' + ln + '/>' +
        '<circle cx="' + uk_r(gx + dir * spot) + '" cy="' + cy + '" r="1.2" fill="rgba(255,255,255,.75)"/>';
      var ay = Math.sqrt(rC * rC - Math.pow(pbD - spot, 2));
      out += '<path d="M' + uk_r(gx + dir * pbD) + ' ' + uk_r(cy - ay) + ' A' + uk_r(rC) + ' ' + uk_r(rC) + ' 0 0 ' + (s ? 0 : 1) + ' ' + uk_r(gx + dir * pbD) + ' ' + uk_r(cy + ay) + '"' + ln + '/>';
      out += '<rect x="' + (s ? X1 : X0 - 6) + '" y="' + uk_r(cy - gH / 2) + '" width="6" height="' + uk_r(gH) + '" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.8)" stroke-width="1"/>';
      [Y0, Y1].forEach(function (yy) { var dy = yy === Y0 ? 1 : -1; out += '<path d="M' + uk_r(gx + dir * 3) + ' ' + yy + ' A3 3 0 0 ' + ((dir * dy) > 0 ? 0 : 1) + ' ' + gx + ' ' + (yy + dy * 3) + '"' + ln + '/>'; });
    });
    /* oznaczenia drużyn i kierunku ataku */
    var lab = function (x, anc, t, col, arrow) { return '<text x="' + x + '" y="' + (Y1 - 4) + '" text-anchor="' + anc + '" font-size="10" font-weight="800" fill="rgba(255,255,255,.55)" letter-spacing=".04em">' + (anc === 'start' ? '' : arrow + ' ') + uk_esc(String(t.short || '').slice(0, 4)) + (anc === 'start' ? ' ' + arrow : '') + '</text>'; };
    out += lab(X0 + 4, 'start', ht, hCol, '→') + lab(X1 - 4, 'end', at, aCol, '←');
    /* zawodnicy */
    var mom = uk_momentumOf(m);
    var shift = mom * 0.06;
    var dots = function (side, list, col, sec, isH) {
      var f = uk_formation(list), mine = userSide === side, s = '';
      var strokeC = uk_lum(col) > 0.5 ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.85)';
      f.forEach(function (p) {
        var sh = p.pos === 'GK' ? 0 : shift;
        var fx = isH ? p.x + sh : 1 - p.x + sh, fy = isH ? p.y : 1 - p.y;
        var x = uk_r(uk_px(uk_clamp(fx, 0.02, 0.98))), y = uk_r(uk_py(uk_clamp(fy, 0.05, 0.95)));
        var gk = p.pos === 'GK', gkc = uk_dist(sec, '#1b5638') < 90 || uk_dist(sec, col) < 60 ? '#ffd23f' : sec;
        s += '<circle cx="' + x + '" cy="' + uk_r(y + 0.9) + '" r="4.4" fill="rgba(0,0,0,.28)"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="' + (mine ? 4.6 : 4.1) + '" fill="' + (gk ? gkc : col) + '" stroke="' + (mine ? '#2ee59d' : strokeC) + '" stroke-width="' + (mine ? 1.4 : 1) + '"/>';
      });
      return s;
    };
    out += '<g class="uk-pl">' + dots('h', H.pitch, hCol, hc[1], true) + dots('a', A.pitch, aCol, aSec, false) + '</g>';
    /* piłka */
    var ev = Array.isArray(m.ev) ? m.ev : [], last = null;
    for (i = ev.length - 1; i >= 0; i--) if (ev[i] && typeof ev[i] === 'object') { last = ev[i]; break; }
    var now = uk_numOk(m.minute) ? m.minute : last && uk_numOk(last.min) ? last.min : 0;
    var seed = uk_hash((last ? last.min + last.type + (last.text || '') : 'ko') + '|' + ev.length);
    var j1 = ((seed % 1000) / 1000) * 2 - 1, j2 = (((seed >>> 10) % 1000) / 1000) * 2 - 1;
    var bx = cx, by = cy, flash = false, sd = last && (last.side === 'h' || last.side === 'a') ? last.side : null;
    var ty = last ? last.type : 'ko';
    var atkRight = sd === 'h';
    if (ty === 'goal' && sd) { bx = atkRight ? X1 + 3.4 : X0 - 3.4; by = cy + j1 * gH * 0.3; flash = !uk_numOk(last.min) || now - last.min <= 1; }
    else if (ty === 'pen' && sd) { bx = atkRight ? X1 - spot : X0 + spot; by = cy; }
    else if (ty === 'penmiss' && sd) { bx = atkRight ? X1 + 2 : X0 - 2; by = cy + (j1 >= 0 ? 1 : -1) * (gH / 2 + 6 + Math.abs(j2) * 8); }
    else if (ty === 'chance' && sd) { bx = atkRight ? X1 - pbD - 4 + Math.abs(j1) * 18 : X0 + pbD + 4 - Math.abs(j1) * 18; by = cy + j2 * pbH * 0.42; }
    else if (ty === 'ht' || ty === 'ft' || ty === 'ko') { bx = cx; by = cy; }
    else { bx = cx + mom * L * 0.24 + j1 * 26; by = cy + j2 * Wd * 0.3; }
    bx = uk_clamp(bx, 4, W - 4); by = uk_clamp(by, Y0 + 3, Y1 - 3);
    if (flash) {
      out += '<circle cx="' + uk_r(bx) + '" cy="' + uk_r(by) + '" r="10" fill="url(#' + id + 'f)" class="uk-flash"><animate attributeName="r" values="6;34;22" dur="1.1s" repeatCount="2"/><animate attributeName="opacity" values="1;.25;1" dur="1.1s" repeatCount="2"/></circle>';
    }
    out += '<g class="uk-ball"><ellipse cx="' + uk_r(bx + 0.8) + '" cy="' + uk_r(by + 2.6) + '" rx="3.2" ry="1.4" fill="rgba(0,0,0,.35)"/>' +
      '<circle cx="' + uk_r(bx) + '" cy="' + uk_r(by) + '" r="3.3" fill="#fff" stroke="#0b1220" stroke-width=".9"/>' +
      '<path d="M' + uk_r(bx - 1.1) + ' ' + uk_r(by - 0.6) + 'l1.1-.9 1.1.9-.4 1.3h-1.4z" fill="#0b1220"/></g>';
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-pitch" viewBox="0 0 300 184" width="100%"><rect width="300" height="184" rx="10" fill="#174a31"/></svg>'; }
}

function uk_smoothPath(pts) {
  if (pts.length < 2) return '';
  var d = 'M' + pts[0][0] + ' ' + pts[0][1];
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6, c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += 'C' + uk_r(c1x) + ' ' + uk_r(c1y) + ' ' + uk_r(c2x) + ' ' + uk_r(c2y) + ' ' + p2[0] + ' ' + p2[1];
  }
  return d;
}
function momentumSVG(mom, o) {
  try {
    o = o || {};
    var w = +o.w || 300, h = +o.h || 46, mid = h / 2, amp = mid - 3;
    var colH = uk_vis(o.colH, 'var(--acc)'), colA = uk_vis(o.colA, 'var(--blue)');
    if (uk_dist(colH, colA) < 60) colA = 'var(--blue)';
    var v = uk_vals(mom).map(function (x) { return uk_numOk(x) ? uk_clamp(x, -3.5, 3.5) : 0; });
    var maxMin = Math.max(90, v.length - 1, +o.maxMin || 0);
    var goals = (Array.isArray(o.goals) ? o.goals : []).filter(function (g) { return g && uk_numOk(+g.min); });
    goals.forEach(function (g) { maxMin = Math.max(maxMin, +g.min); });
    var X = function (t) { return uk_r(2 + (w - 4) * t / maxMin); };
    var id = uk_uid('ukm');
    var out = uk_svgOpen(w, h, 'uk-chart uk-mom', ' role="img" aria-label="Przewaga"');
    out += '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="8" style="fill:var(--panel2)"/>';
    out += '<line x1="' + X(45) + '" x2="' + X(45) + '" y1="3" y2="' + (h - 3) + '" style="stroke:var(--line)" stroke-dasharray="2 2"/>';
    if (maxMin > 95) out += '<line x1="' + X(90) + '" x2="' + X(90) + '" y1="3" y2="' + (h - 3) + '" style="stroke:var(--line)" stroke-dasharray="2 2"/>';
    if (v.length >= 2) {
      /* wygładzanie: średnia ważona z okna 5 */
      var sm = v.map(function (_, i) { var s = 0, k = 0, wts = [1, 2, 3, 2, 1]; for (var j = -2; j <= 2; j++) { var x = v[i + j]; if (x != null) { s += x * wts[j + 2]; k += wts[j + 2]; } } return s / k; });
      var step = Math.max(1, Math.round(sm.length / 60)), pts = [];
      for (var i = 0; i < sm.length; i += step) pts.push([X(i), uk_r(mid - sm[i] / 3 * amp)]);
      if ((sm.length - 1) % step) pts.push([X(sm.length - 1), uk_r(mid - sm[sm.length - 1] / 3 * amp)]);
      pts.forEach(function (p) { p[1] = uk_clamp(p[1], 2, h - 2); });
      var line = uk_smoothPath(pts), area = line + 'L' + pts[pts.length - 1][0] + ' ' + mid + 'L' + pts[0][0] + ' ' + mid + 'Z';
      out += '<defs><clipPath id="' + id + 't"><rect x="0" y="0" width="' + w + '" height="' + mid + '"/></clipPath><clipPath id="' + id + 'b"><rect x="0" y="' + mid + '" width="' + w + '" height="' + mid + '"/></clipPath></defs>';
      out += '<path d="' + area + '" clip-path="url(#' + id + 't)" style="fill:' + colH + '" fill-opacity=".5"/>' +
        '<path d="' + area + '" clip-path="url(#' + id + 'b)" style="fill:' + colA + '" fill-opacity=".5"/>' +
        '<path d="' + line + '" clip-path="url(#' + id + 't)" fill="none" style="stroke:' + colH + '" stroke-width="1.3"/>' +
        '<path d="' + line + '" clip-path="url(#' + id + 'b)" fill="none" style="stroke:' + colA + '" stroke-width="1.3"/>';
    }
    out += '<line x1="2" x2="' + (w - 2) + '" y1="' + mid + '" y2="' + mid + '" style="stroke:var(--mut)" stroke-opacity=".45" stroke-width="1"/>';
    goals.forEach(function (g) {
      var x = X(+g.min), hs = g.side !== 'a', c = hs ? colH : colA, y = hs ? 7 : h - 7;
      out += '<line x1="' + x + '" x2="' + x + '" y1="' + mid + '" y2="' + y + '" style="stroke:' + c + '" stroke-width="1"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="4.2" fill="#fff" style="stroke:' + c + '" stroke-width="1.6"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="1.4" fill="#0b1220"/>';
    });
    return out + '</svg>';
  } catch (e) { return '<svg class="uk-chart" width="300" height="46"></svg>'; }
}
