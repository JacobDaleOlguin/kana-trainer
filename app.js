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

// Subtle fade-swap: fade element out, run update, fade back in.
function swapContent(el, update) {
  el.classList.add('swap');
  el.classList.add('leaving');
  setTimeout(() => {
    update();
    el.classList.remove('leaving');
    el.classList.add('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.remove('entering'));
    });
  }, 160);
}

// ---- View routing ----
const views = {
  menu: renderMenu,
  choose: renderChoose,
  listen: renderListen,
  typing: renderTyping,
  drawing: renderDrawing,
  phrase: renderPhrase,
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
      <div class="mode-card" data-go="choose">
        <div class="glyph">あ</div>
        <h2>Choose</h2>
        <p>See a sound, tap the symbol</p>
      </div>
      <div class="mode-card" data-go="listen">
        <div class="glyph">🔊</div>
        <h2>Listen</h2>
        <p>Hear it, tap what you heard</p>
      </div>
      <div class="mode-card" data-go="typing">
        <div class="glyph">か</div>
        <h2>Typing</h2>
        <p>See a symbol, type its sound</p>
      </div>
      <div class="mode-card" data-go="drawing">
        <div class="glyph">ka</div>
        <h2>Drawing</h2>
        <p>Hear a sound, draw the symbol</p>
      </div>
      <div class="mode-card" data-go="phrase">
        <div class="glyph">ねこ</div>
        <h2>Phrases</h2>
        <p>Drag kana to spell simple words</p>
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
    swapContent(glyph, () => {
      glyph.textContent = current.char;
      glyph.classList.remove('correct');
    });
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
      glyph.classList.add('correct');
      setTimeout(next, 320);
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
  ctx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--text').trim() || '#222';

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
    swapContent(prompt, () => {
      const r = current.romaji[0];
      const scriptTag = current.script === 'hiragana' ? 'hiragana' : 'katakana';
      prompt.querySelector('.label').textContent = `Draw the ${scriptTag} for`;
      prompt.querySelector('.romaji').textContent = r;
    });
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

// ---- Choose mode (multiple choice: see romaji, tap kana) ----
function renderChoose(root) {
  const state = { hiragana: true, katakana: true, includeDakuten: false };
  const NUM_CHOICES = 6;
  let queue = [], current = null, options = [];
  let correct = 0, seen = 0, wrongThisRound = false, locked = false;

  const panel = document.createElement('div');
  panel.className = 'panel';
  const settings = setsPanel(state, rebuild);
  panel.appendChild(settings);

  const prompt = document.createElement('div');
  prompt.className = 'draw-prompt';
  prompt.innerHTML = `<p class="label">Tap the symbol for</p><p class="romaji"></p>`;
  panel.appendChild(prompt);

  const choicesEl = document.createElement('div');
  choicesEl.className = 'choices';
  panel.appendChild(choicesEl);

  const feedback = document.createElement('div');
  feedback.className = 'feedback';
  panel.appendChild(feedback);

  root.appendChild(panel);

  function rebuild() {
    const all = getKanaSet(state);
    if (all.length < NUM_CHOICES) {
      queue = []; current = null;
      prompt.querySelector('.romaji').textContent = '—';
      choicesEl.innerHTML = '';
      feedback.textContent = 'Pick at least one set above.';
      return;
    }
    queue = shuffled(all);
    next();
  }

  function next() {
    if (queue.length === 0) queue = shuffled(getKanaSet(state));
    current = queue.shift();
    locked = false;
    wrongThisRound = false;
    feedback.textContent = '';
    feedback.className = 'feedback';

    const pool = getKanaSet(state)
      .filter(k => k.char !== current.char && k.script === current.script);
    const distractors = shuffled(pool).slice(0, NUM_CHOICES - 1);
    options = shuffled([current, ...distractors]);

    swapContent(prompt, () => {
      prompt.querySelector('.romaji').textContent = current.romaji[0];
    });
    seen++;
    updateScore(settings, correct, seen);
    renderChoices();
  }

  function renderChoices() {
    choicesEl.innerHTML = '';
    options.forEach(k => {
      const tile = document.createElement('button');
      tile.className = 'choice-tile';
      tile.type = 'button';
      tile.textContent = k.char;
      tile.addEventListener('click', () => choose(k, tile));
      choicesEl.appendChild(tile);
    });
  }

  function choose(k, tile) {
    if (locked) return;
    if (k.char === current.char) {
      tile.classList.add('correct');
      if (!wrongThisRound) correct++;
      updateScore(settings, correct, seen);
      playDing();
      locked = true;
      setTimeout(next, 550);
    } else {
      tile.classList.add('wrong');
      tile.disabled = true;
      wrongThisRound = true;
      playBuzz();
      feedback.className = 'feedback wrong';
      feedback.innerHTML = `That's <span class="guess">${k.char}</span> (${k.romaji[0]}). Try again.`;
    }
  }

  rebuild();
}

// ---- Listen mode (audio → tap kana) ----
function speakKana(char) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(char);
  u.lang = 'ja-JP';
  u.rate = 0.8;
  const voices = speechSynthesis.getVoices();
  const ja = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ja'));
  if (ja) u.voice = ja;
  speechSynthesis.speak(u);
}

