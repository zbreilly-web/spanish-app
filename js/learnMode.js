// js/learnMode.js

// ─────────────────────────────────────────────────────────────
// Speak persistence
// ─────────────────────────────────────────────────────────────
const SPEAK_KEY = 'learn_speech_on';
const getSavedSpeak = () => localStorage.getItem(SPEAK_KEY) === '1';
const saveSpeak = (on) => localStorage.setItem(SPEAK_KEY, on ? '1' : '0');

// ─────────────────────────────────────────────────────────────
// Learn engine (reusable by Word Bank)
// ─────────────────────────────────────────────────────────────
window.LearnCore = {
  mount(containerEl, items, opts = {}) {
    if (!containerEl) return;

    const mountId = (containerEl.__learnMountId = (containerEl.__learnMountId || 0) + 1);

    const state = {
      list: Array.isArray(items) ? items.slice() : [],
      idx: 0,
      showSpanish: true,
      speechOn: getSavedSpeak() || (window.TTS?.isEnabled?.() === true),
      __lastSpoken: null,
      __lastLang: null,
    };

    containerEl.innerHTML = `
      <div class="controls">
        ${opts.hideSelectors ? '' : `
          <select id="learnBookSelect"></select>
          <select id="learnChapterSelect"></select>
        `}
        <button id="learnStart"        type="button">Start</button>
        <button id="learnShuffle"      type="button">Shuffle</button>
        <button id="learnToggleLang"   type="button">Toggle Language</button>
        <button id="learnToggleSpeak"  type="button" class="btn-speak text-white px-3 py-1 rounded bg-blue-500">Toggle Speak</button>
      </div>
      <div id="learnArea">
        <h1 id="learnWordDisplay">Select a book and chapter to begin.</h1>
        <input id="learnInput" placeholder="Type your answer here" autocomplete="off">
        <button id="learnCheck" type="button">Check</button>
        <div id="learnResult"></div>
        <div class="post-check-buttons">
          <button id="learnNext" type="button" style="display:none">Next</button>
          <button id="learnKnow" type="button" style="display:none">I Know This</button>
        </div>
      </div>
    `;

    const $ = (id) => containerEl.querySelector('#' + id);
    const shuffleList = () => state.list.sort(() => Math.random() - 0.5);
    const pair = () => state.list[state.idx] || null;

    function paintSpeakButton() {
      const t = $('learnToggleSpeak');
      if (!t) return;
      t.classList.toggle('bg-green-500', state.speechOn);
      t.classList.toggle('bg-blue-500', !state.speechOn);
      const color = state.speechOn ? '#22c55e' : '#3b82f6';
      t.style.setProperty('background-color', color, 'important');
    }

    function resetUI() {
      const wd = $('learnWordDisplay');
      const inp = $('learnInput');
      const res = $('learnResult');
      const next = $('learnNext');
      const know = $('learnKnow');

      if (wd) wd.textContent = 'Select a book and chapter to begin.';
      if (inp) inp.value = '';
      if (res) res.textContent = '';
      if (next) next.style.display = 'none';
      if (know) know.style.display = 'none';
      const chk = $('learnCheck'); if (chk) chk.disabled = false;
      paintSpeakButton();
    }

    function showWord() {
      if (containerEl.__learnMountId !== mountId) return;

      const wd = $('learnWordDisplay');
      const inp = $('learnInput');
      const res = $('learnResult');
      const next = $('learnNext');
      const know = $('learnKnow');

      const p = pair();
      if (!p) {
        if (wd) wd.textContent = "🎉 You're done!";
        if (inp) inp.value = '';
        if (res) res.textContent = '';
        if (next) next.style.display = 'none';
        if (know) know.style.display = 'none';
        return;
      }

      const txt = state.showSpanish ? p.spanish : p.english;
      if (wd) wd.textContent = txt;

      window.setCurrentSpanish?.(p.spanish);
      window.currentSpanishWord = p.spanish;

      if (state.speechOn && window.TTS) {
        const lang = state.showSpanish ? 'es' : 'en';
        if (state.__lastSpoken !== txt || state.__lastLang !== lang) {
          state.__lastSpoken = txt;
          state.__lastLang = lang;
          state.showSpanish ? TTS.speakSpanish(p.spanish) : TTS.speakEnglish(p.english);
        }
      }

      if (inp && document.activeElement !== inp) inp.value = '';
      if (res) res.textContent = '';
      const chk = $('learnCheck'); if (chk) chk.disabled = false;
      if (next) next.style.display = 'none';
      if (know) know.style.display = 'none';
    }

    async function markKnown() {
      const p = pair();
      if (!p) return;
      const known = new Set(window.ProgressStore?.loadKnown() || []);
      if (!known.has(p.spanish)) {
        known.add(p.spanish);
        window.ProgressStore?.saveKnown([...known]);
        try { await window.saveProgress?.(); } catch {}
        window.dispatchEvent(new Event('knownWordsChanged'));
      }
      state.idx++;
      showWord();
    }

    function checkAnswer() {
      const p = pair();
      if (!p) return;

      const inp = $('learnInput');
      const res = $('learnResult');
      const next = $('learnNext');
      const know = $('learnKnow');
      const chk  = $('learnCheck');

      const act = (inp?.value || '').toLowerCase().trim();
      const exp = (state.showSpanish ? p.english : p.spanish).toLowerCase().trim();
      if (!act) { if (res) res.textContent = 'Please enter an answer.'; return; }

      if (act === exp) {
        if (res) res.textContent = '✅ Correct!';
        if (chk) chk.disabled = true;
        if (next) next.style.display = 'inline-block';
        if (know) know.style.display = 'inline-block';
      } else {
        if (res) res.innerHTML = `❌ Incorrect. Answer: ${exp}<br><small>Input correct answer and press check to advance</small>`;
      }
    }

    if (window.TTS?.setEnabled) window.TTS.setEnabled(state.speechOn);
    paintSpeakButton();

    containerEl.onclick = (e) => {
      const tgt = e.target;
      if (!(tgt instanceof HTMLElement)) return;
      if (tgt.tagName === 'BUTTON') { e.preventDefault(); e.stopPropagation(); }

      switch (tgt.id) {
        case 'learnStart': {
          if (!state.list.length) {
            const r = $('learnResult'); if (r) r.textContent = 'No words available for this selection.';
            return;
          }
          shuffleList();
          state.idx = 0;
          state.__lastSpoken = null; // allow speak once
          showWord();
          break;
        }
        case 'learnShuffle': {
          shuffleList(); state.idx = 0; state.__lastSpoken = null; showWord();
          break;
        }
        case 'learnToggleLang': {
          if (!state.list.length) return;
          state.showSpanish = !state.showSpanish;
          state.__lastSpoken = null;
          showWord();
          break;
        }
        case 'learnToggleSpeak': {
          state.speechOn = !state.speechOn;
          saveSpeak(state.speechOn);
          if (window.TTS?.setEnabled) window.TTS.setEnabled(state.speechOn);
          paintSpeakButton();
          const p = pair();
          if (state.speechOn && p) {
            state.__lastSpoken = null;
            state.showSpanish ? TTS.speakSpanish(p.spanish) : TTS.speakEnglish(p.english);
          } else {
            TTS?.cancel?.();
          }
          break;
        }
        case 'learnCheck': { checkAnswer(); break; }
        case 'learnNext': { state.idx++; showWord(); break; }
        case 'learnKnow': { markKnown(); break; }
      }
    };

    containerEl.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target && e.target.id === 'learnInput') {
        e.preventDefault();
        e.stopPropagation();
        checkAnswer();
      }
    };

    containerEl.__learn = { state, showWord, paintSpeakButton };

    resetUI();
    const p0 = pair();
    if (state.speechOn && p0) {
      state.__lastSpoken = null;
      state.showSpanish ? TTS.speakSpanish(p0.spanish) : TTS.speakEnglish(p0.english);
    }
  },

  updateItems(containerEl, items) {
    const ctx = containerEl.__learn;
    if (!ctx) return window.LearnCore.mount(containerEl, items, { hideSelectors: true });

    const oldList = ctx.state.list;
    const newList = Array.isArray(items) ? items.slice() : [];

    // shallow structural equality (prevents no-op rerenders)
    let equal = oldList.length === newList.length;
    if (equal) {
      for (let i = 0; i < oldList.length; i++) {
        if (oldList[i].spanish !== newList[i].spanish || oldList[i].english !== newList[i].english) {
          equal = false; break;
        }
      }
    }
    if (equal) return;

    const currentSpanish = oldList[ctx.state.idx]?.spanish;
    ctx.state.list = newList;

    const keepIdx = currentSpanish ? newList.findIndex(x => x.spanish === currentSpanish) : -1;
    if (keepIdx >= 0) {
      ctx.state.idx = keepIdx;
      // same word still on screen → do not wipe the input or re-speak
      return;
    } else {
      ctx.state.idx = Math.min(ctx.state.idx, Math.max(0, newList.length - 1));
      ctx.state.__lastSpoken = null;
      ctx.showWord();
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Default Learn Mode screen (drives from words.json, excluding known)
// ─────────────────────────────────────────────────────────────
window.initLearnMode = function () {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  function buildItems(wordData, book, chap) {
    const known = window.ProgressStore?.loadKnown() || [];
    return (wordData || [])
      .filter(w => w.Book === book && String(w.Chapter) === String(chap) && !known.includes(w.Spanish))
      .map(w => ({ spanish: w.Spanish, english: w.English }));
  }

  function populateSelectors(data) {
    const books = [...new Set((data || []).map(w => w.Book))];
    const bSel = document.createElement('select'); bSel.id = 'learnBookSelect';
    const cSel = document.createElement('select'); cSel.id = 'learnChapterSelect';
    bSel.innerHTML = '<option value="">Select book</option>';
    cSel.innerHTML = '<option value="">Select chapter</option>';
    books.forEach(book => {
      const o = document.createElement('option'); o.value = book; o.textContent = book; bSel.appendChild(o);
    });
    bSel.onchange = () => {
      cSel.innerHTML = '<option value="">Select chapter</option>';
      const chapters = [...new Set(data.filter(w => w.Book === bSel.value).map(w => w.Chapter))];
      chapters.forEach(ch => { const o = document.createElement('option'); o.value = ch; o.textContent = `Chapter ${ch}`; cSel.appendChild(o); });
    };
    return { bSel, cSel };
  }

  function mountWith(wordData) {
    container.innerHTML = '';
    const controlsHost = document.createElement('div');
    container.appendChild(controlsHost);

    const { bSel, cSel } = populateSelectors(wordData);
    controlsHost.appendChild(bSel);
    controlsHost.appendChild(cSel);

    const learnHost = document.createElement('div');
    container.appendChild(learnHost);

    window.LearnCore.mount(learnHost, [], { hideSelectors: true });

    let refreshing = false;
    let pending = false;
    let authBurstTimer = null;

    async function doRefresh() {
      if (refreshing) { pending = true; return; }

      const active = document.activeElement;
      if (active && active.id === 'learnInput') {
        pending = true;
        setTimeout(doRefresh, 150);
        return;
      }

      refreshing = true;
      try {
        const b = bSel.value, c = cSel.value;
        if (!b || !c) return;
        window.setAppContext?.(b, c);
        try { await window.ProgressStore?.refreshFromCloud(b, c); } catch {}
        const items = buildItems(wordData, b, c);
        window.LearnCore.updateItems(learnHost, items);
      } finally {
        refreshing = false;
        if (pending) { pending = false; setTimeout(doRefresh, 0); }
      }
    }

    const refreshForSelection = () => {
      clearTimeout(container.__learnDebounceTimer);
      container.__learnDebounceTimer = setTimeout(doRefresh, 200);
    };

    bSel.addEventListener('change', refreshForSelection);
    cSel.addEventListener('change', refreshForSelection);

    if (container.__authHandler) window.removeEventListener('authChanged', container.__authHandler);
    if (container.__cloudHandler) window.removeEventListener('cloudProgressUpdated', container.__cloudHandler);

    container.__authHandler = () => {
      clearTimeout(authBurstTimer);
      authBurstTimer = setTimeout(refreshForSelection, 400);
    };
    container.__cloudHandler = (ev) => {
      const { bookId, chapterId } = ev?.detail || {};
      if (bookId === bSel.value && String(chapterId) === String(cSel.value)) refreshForSelection();
    };

    window.addEventListener('authChanged', container.__authHandler);
    window.addEventListener('cloudProgressUpdated', container.__cloudHandler);
  }

  if (!window.wordData) {
    fetch('words.json')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => { window.wordData = data; mountWith(data); })
      .catch(() => { container.innerHTML = '<p style="color:red;">Failed to load word data.</p>'; });
  } else {
    mountWith(window.wordData);
  }
};
