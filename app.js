// ---- Audio (WebAudio generated, no asset files) ----
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playDing() {
  const ctx = getAudio();
  const now = ctx.currentTime;
  // Pleasant two-note chime (E6 + B6)
  [1318.51, 1975.53].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.04);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.04 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.04);
    osc.stop(now + i * 0.04 + 0.4);
  });
}

function playBuzz() {
  const ctx = getAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

// ---- Shuffle / pick utilities ----
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- View routing ----
const views = {
  menu: renderMenu,
  typing: renderTyping,
  drawing: renderDrawing,
};

function go(view) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  document.querySelectorAll('header nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  views[view](main);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('header nav button').forEach(b => {
    b.addEventListener('click', () => go(b.dataset.view));
  });
  go('menu');
});

// ---- Menu view ----
function renderMenu(root) {
  root.innerHTML = `
    <div class="mode-grid">
      <div class="mode-card" data-go="typing">
        <div class="glyph">あ</div>
        <h2>Typing mode</h2>
        <p>See a symbol, type its sound</p>
      </div>
      <div class="mode-card" data-go="drawing">
        <div class="glyph">ka</div>
        <h2>Drawing mode</h2>
        <p>Hear a sound, draw the symbol</p>
      </div>
    </div>
  `;
  root.querySelectorAll('.mode-card').forEach(c => {
    c.addEventListener('click', () => go(c.dataset.go));
  });
}

// ---- Shared kana-set settings panel ----
function setsPanel(state, onChange) {
  const panel = document.createElement('div');
  panel.className = 'controls';
  panel.innerHTML = `
    <label><input type="checkbox" data-k="hiragana" ${state.hiragana ? 'checked' : ''}> Hiragana</label>
    <label><input type="checkbox" data-k="katakana" ${state.katakana ? 'checked' : ''}> Katakana</label>
    <label><input type="checkbox" data-k="includeDakuten" ${state.includeDakuten ? 'checked' : ''}> Dakuten / handakuten</label>
    <span class="score">Correct: <b data-role="correct">0</b> · Seen: <b data-role="seen">0</b></span>
  `;
  panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      state[cb.dataset.k] = cb.checked;
      onChange();
    });
  });
  return panel;
}

function updateScore(panel, correct, seen) {
  panel.querySelector('[data-role="correct"]').textContent = correct;
  panel.querySelector('[data-role="seen"]').textContent = seen;
}

// ---- Typing mode ----
function renderTyping(root) {
  const state = { hiragana: true, katakana: true, includeDakuten: false };
  let queue = [];
  let current = null;
  let correct = 0;
  let seen = 0;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const settings = setsPanel(state, rebuildQueue);
  panel.appendChild(settings);

  const glyph = document.createElement('div');
  glyph.className = 'glyph-display';
  panel.appendChild(glyph);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'typing-input';
  input.placeholder = 'type the sound...';
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  panel.appendChild(input);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Auto-advances when you get it right.';
  panel.appendChild(hint);

  root.appendChild(panel);

  function rebuildQueue() {
    const all = getKanaSet(state);
    if (all.length === 0) {
      queue = [];
      current = null;
      glyph.textContent = '—';
      input.disabled = true;
      hint.textContent = 'Pick at least one set above.';
      return;
    }
    input.disabled = false;
    queue = shuffled(all);
    next();
  }

  function next() {
    if (queue.length === 0) queue = shuffled(getKanaSet(state));
    current = queue.shift();
    glyph.textContent = current.char;
    input.value = '';
    input.classList.remove('wrong');
    seen++;
    updateScore(settings, correct, seen);
    input.focus();
  }

  let wrongTimer = null;
  input.addEventListener('input', () => {
    if (!current) return;
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    const accepted = current.romaji;
    if (accepted.includes(val)) {
      correct++;
      updateScore(settings, correct, seen);
      playDing();
      glyph.classList.add('flash');
      setTimeout(() => glyph.classList.remove('flash'), 180);
      setTimeout(next, 250);
      return;
    }
    // If user typed more chars than any accepted prefix → mark wrong
    const stillPossible = accepted.some(r => r.startsWith(val));
    if (!stillPossible) {
      input.classList.add('wrong');
      hint.textContent = `${current.char} = ${current.romaji[0]}`;
      clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => {
        input.classList.remove('wrong');
        hint.textContent = 'Auto-advances when you get it right.';
        input.value = '';
      }, 900);
    }
  });

  rebuildQueue();
}