// Voices may load asynchronously; warm them up.
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }
}

function renderListen(root) {
  const state = { hiragana: true, katakana: true, includeDakuten: false };
  const NUM_CHOICES = 6;
  let queue = [], current = null, options = [];
  let correct = 0, seen = 0, wrongThisRound = false, locked = false;

  const panel = document.createElement('div');
  panel.className = 'panel';
  const settings = setsPanel(state, rebuild);
  panel.appendChild(settings);

  // Audio prompt area
  const audioWrap = document.createElement('div');
  audioWrap.className = 'audio-prompt';
  audioWrap.innerHTML = `
    <button class="btn primary speak" type="button" title="Replay">
      <span class="speaker">▶</span> Play
    </button>
    <p class="label">Tap the kana you heard</p>
  `;
  panel.appendChild(audioWrap);

  const choicesEl = document.createElement('div');
  choicesEl.className = 'choices';
  panel.appendChild(choicesEl);

  const feedback = document.createElement('div');
  feedback.className = 'feedback';
  panel.appendChild(feedback);

  root.appendChild(panel);

  // Heads-up if Japanese voice not present
  if ('speechSynthesis' in window) {
    const checkVoices = () => {
      const v = speechSynthesis.getVoices();
      const hasJa = v.some(x => x.lang && x.lang.toLowerCase().startsWith('ja'));
      if (!hasJa && v.length > 0) {
        feedback.className = 'feedback';
        feedback.style.color = 'var(--text-faint)';
        feedback.textContent = 'Tip: install a Japanese voice for better pronunciation.';
      }
    };
    setTimeout(checkVoices, 400);
  } else {
    feedback.textContent = 'This browser does not support speech synthesis.';
  }

  audioWrap.querySelector('.speak').addEventListener('click', () => {
    if (current) speakKana(current.char);
  });

  function rebuild() {
    const all = getKanaSet(state);
    if (all.length < NUM_CHOICES) {
      queue = []; current = null;
      choicesEl.innerHTML = '';
      feedback.textContent = 'Pick at least one set above.';
      return;
    }
    queue = shuffled(all);
    next();
  }

  function next() {
    if (queue.length === 0) queue = shuffled(getKanaSet(state));
    current = queue.shift();
    locked = false;
    wrongThisRound = false;
    feedback.textContent = '';
    feedback.className = 'feedback';

    const pool = getKanaSet(state)
      .filter(k => k.char !== current.char && k.script === current.script);
    const distractors = shuffled(pool).slice(0, NUM_CHOICES - 1);
    options = shuffled([current, ...distractors]);

    seen++;
    updateScore(settings, correct, seen);
    renderChoices();
    // Play sound shortly after render so user is ready
    setTimeout(() => speakKana(current.char), 200);
  }

  function renderChoices() {
    choicesEl.innerHTML = '';
    options.forEach(k => {
      const tile = document.createElement('button');
      tile.className = 'choice-tile';
      tile.type = 'button';
      tile.textContent = k.char;
      tile.addEventListener('click', () => choose(k, tile));
      choicesEl.appendChild(tile);
    });
  }

  function choose(k, tile) {
    if (locked) return;
    if (k.char === current.char) {
      tile.classList.add('correct');
      if (!wrongThisRound) correct++;
      updateScore(settings, correct, seen);
      playDing();
      locked = true;
      setTimeout(next, 600);
    } else {
      tile.classList.add('wrong');
      tile.disabled = true;
      wrongThisRound = true;
      playBuzz();
      feedback.className = 'feedback wrong';
      feedback.innerHTML = `That's <span class="guess">${k.char}</span> (${k.romaji[0]}). Try again.`;
    }
  }

  rebuild();
}

