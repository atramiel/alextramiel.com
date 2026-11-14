// Everything interactive on the site lives here:
//   1. the circuit-board background that lights up around the cursor
//   2. the oscilloscope trace on the home page
//   3. hidden games and easter eggs (see README, "Secrets")

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

/* ---------------------------------------------------------------- secrets */

const SECRETS: Record<string, string> = {
  hockey: 'Bot Hockey',
  snake: 'Route the trace',
  smoke: 'Magic smoke',
  sparks: 'Weapon test',
  power: 'Power switch',
};
const foundSet = () => new Set((store.get('secrets') || '').split(',').filter((s) => s in SECRETS));

function toast(msg: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout((toast as any).t);
  (toast as any).t = setTimeout(() => el.classList.remove('show'), 4200);
}

function renderSecrets() {
  const el = document.getElementById('secrets');
  if (!el) return;
  const n = foundSet().size;
  el.hidden = n === 0;
  el.textContent = `Secrets found: ${n} of ${Object.keys(SECRETS).length}`;
}

function found(id: string) {
  const s = foundSet();
  if (!s.has(id)) {
    s.add(id);
    store.set('secrets', [...s].join(','));
    const total = Object.keys(SECRETS).length;
    toast(s.size === total ? `Secret found: ${SECRETS[id]}. That's all ${total}.` : `Secret found: ${SECRETS[id]} (${s.size} of ${total})`);
  }
  renderSecrets();
}

/* ------------------------------------------------------------- background */

type Trace = { pts: { x: number; y: number }[]; len: number[]; total: number };
type Pulse = { t: Trace; d: number; v: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number };

let cv: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dim: HTMLCanvasElement, bright: HTMLCanvasElement, mask: HTMLCanvasElement;
let traces: Trace[] = [];
let pulses: Pulse[] = [];
let sparks: Spark[] = [];
let W = 0, H = 0, dpr = 1;
const mouse = { x: -999, y: -999, tx: -999, ty: -999, seen: false, nx: 0.5, ny: 0.5 };
let powered = store.get('power') !== 'off';
let running = false;

function makeTraces() {
  const G = 28 * dpr;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const count = Math.round((innerWidth * innerHeight) / 11000);
  traces = [];
  for (let i = 0; i < count; i++) {
    let x = Math.round((Math.random() * W) / G) * G;
    let y = Math.round((Math.random() * H) / G) * G;
    let d = Math.floor(Math.random() * 8);
    const pts = [{ x, y }];
    const segs = 2 + Math.floor(Math.random() * 3);
    for (let s = 0; s < segs; s++) {
      const n = 2 + Math.floor(Math.random() * 6);
      x += dirs[d][0] * n * G;
      y += dirs[d][1] * n * G;
      pts.push({ x, y });
      d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
    }
    const len = [0];
    for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    traces.push({ pts, len, total: len[len.length - 1] });
  }
}

function paintLayer(c: HTMLCanvasElement, trace: string, pad: string, hole: string) {
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.lineWidth = 1.6 * dpr; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = trace;
  for (const t of traces) {
    g.beginPath();
    t.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.stroke();
  }
  for (const t of traces) {
    for (const p of [t.pts[0], t.pts[t.pts.length - 1]]) {
      g.fillStyle = pad; g.beginPath(); g.arc(p.x, p.y, 4 * dpr, 0, TAU); g.fill();
      g.fillStyle = hole; g.beginPath(); g.arc(p.x, p.y, 1.6 * dpr, 0, TAU); g.fill();
    }
  }
}

function buildBoard() {
  if (!cv) return;
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = cv.width = Math.round(innerWidth * dpr);
  H = cv.height = Math.round(innerHeight * dpr);
  makeTraces();
  dim = document.createElement('canvas');
  bright = document.createElement('canvas');
  mask = document.createElement('canvas');
  paintLayer(dim, '#16271f', '#1d3429', '#0b1310');
  paintLayer(bright, '#45e0b5', '#f4c531', '#0b1310');
  pulses = [];
  if (!reduceMotion) for (let i = 0; i < 9; i++) pulses.push(newPulse());
  if (!running) drawBoard();
}