// ---- Drawing mode ----
function renderDrawing(root) {
  const state = { hiragana: true, katakana: true, includeDakuten: false };
  let queue = [];
  let current = null;
  let correct = 0;
  let seen = 0;
  let strokes = []; // array of strokes; each stroke is array of {x,y}
  let drawing = false;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const settings = setsPanel(state, rebuildQueue);
  panel.appendChild(settings);

  const prompt = document.createElement('div');
  prompt.className = 'draw-prompt';
  prompt.innerHTML = `<p class="label">Draw the symbol for</p><p class="romaji"></p>`;
  panel.appendChild(prompt);

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.id = 'drawCanvas';
  canvas.width = 320;
  canvas.height = 320;
  canvasWrap.appendChild(canvas);
  panel.appendChild(canvasWrap);

  const buttons = document.createElement('div');
  buttons.className = 'draw-buttons';
  buttons.innerHTML = `
    <button class="btn secondary" data-act="clear">Clear</button>
    <button class="btn primary" data-act="check">Check ↵</button>
    <button class="btn secondary" data-act="skip">Skip</button>
  `;
  panel.appendChild(buttons);

  const feedback = document.createElement('div');
  feedback.className = 'feedback';
  panel.appendChild(feedback);

  root.appendChild(panel);

  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#222';

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    feedback.textContent = '';
    feedback.className = 'feedback';
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function startStroke(e) {
    e.preventDefault();
    drawing = true;
    const p = pos(e);
    strokes.push([p]);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function moveStroke(e) {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    strokes[strokes.length - 1].push(p);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function endStroke(e) {
    if (!drawing) return;
    drawing = false;
  }

  canvas.addEventListener('mousedown', startStroke);
  canvas.addEventListener('mousemove', moveStroke);
  window.addEventListener('mouseup', endStroke);
  canvas.addEventListener('touchstart', startStroke);
  canvas.addEventListener('touchmove', moveStroke);
  canvas.addEventListener('touchend', endStroke);

  buttons.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'clear') clearCanvas();
    if (act === 'skip') next();
    if (act === 'check') check();
  });

  document.addEventListener('keydown', onKey);
  function onKey(e) {
    // Only react if drawing panel is current view
    if (!document.body.contains(canvas)) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Enter') check();
  }

  function rebuildQueue() {
    const all = getKanaSet(state);
    if (all.length === 0) {
      queue = [];
      current = null;
      prompt.querySelector('.romaji').textContent = '—';
      feedback.textContent = 'Pick at least one set above.';
      return;
    }
    queue = shuffled(all);
    next();
  }

  function next() {
    if (queue.length === 0) queue = shuffled(getKanaSet(state));
    current = queue.shift();
    clearCanvas();
    const r = current.romaji[0];
    const scriptTag = current.script === 'hiragana' ? 'hiragana' : 'katakana';
    prompt.querySelector('.label').textContent = `Draw the ${scriptTag} for`;
    prompt.querySelector('.romaji').textContent = r;
    seen++;
    updateScore(settings, correct, seen);
  }

  function check() {
    if (!current || strokes.length === 0) return;
    const candidates = getKanaSet(state);
    const result = recognize(canvas, current, candidates);
    if (result.isMatch) {
      correct++;
      updateScore(settings, correct, seen);
      playDing();
      feedback.className = 'feedback correct';
      feedback.innerHTML = `✓ Yes — <span class="guess">${current.char}</span>`;
      setTimeout(next, 800);
    } else {
      playBuzz();
      feedback.className = 'feedback wrong';
      const bestStr = result.best
        ? ` looks more like <span class="guess">${result.best.char}</span> (${result.best.romaji[0]})`
        : '';
      feedback.innerHTML = `Not quite — wanted <span class="guess">${current.char}</span> (${current.romaji[0]}).${bestStr}`;
    }
  }

  rebuildQueue();
}

// ---- Recognition: render glyph + pixel-overlap compare ----
// Caches rendered reference bitmaps per character.
const REF_CACHE = new Map();
const REF_SIZE = 64;