// ---- Phrase mode ----
function renderPhrase(root) {
  let queue = [];
  let current = null;
  let slots = [];       // array of tile objects or null, length = current.kana.length
  let pool = [];        // array of tile objects available to drag
  let correct = 0;
  let seen = 0;
  let nextTileId = 0;
  let locked = false;

  const panel = document.createElement('div');
  panel.className = 'panel';

  const score = document.createElement('div');
  score.className = 'controls';
  score.innerHTML = `<span class="score" style="margin-left:0">Correct: <b data-role="correct">0</b> · Seen: <b data-role="seen">0</b></span>`;
  panel.appendChild(score);

  const prompt = document.createElement('div');
  prompt.className = 'draw-prompt';
  prompt.innerHTML = `<p class="label">Spell</p><p class="romaji"></p><p class="meaning"></p>`;
  panel.appendChild(prompt);

  const slotsEl = document.createElement('div');
  slotsEl.className = 'slots';
  panel.appendChild(slotsEl);

  const poolEl = document.createElement('div');
  poolEl.className = 'tile-pool';
  panel.appendChild(poolEl);

  const buttons = document.createElement('div');
  buttons.className = 'draw-buttons';
  buttons.innerHTML = `
    <button class="btn secondary" data-act="reset">Reset</button>
    <button class="btn secondary" data-act="skip">Skip</button>
  `;
  panel.appendChild(buttons);

  const feedback = document.createElement('div');
  feedback.className = 'feedback';
  panel.appendChild(feedback);

  root.appendChild(panel);

  function updateScore() {
    score.querySelector('[data-role="correct"]').textContent = correct;
    score.querySelector('[data-role="seen"]').textContent = seen;
  }

  buttons.addEventListener('click', e => {
    const act = e.target.dataset.act;
    if (act === 'skip') next();
    if (act === 'reset') resetTiles();
  });

  function pickDistractors(needed, count) {
    // Pull a few extra kana of the same script(s) as the answer.
    const scripts = new Set();
    for (const ch of needed) {
      if (/[぀-ゟ]/.test(ch)) scripts.add('hiragana');
      if (/[゠-ヿ]/.test(ch)) scripts.add('katakana');
    }
    const pool = getKanaSet({
      hiragana: scripts.has('hiragana'),
      katakana: scripts.has('katakana'),
      includeDakuten: true,
    });
    const seen = new Set(needed);
    const candidates = pool.map(k => k.char).filter(c => !seen.has(c));
    return shuffled(candidates).slice(0, count);
  }

  function next() {
    if (queue.length === 0) queue = shuffled(PHRASES);
    current = queue.shift();
    locked = false;
    feedback.textContent = '';
    feedback.className = 'feedback';

    swapContent(prompt, () => {
      prompt.querySelector('.romaji').textContent = current.romaji;
      prompt.querySelector('.meaning').textContent = current.meaning;
    });

    const chars = [...current.kana];
    slots = chars.map(() => null);
    const distractorCount = Math.min(4, Math.max(2, 6 - chars.length));
    const distractors = pickDistractors(chars, distractorCount);
    pool = shuffled([...chars, ...distractors]).map(ch => ({
      id: ++nextTileId,
      char: ch,
    }));

    seen++;
    updateScore();
    render();
  }

  function resetTiles() {
    if (!current) return;
    // Move any placed tiles back to pool.
    for (const t of slots) if (t) pool.push(t);
    slots = slots.map(() => null);
    locked = false;
    feedback.textContent = '';
    feedback.className = 'feedback';
    render();
  }

  function placeTile(tile, slotIndex) {
    if (locked) return;
    // Remove from pool
    const pi = pool.findIndex(t => t && t.id === tile.id);
    if (pi >= 0) pool.splice(pi, 1);
    // If slot occupied, kick existing tile back to pool
    if (slots[slotIndex]) pool.push(slots[slotIndex]);
    slots[slotIndex] = tile;
    render();
    maybeCheck();
  }

  function placeInFirstEmpty(tile) {
    const idx = slots.findIndex(s => s === null);
    if (idx >= 0) placeTile(tile, idx);
  }

  function unplaceTile(slotIndex) {
    if (locked) return;
    const tile = slots[slotIndex];
    if (!tile) return;
    slots[slotIndex] = null;
    pool.push(tile);
    feedback.textContent = '';
    feedback.className = 'feedback';
    render();
  }

  function maybeCheck() {
    if (slots.some(s => s === null)) return;
    locked = true;
    const guess = slots.map(s => s.char).join('');
    if (guess === current.kana) {
      correct++;
      updateScore();
      playDing();
      feedback.className = 'feedback correct';
      feedback.innerHTML = `✓ <span class="guess">${current.kana}</span> — ${current.romaji}`;
      setTimeout(next, 1100);
    } else {
      playBuzz();
      feedback.className = 'feedback wrong';
      feedback.innerHTML = `Not quite — wanted <span class="guess">${current.kana}</span>. Hit Reset to try again.`;
    }
  }

  function render() {
    // Slots
    slotsEl.innerHTML = '';
    slots.forEach((tile, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot' + (tile ? ' filled' : '');
      slot.dataset.index = i;
      if (tile) {
        slot.textContent = tile.char;
        slot.title = 'Click to return to pool';
        slot.addEventListener('click', () => unplaceTile(i));
      }
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drop-hover'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drop-hover'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drop-hover');
        const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const fromPool = pool.find(t => t.id === id);
        const fromSlot = slots.findIndex(t => t && t.id === id);
        if (fromPool) placeTile(fromPool, i);
        else if (fromSlot >= 0 && fromSlot !== i) {
          // swap slot positions
          const t = slots[fromSlot];
          slots[fromSlot] = null;
          placeTile(t, i);
        }
      });
      slotsEl.appendChild(slot);
    });

    // Pool
    poolEl.innerHTML = '';
    pool.forEach(tile => {
      const el = document.createElement('div');
      el.className = 'tile';
      el.textContent = tile.char;
      el.draggable = true;
      el.dataset.id = tile.id;
      el.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', String(tile.id));
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('click', () => placeInFirstEmpty(tile));
      poolEl.appendChild(el);
    });

    // Also allow dropping tiles back into the pool area
    poolEl.ondragover = e => e.preventDefault();
    poolEl.ondrop = e => {
      e.preventDefault();
      const id = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const idx = slots.findIndex(t => t && t.id === id);
      if (idx >= 0) unplaceTile(idx);
    };
  }

  next();
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
  // Leave bg transparent; only the glyph pixels get alpha. Recognizer uses
  // alpha-only ink detection so it's theme-agnostic.
  cx.fillStyle = 'black';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.font = `${Math.floor(REF_SIZE * 0.85)}px "Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif`;
  cx.fillText(char, REF_SIZE / 2, REF_SIZE / 2 + 2);
  const bin = binarize(cx.getImageData(0, 0, REF_SIZE, REF_SIZE));
  const bits = normalizeBits(bin, REF_SIZE);
  const dilated = dilate(bits, REF_SIZE, 5);
  let inkCount = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i]) inkCount++;
  const entry = { bits, dilated, inkCount };
  REF_CACHE.set(char, entry);
  return entry;
}