function newPulse(): Pulse {
  return { t: traces[Math.floor(Math.random() * traces.length)], d: 0, v: (1.5 + Math.random() * 2.5) * dpr };
}

function pointOn(t: Trace, d: number) {
  let k = 1;
  while (k < t.len.length - 1 && t.len[k] < d) k++;
  const f = (d - t.len[k - 1]) / (t.len[k] - t.len[k - 1] || 1);
  return { x: t.pts[k - 1].x + (t.pts[k].x - t.pts[k - 1].x) * f, y: t.pts[k - 1].y + (t.pts[k].y - t.pts[k - 1].y) * f };
}

function drawBoard() {
  if (!ctx || !cv || !dim) return;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(dim, 0, 0);
  if (!powered) return;

  // Lit copper in a soft circle around the cursor
  const R = Math.round(Math.min(300, Math.max(180, innerWidth * 0.2)) * dpr);
  const cx = mouse.x * dpr, cy = mouse.y * dpr;
  if (cx > -R && cy > -R) {
    if (mask.width !== R * 2) { mask.width = mask.height = R * 2; }
    const m = mask.getContext('2d')!;
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, R * 2, R * 2);
    m.drawImage(bright, cx - R, cy - R, R * 2, R * 2, 0, 0, R * 2, R * 2);
    m.globalCompositeOperation = 'destination-in';
    const grad = m.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.45, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = grad; m.fillRect(0, 0, R * 2, R * 2);
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    halo.addColorStop(0, 'rgba(69,224,181,.10)'); halo.addColorStop(1, 'rgba(69,224,181,0)');
    ctx.fillStyle = halo; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.drawImage(mask, cx - R, cy - R);
  }

  // Signals travelling along traces
  ctx.shadowColor = '#45e0b5'; ctx.shadowBlur = 10 * dpr; ctx.fillStyle = '#bff7e6';
  for (let i = 0; i < pulses.length; i++) {
    const p = pulses[i];
    p.d += p.v;
    if (p.d >= p.t.total) { pulses[i] = newPulse(); continue; }
    const pt = pointOn(p.t, p.d);
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 2 * dpr, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Sparks from the weapon test
  if (sparks.length) {
    ctx.strokeStyle = '#f4c531'; ctx.lineWidth = 2 * dpr; ctx.lineCap = 'round';
    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 1.8, s.y - s.vy * 1.8); ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.vy += 0.45 * dpr; s.life -= 0.02;
    }
    ctx.globalAlpha = 1;
    sparks = sparks.filter((s) => s.life > 0);
  }
}

/* ------------------------------------------------------------ oscilloscope */

let scopeWave = 0; // 0 sine, 1 square, 2 sawtooth
let phase = 0;

function drawScope() {
  const sc = document.querySelector<HTMLCanvasElement>('canvas.scope');
  if (!sc) return;
  const r = sc.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight || r.width === 0) return;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (sc.width !== w || sc.height !== h) { sc.width = w; sc.height = h; }
  const g = sc.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  g.strokeStyle = 'rgba(233,239,233,.07)'; g.lineWidth = 1;
  for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo((w / 12) * i, 0); g.lineTo((w / 12) * i, h); g.stroke(); }
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, (h / 4) * i); g.lineTo(w, (h / 4) * i); g.stroke(); }
  if (!powered) { g.strokeStyle = '#1d3429'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); return; }
  const cycles = 2 + mouse.nx * 9;
  const amp = (0.12 + (1 - mouse.ny) * 0.3) * h;
  g.strokeStyle = '#45e0b5'; g.lineWidth = 2 * dpr; g.lineJoin = 'round';
  g.shadowColor = '#45e0b5'; g.shadowBlur = 12 * dpr;
  g.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const a = (x / w) * cycles * TAU + phase;
    const s = Math.sin(a);
    const v = scopeWave === 0 ? s : scopeWave === 1 ? Math.sign(s) * 0.85 : ((a / TAU) % 1) * 1.7 - 0.85;
    const y = h / 2 - v * amp;
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke(); g.shadowBlur = 0;
}