function renderReference(char) {
  if (REF_CACHE.has(char)) return REF_CACHE.get(char);
  const c = document.createElement('canvas');
  c.width = REF_SIZE;
  c.height = REF_SIZE;
  const cx = c.getContext('2d');
  cx.fillStyle = 'white';
  cx.fillRect(0, 0, REF_SIZE, REF_SIZE);
  cx.fillStyle = 'black';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.font = `${Math.floor(REF_SIZE * 0.85)}px "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif`;
  cx.fillText(char, REF_SIZE / 2, REF_SIZE / 2 + 2);
  const bin = binarize(cx.getImageData(0, 0, REF_SIZE, REF_SIZE));
  const bits = normalizeBits(bin, REF_SIZE);
  const dilated = dilate(bits, REF_SIZE, 3);
  let inkCount = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i]) inkCount++;
  const entry = { bits, dilated, inkCount };
  REF_CACHE.set(char, entry);
  return entry;
}

function binarize(imageData) {
  // Returns Uint8Array of 0/1 where 1 = ink
  const { data, width, height } = imageData;
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], a = data[i * 4 + 3];
    // ink = dark and visible
    const luma = (r + g + b) / 3;
    out[i] = (a > 50 && luma < 180) ? 1 : 0;
  }
  return { bits: out, width, height };
}

function boundingBox({ bits, width, height }) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bits[y * width + x]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

// Crop to bounding box and resize (aspect preserved, centered) into a target×target grid.
// Source-driven mapping so no ink pixels are dropped during downsampling.
function normalizeBits({ bits, width, height }, target) {
  const bb = boundingBox({ bits, width, height });
  const out = new Uint8Array(target * target);
  if (!bb) return out;
  const bw = bb.maxX - bb.minX + 1;
  const bh = bb.maxY - bb.minY + 1;
  const scale = (target * 0.85) / Math.max(bw, bh);
  const newW = Math.round(bw * scale);
  const newH = Math.round(bh * scale);
  const offX = Math.floor((target - newW) / 2);
  const offY = Math.floor((target - newH) / 2);
  for (let sy = bb.minY; sy <= bb.maxY; sy++) {
    for (let sx = bb.minX; sx <= bb.maxX; sx++) {
      if (!bits[sy * width + sx]) continue;
      const dx = Math.floor((sx - bb.minX) * scale) + offX;
      const dy = Math.floor((sy - bb.minY) * scale) + offY;
      if (dx >= 0 && dx < target && dy >= 0 && dy < target) {
        out[dy * target + dx] = 1;
      }
    }
  }
  return out;
}

// Dilate to make comparison stroke-width tolerant.
function dilate(arr, size, radius = 2) {
  const out = new Uint8Array(arr.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!arr[y * size + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            out[ny * size + nx] = 1;
          }
        }
      }
    }
  }
  return out;
}

function scoreOne(userBits, userDilated, userInk, ref, size) {
  if (userInk === 0 || ref.inkCount === 0) return 0;
  let userInRef = 0, refInUser = 0;
  for (let i = 0; i < size * size; i++) {
    if (userBits[i] && ref.dilated[i]) userInRef++;
    if (ref.bits[i] && userDilated[i]) refInUser++;
  }
  const precision = userInRef / userInk;
  const recall = refInUser / ref.inkCount;
  return (2 * precision * recall) / (precision + recall + 1e-6);
}

function recognize(userCanvas, target, candidates) {
  const cx = userCanvas.getContext('2d');
  const raw = binarize(cx.getImageData(0, 0, userCanvas.width, userCanvas.height));
  const userBits = normalizeBits(raw, REF_SIZE);
  const userDilated = dilate(userBits, REF_SIZE, 3);
  let userInk = 0;
  for (let i = 0; i < userBits.length; i++) if (userBits[i]) userInk++;

  const scored = candidates.map(c => ({
    kana: c,
    score: scoreOne(userBits, userDilated, userInk, renderReference(c.char), REF_SIZE),
  }));
  scored.sort((a, b) => b.score - a.score);

  const targetEntry = scored.find(s => s.kana.char === target.char);
  const top = scored[0];

  // Match if target is top OR within a small margin of top AND above absolute threshold.
  const ABS_THRESHOLD = 0.40;
  const MARGIN = 0.04;
  const isMatch =
    targetEntry.score >= ABS_THRESHOLD &&
    (top.kana.char === target.char || (top.score - targetEntry.score) <= MARGIN);

  return {
    isMatch,
    best: top.kana,
    bestScore: top.score,
    targetScore: targetEntry.score,
  };
}