function binarize(imageData) {
  // Returns Uint8Array of 0/1 where 1 = ink. Alpha-only so light or dark
  // strokes on a transparent canvas both register as ink.
  const { data, width, height } = imageData;
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    out[i] = data[i * 4 + 3] > 60 ? 1 : 0;
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
  const userDilated = dilate(userBits, REF_SIZE, 5);
  let userInk = 0;
  for (let i = 0; i < userBits.length; i++) if (userBits[i]) userInk++;

  const scored = candidates.map(c => ({
    kana: c,
    score: scoreOne(userBits, userDilated, userInk, renderReference(c.char), REF_SIZE),
  }));
  scored.sort((a, b) => b.score - a.score);

  const targetEntry = scored.find(s => s.kana.char === target.char);
  const top = scored[0];
  const targetRank = scored.findIndex(s => s.kana.char === target.char);

  // Lenient: accept if target ranks in the top N AND clears a low absolute floor.
  // The floor rejects empty/scribbled canvases where everything scores near 0.
  const ABS_THRESHOLD = 0.28;
  const TOP_N = 3;
  const isMatch = targetEntry.score >= ABS_THRESHOLD && targetRank < TOP_N;

  return {
    isMatch,
    best: top.kana,
    bestScore: top.score,
    targetScore: targetEntry.score,
  };
}