/* --------------------------------------------------------------- main loop */

function frame(t: number) {
  if (!mouse.seen) { // no pointer yet (or a touch device): let the light wander
    mouse.tx = innerWidth * (0.5 + 0.34 * Math.sin(t / 2600));
    mouse.ty = innerHeight * (0.42 + 0.26 * Math.sin(t / 1900 + 1));
  }
  mouse.x += (mouse.tx - mouse.x) * 0.14;
  mouse.y += (mouse.ty - mouse.y) * 0.14;
  mouse.nx = Math.min(1, Math.max(0, mouse.x / innerWidth));
  mouse.ny = Math.min(1, Math.max(0, mouse.y / innerHeight));
  phase -= 0.05;
  drawBoard();
  drawScope();
  if (powered && !document.hidden) requestAnimationFrame(frame); else running = false;
}

function start() {
  if (reduceMotion) { drawBoard(); drawScope(); return; }
  if (!running && powered) { running = true; requestAnimationFrame(frame); }
}

function setPower(on: boolean) {
  powered = on;
  store.set('power', on ? 'on' : 'off');
  document.documentElement.classList.toggle('off', !on);
  const b = document.getElementById('power');
  if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Board power: on. Switch off' : 'Board power: off. Switch on'); }
  if (on) start(); else { drawBoard(); drawScope(); }
}

function burst() {
  const x = (mouse.seen ? mouse.x : innerWidth / 2) * dpr, y = (mouse.seen ? mouse.y : innerHeight / 2) * dpr;
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * TAU, v = (3 + Math.random() * 11) * dpr;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4 * dpr, life: 0.6 + Math.random() * 0.6 });
  }
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  if (!reduceMotion) document.body.classList.add('shake');
  if (reduceMotion || !powered) drawBoard();
  start();
}

/* ------------------------------------------------------------------ arcade */

const GW = 640, GH = 400;
let game: { stop: () => void; key: (k: string, down: boolean) => void } | null = null;

function arcadeEls() {
  return {
    dlg: document.getElementById('arcade') as HTMLDialogElement | null,
    canvas: document.getElementById('arcade-canvas') as HTMLCanvasElement | null,
    title: document.getElementById('arcade-title'),
    score: document.getElementById('arcade-score'),
    help: document.getElementById('arcade-help'),
  };
}

function openGame(kind: 'hockey' | 'snake') {
  const { dlg, canvas, title, score, help } = arcadeEls();
  if (!dlg || !canvas || !title || !score || !help) return;
  game?.stop();
  if (!dlg.open) dlg.showModal();
  const g = canvas.getContext('2d')!;
  const touch = matchMedia('(pointer: coarse)').matches;
  if (kind === 'hockey') {
    title.textContent = 'Bot Hockey';
    help.textContent = touch ? 'Drag on the rink to move your bot. First to 5 wins.' : 'Move your bot with the mouse or the arrow keys. First to 5 wins.';
    game = hockey(canvas, g, score);
  } else {
    title.textContent = 'Route the trace';
    help.textContent = touch ? 'Swipe to steer. Reach the gold pads without crossing your own trace.' : 'Steer with the arrow keys or WASD. Reach the gold pads without crossing your own trace.';
    game = snake(canvas, g, score);
  }
  found(kind);
}

function hockey(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, scoreEl: HTMLElement) {
  const PH = 72, PW = 14, WIN = 5;
  let py = GH / 2, ay = GH / 2, sc = [0, 0], over = '', raf = 0, keyDir = 0;
  let puck = { x: 0, y: 0, vx: 0, vy: 0 };
  const serve = (dir: number) => { puck = { x: GW / 2, y: GH / 2, vx: 5 * dir, vy: (Math.random() - 0.5) * 5 }; };
  const show = () => { scoreEl.textContent = `You ${sc[0]} : ${sc[1]} Bot`; };
  const reset = () => { sc = [0, 0]; over = ''; serve(Math.random() < 0.5 ? 1 : -1); show(); };
  const toY = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); py = ((e.clientY - r.top) / r.height) * GH; };
  const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.buttons) toY(e); };
  const onDown = (e: PointerEvent) => { if (over) reset(); else toY(e); };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);

  function bot(x: number, y: number, body: string, eye: string) {
    g.fillStyle = body; g.beginPath(); g.roundRect(x, y - PH / 2, PW, PH, 4); g.fill();
    g.fillStyle = eye; g.fillRect(x + 4, y - 14, 6, 6); g.fillRect(x + 4, y + 8, 6, 6);
  }

  function tick() {
    py = Math.max(PH / 2, Math.min(GH - PH / 2, py + keyDir * 7));
    if (!over) {
      const target = puck.vx > 0 ? puck.y : GH / 2;
      ay += Math.max(-4.3, Math.min(4.3, target - ay));
      ay = Math.max(PH / 2, Math.min(GH - PH / 2, ay));
      puck.x += puck.vx; puck.y += puck.vy;
      if (puck.y < 8 || puck.y > GH - 8) { puck.vy *= -1; puck.y = Math.max(8, Math.min(GH - 8, puck.y)); }
      const hit = (px: number, y: number, dir: number) => {
        if (Math.abs(puck.y - y) < PH / 2 + 8 && puck.x > px - 8 && puck.x < px + PW + 8 && Math.sign(puck.vx) === -dir) {
          puck.vx = dir * Math.min(13, Math.abs(puck.vx) * 1.06 + 0.2);
          puck.vy += (puck.y - y) * 0.09;
          puck.x = dir > 0 ? px + PW + 8 : px - 8;
        }
      };
      hit(28, py, 1); hit(GW - 28 - PW, ay, -1);
      if (puck.x < -12) { sc[1]++; show(); serve(1); }
      if (puck.x > GW + 12) { sc[0]++; show(); serve(-1); }
      if (sc[0] >= WIN) over = 'You win. Good game.';
      if (sc[1] >= WIN) over = 'The bot wins this one.';
    }
    // rink
    g.fillStyle = '#0e1a16'; g.fillRect(0, 0, GW, GH);
    g.lineWidth = 3;
    g.strokeStyle = '#2b5fae'; for (const x of [GW * 0.33, GW * 0.67]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GH); g.stroke(); }
    g.strokeStyle = '#c8322b'; g.beginPath(); g.moveTo(GW / 2, 0); g.lineTo(GW / 2, GH); g.stroke();
    g.beginPath(); g.arc(GW / 2, GH / 2, 46, 0, TAU); g.stroke();
    bot(28, py, '#45e0b5', '#0b1310'); bot(GW - 28 - PW, ay, '#f4c531', '#0b1310');
    g.fillStyle = '#e9efe9'; g.beginPath(); g.arc(puck.x, puck.y, 8, 0, TAU); g.fill();
    if (over) {
      g.fillStyle = 'rgba(11,19,16,.8)'; g.fillRect(0, 0, GW, GH);
      g.fillStyle = '#e9efe9'; g.textAlign = 'center';
      g.font = '800 34px "Archivo Variable", sans-serif'; g.fillText(over, GW / 2, GH / 2 - 6);
      g.font = '16px "Archivo Variable", sans-serif'; g.fillText('Press space or tap to play again', GW / 2, GH / 2 + 28);
    }
    raf = requestAnimationFrame(tick);
  }
  reset(); raf = requestAnimationFrame(tick);
  return {
    stop() { cancelAnimationFrame(raf); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown); },
    key(k: string, down: boolean) {
      if (k === 'ArrowUp' || k === 'w') keyDir = down ? -1 : keyDir === -1 ? 0 : keyDir;
      if (k === 'ArrowDown' || k === 's') keyDir = down ? 1 : keyDir === 1 ? 0 : keyDir;
      if (k === ' ' && down && over) reset();
    },
  };
}

function snake(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D, scoreEl: HTMLElement) {
  const C = 20, COLS = GW / C, ROWS = GH / C;
  let body: { x: number; y: number }[] = [], dir = { x: 1, y: 0 }, queue: { x: number; y: number }[] = [];
  let food = { x: 0, y: 0 }, over = false, timer = 0, best = Number(store.get('snake-best') || 0), start: { x: number; y: number } | null = null;
  const show = () => { scoreEl.textContent = `Pads ${body.length - 3}  Best ${best}`; };
  const place = () => { do { food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (body.some((b) => b.x === food.x && b.y === food.y)); };
  const reset = () => { body = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]; dir = { x: 1, y: 0 }; queue = []; over = false; place(); show(); draw(); };
  const turn = (x: number, y: number) => { const last = queue[queue.length - 1] || dir; if (last.x !== -x || last.y !== -y) { if (queue.length < 3) queue.push({ x, y }); } };

  function step() {
    if (over) return;
    if (queue.length) dir = queue.shift()!;
    const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || body.some((b) => b.x === h.x && b.y === h.y)) {
      over = true; best = Math.max(best, body.length - 3); store.set('snake-best', String(best)); show(); draw(); return;
    }
    body.unshift(h);
    if (h.x === food.x && h.y === food.y) { place(); show(); } else body.pop();
    draw();
  }

  function draw() {
    g.fillStyle = '#0e1a16'; g.fillRect(0, 0, GW, GH);
    g.fillStyle = '#16271f';
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) g.fillRect(x * C + C / 2 - 1, y * C + C / 2 - 1, 2, 2);
    const c = (p: { x: number; y: number }) => [p.x * C + C / 2, p.y * C + C / 2] as const;
    g.strokeStyle = '#45e0b5'; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); body.forEach((b, i) => { const [x, y] = c(b); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    const [hx, hy] = c(body[0]);
    g.fillStyle = '#e9efe9'; g.beginPath(); g.arc(hx, hy, 8, 0, TAU); g.fill();
    g.fillStyle = '#0e1a16'; g.beginPath(); g.arc(hx, hy, 3, 0, TAU); g.fill();
    const [fx, fy] = c(food);
    g.fillStyle = '#f4c531'; g.beginPath(); g.arc(fx, fy, 8, 0, TAU); g.fill();
    g.fillStyle = '#0e1a16'; g.beginPath(); g.arc(fx, fy, 3, 0, TAU); g.fill();
    if (over) {
      g.fillStyle = 'rgba(11,19,16,.8)'; g.fillRect(0, 0, GW, GH);
      g.fillStyle = '#e9efe9'; g.textAlign = 'center';
      g.font = '800 34px "Archivo Variable", sans-serif'; g.fillText('Short circuit', GW / 2, GH / 2 - 6);
      g.font = '16px "Archivo Variable", sans-serif'; g.fillText('Press space or tap to route again', GW / 2, GH / 2 + 28);
    }
  }

  const onDown = (e: PointerEvent) => { if (over) reset(); start = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
  };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp);
  reset(); timer = window.setInterval(step, 105);
  return {
    stop() { clearInterval(timer); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); },
    key(k: string, down: boolean) {
      if (!down) return;
      if (k === 'ArrowUp' || k === 'w') turn(0, -1);
      if (k === 'ArrowDown' || k === 's') turn(0, 1);
      if (k === 'ArrowLeft' || k === 'a') turn(-1, 0);
      if (k === 'ArrowRight' || k === 'd') turn(1, 0);
      if (k === ' ' && over) reset();
    },
  };
}

/* ------------------------------------------------------ one-time listeners */

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keys: string[] = [];
let typed = '';

addEventListener('pointermove', (e) => {
  mouse.tx = e.clientX; mouse.ty = e.clientY;
  if (!mouse.seen) { mouse.seen = true; if (mouse.x < -500) { mouse.x = e.clientX; mouse.y = e.clientY; } }
  if (reduceMotion) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / innerWidth; mouse.ny = e.clientY / innerHeight; drawBoard(); drawScope(); }
}, { passive: true });

let resizeTimer = 0;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(buildBoard, 150); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const dlg = document.getElementById('arcade') as HTMLDialogElement | null;
  if (dlg?.open && game) {
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
    game.key(k, true);
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  keys = [...keys, k].slice(-KONAMI.length);
  if (keys.join() === KONAMI.join()) { keys = []; openGame('hockey'); return; }
  if (k.length === 1) {
    typed = (typed + k).slice(-12);
    if (typed.endsWith('snake')) { typed = ''; openGame('snake'); }
    else if (typed.endsWith('hockey')) { typed = ''; openGame('hockey'); }
    else if (typed.endsWith('fight')) { typed = ''; burst(); found('sparks'); }
  }
});
addEventListener('keyup', (e) => game?.key(e.key.length === 1 ? e.key.toLowerCase() : e.key, false));

/* -------------------------------------------- per-page wiring (every nav) */

function wirePage() {
  const c = document.getElementById('board') as HTMLCanvasElement | null;
  if (c && c !== cv) { cv = c; ctx = c.getContext('2d'); buildBoard(); }
  setPower(powered);
  renderSecrets();

  const once = (el: Element | null, fn: (el: HTMLElement) => void) => {
    if (el && !(el as HTMLElement).dataset.wired) { (el as HTMLElement).dataset.wired = '1'; fn(el as HTMLElement); }
  };

  once(document.getElementById('power'), (b) => b.addEventListener('click', () => { setPower(!powered); if (!powered) found('power'); }));
  once(document.getElementById('egg-puck'), (b) => b.addEventListener('click', () => openGame('hockey')));
  once(document.getElementById('egg-chip'), (b) => b.addEventListener('click', () => openGame('snake')));
  once(document.getElementById('egg-cap'), (b) => {
    let n = 0;
    b.addEventListener('click', () => {
      if (b.classList.contains('popped')) { toast('That capacitor is done. Reload the page to fit a new one.'); return; }
      n++;
      b.style.setProperty('--bulge', String(n));
      if (n < 5) return;
      b.classList.add('popped');
      for (let i = 0; i < 7; i++) {
        const s = document.createElement('span');
        s.className = 'smoke';
        s.style.setProperty('--dx', `${(Math.random() - 0.5) * 70}px`);
        s.style.animationDelay = `${i * 90}ms`;
        b.appendChild(s);
        setTimeout(() => s.remove(), 2600 + i * 90);
      }
      toast('You let the magic smoke out.');
      found('smoke');
    });
  });
  once(document.querySelector('.hero-name'), (h) => h.addEventListener('click', () => { scopeWave = (scopeWave + 1) % 3; if (reduceMotion) drawScope(); }));
  once(document.getElementById('arcade'), (d) => {
    d.addEventListener('close', () => { game?.stop(); game = null; });
    d.addEventListener('click', (e) => { if (e.target === d) (d as HTMLDialogElement).close(); });
  });
  drawScope();
}

document.addEventListener('astro:page-load', wirePage);
if (document.readyState !== 'loading') wirePage(); else document.addEventListener('DOMContentLoaded', wirePage);

console.log(
  '%c ALEX TRAMIEL %c rev A\n%cThere are five secrets on this board. Three are components in the footer.\nThe others answer to the keyboard: an old cheat code, and a word for what combat robots do.',
  'background:#f4c531;color:#0b1310;font-weight:800;padding:2px 6px', 'color:#45e0b5', 'color:inherit',
);
