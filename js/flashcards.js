// js/flashcards.js
let flashcardsInitialized = false;

function initFlashcards() {
  const _bookSelect    = document.getElementById("bookSelect");
  const _chapterSelect = document.getElementById("chapterSelect");
  const _startButton   = document.getElementById("startButton");
  _bookSelect.value = "";
  _chapterSelect.innerHTML = "<option value=\"\">Select chapter</option>";
  _startButton.disabled = true;

  if (flashcardsInitialized) return;
  flashcardsInitialized = true;

  // —— DOM refs —— 
  const bookSelect         = _bookSelect;
  const chapterSelect      = _chapterSelect;
  const startButton        = _startButton;
  const shuffleButton      = document.getElementById("shuffleButton");
  const prevButton         = document.getElementById("backButton");
  const nextButton         = document.getElementById("nextButton");
  const knowButton         = document.getElementById("knowButton");
  const speakButton        = document.getElementById("speakButton");
  const autoStartButton    = document.getElementById("autoplayStartButton");
  const autoStopButton     = document.getElementById("autoplayStopButton");
  const spanishWord        = document.getElementById("spanishWord");
  const englishTranslation = document.getElementById("englishTranslation");
  const card               = document.getElementById("card");
  const bankPanel          = document.getElementById("wordBankPanel");
  const bankList           = document.getElementById("wordBank");
  const toggleBank         = document.getElementById("toggleBank");
  const progressSummary    = document.getElementById("progressSummary");

  // —— State —— 
  let wordData      = [];
  let filteredWords = [];
  let currentIndex  = 0;
  let knownWords    = (window.ProgressStore?.loadKnown() || []);
  let history       = [];
  let autoplayTimer = null;
  let isAutoplaying = false;

  function advance(delta = 1) {
    if (!filteredWords.length) return;
    currentIndex = (currentIndex + delta + filteredWords.length) % filteredWords.length;
  }

  function resetSession() {
    TTS.cancel();
    clearTimeout(autoplayTimer);
    isAutoplaying = false;
    autoStartButton.classList.remove("active");
    autoStopButton.classList.add("hidden");
    filteredWords = [];
    currentIndex = 0;
    history = [];
    card.classList.add("hidden");
  }
  window.teardownFlashcards = resetSession;

  // —— Load word data —— 
  fetch("words.json")
    .then(r => r.json())
    .then(data => {
      wordData = data;
      window.wordData = window.wordData || data;
      initDropdowns();
      renderProgress();
      renderWordBank();
    })
    .catch(e => alert("Error loading data: " + e));

  // —— Initialize dropdowns —— 
  function initDropdowns() {
    const books = [...new Set(wordData.map(w => w.Book))];
    bookSelect.innerHTML = "<option value=\"\">Select book</option>";
    books.forEach(b => {
      const o = document.createElement("option");
      o.value = b; o.textContent = b;
      bookSelect.appendChild(o);
    });
    chapterSelect.innerHTML = "<option value=\"\">Select chapter</option>";
    startButton.disabled = true;

    async function updateContextFromDropdowns() {
      const b = bookSelect?.value || "defaultBook";
      const c = chapterSelect?.value || "defaultChapter";
      window.setAppContext?.(b, c);
      window.currentBookId = b;
      window.currentChapterId = c;
      if (b && c) {
        try { await window.ProgressStore?.refreshFromCloud(b, c); } catch {}
        knownWords = window.ProgressStore?.loadKnown() || [];
        renderProgress();
        renderWordBank();
      }
    }

    bookSelect.addEventListener("change", async () => {
      resetSession();
      const chaps = [...new Set(
        wordData.filter(w => w.Book === bookSelect.value).map(w => w.Chapter)
      )];
      chapterSelect.innerHTML = "<option value=\"\">Select chapter</option>";
      chaps.forEach(c => {
        const o = document.createElement("option");
        o.value = c; o.textContent = `Chapter ${c}`;
        chapterSelect.appendChild(o);
      });
      await updateContextFromDropdowns();
      startButton.disabled = !(bookSelect.value && chapterSelect.value);
    });

    chapterSelect.addEventListener("change", async () => {
      resetSession();
      await updateContextFromDropdowns();
      startButton.disabled = !(bookSelect.value && chapterSelect.value);
    });
  }

  // —— Progress summary —— 
  function renderProgress() {
    if (!bookSelect.value || !chapterSelect.value) {
      progressSummary.textContent = "";
      return;
    }
    const rel = wordData.filter(w =>
      w.Book === bookSelect.value &&
      String(w.Chapter) === chapterSelect.value
    );
    const kc = rel.filter(w => (window.ProgressStore?.loadKnown() || []).includes(w.Spanish)).length;
    const pct = rel.length ? Math.round((kc / rel.length) * 100) : 0;
    progressSummary.innerHTML = `Book/Chapter Progress: ${pct}%`;
  }

  // —— Start session —— 
  startButton.addEventListener("click", async () => {
    resetSession();
    const book = bookSelect.value;
    const chap = chapterSelect.value;

    window.setAppContext?.(book, chap);
    try { await window.ProgressStore?.refreshFromCloud(book, chap); } catch {}
    knownWords = window.ProgressStore?.loadKnown() || [];

    filteredWords = wordData
      .filter(w =>
        w.Book === book &&
        String(w.Chapter) === chap &&
        !knownWords.includes(w.Spanish)
      )
      .sort((a, b) => a.Spanish.localeCompare(b.Spanish));

    currentIndex = window.ProgressStore?.loadLastIndex(book, chap) || 0;
    showCard();
  });

   function showCard() {
  if (!filteredWords.length) { card.classList.add("hidden"); return; }
  const w = filteredWords[currentIndex];

  spanishWord.textContent = w.Spanish;
  englishTranslation.textContent = w.English;

  window.setCurrentSpanish?.(w.Spanish);
  window.currentSpanishWord = w.Spanish;

  card.classList.remove("hidden");
  window.ProgressStore?.saveLastIndex(bookSelect.value, chapterSelect.value, currentIndex);

  // Speak on every render if enabled and NOT in autoplay
  if (TTS?.isEnabled() && !isAutoplaying) {
    TTS.speakSeq(w.Spanish, w.English);
  }
}

  function playSequence(w, onDone) {
    TTS.speakSeq(w.Spanish, w.English, onDone);
  }

  // —— Toggle speak —— 
  speakButton.addEventListener("click", () => {
    const now = !TTS.isEnabled();
    TTS.setEnabled(now);
    speakButton.classList.toggle("active", now);
    if (now && filteredWords.length) {
      playSequence(filteredWords[currentIndex]);
    } else {
      TTS.cancel();
    }
  });

  // —— Next & Previous —— 
  nextButton.textContent = "Next";
  prevButton.textContent = "Previous";

  nextButton.addEventListener("click", gotoNext);

  prevButton.addEventListener("click", () => {
    if (!history.length) return;
    TTS.cancel();
    clearTimeout(autoplayTimer);
    currentIndex = history.pop();
    if (isAutoplaying) autoplayNext(); else showCard();
  });

  // —— Shuffle —— 
  shuffleButton.addEventListener("click", () => {
    for (let i = filteredWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [filteredWords[i], filteredWords[j]] = [filteredWords[j], filteredWords[i]];
    }
    currentIndex = 0; showCard();
  });

  // —— “I Know This” —— 
  knowButton.addEventListener("click", async () => {
    if (!filteredWords.length) return;
    TTS.cancel(); clearTimeout(autoplayTimer);
    const w = filteredWords[currentIndex];

    const known = new Set(window.ProgressStore?.loadKnown() || []);
    if (!known.has(w.Spanish)) {
      known.add(w.Spanish);
      window.ProgressStore?.saveKnown([...known]);
      try { await window.saveProgress?.(); } catch {}
      window.dispatchEvent(new Event('knownWordsChanged'));
    }

    filteredWords.splice(currentIndex, 1);
    if (currentIndex >= filteredWords.length) currentIndex = 0;
    renderProgress();
    renderWordBank();
    if (isAutoplaying && filteredWords.length) autoplayNext(); else showCard();
  });

  // —— Autoplay —— 
  autoStartButton.addEventListener("click", () => {
    TTS.setEnabled(true);
    TTS.cancel();
    clearTimeout(autoplayTimer);
    isAutoplaying = true;
    autoStartButton.classList.add("active");
    autoStopButton.classList.remove("hidden");
    autoplayNext();
  });

  autoStopButton.addEventListener("click", () => {
    clearTimeout(autoplayTimer);
    TTS.cancel();
    isAutoplaying = false;
    autoStartButton.classList.remove("active");
    autoStopButton.classList.add("hidden");
  });

function gotoNext() {
  TTS.cancel();
  clearTimeout(autoplayTimer);
  if (!filteredWords.length) return;

  history.push(currentIndex);
  advance(1);
  showCard();

  if (isAutoplaying) {
    const delay = (TTS.getConfig?.().cardGapMs ?? 500);
    autoplayTimer = setTimeout(() => autoplayNext(), delay);
  }
}

function autoplayNext() {
  if (!filteredWords.length) { autoStopButton.click(); return; }

  // Always render the card first
  showCard();

  const w = filteredWords[currentIndex];
  TTS.speakSeq(w.Spanish, w.English, () => {
    const delay = (TTS.getConfig?.().cardGapMs ?? 500);
    autoplayTimer = setTimeout(() => gotoNext(), delay);
  });
}


  // —— Inline chapter Word Bank —— 
  toggleBank.addEventListener("click", () => {
    bankPanel.classList.toggle("hidden");
    renderWordBank();
  });

  function renderWordBank() {
    bankList.innerHTML = "";
    const book = bookSelect.value;
    const list = wordData
      .filter(w => w.Book === book && (window.ProgressStore?.loadKnown() || []).includes(w.Spanish))
      .map(w => w.Spanish);
    const unique = [...new Set(list)].sort((a, b) => a.localeCompare(b));
    if (!unique.length) {
      const li = document.createElement("li");
      li.className = "text-gray-500";
      li.textContent = "No words learned yet in this book.";
      bankList.appendChild(li);
    } else {
      bankPanel.classList.add("max-h-64", "overflow-y-auto");
      unique.forEach(word => {
        const li = document.createElement("li");
        li.className = "flex items-center justify-between bg-white p-2 h-10 rounded shadow";
        const s = document.createElement("span");
        s.className = "truncate"; s.textContent = word;
        const b = document.createElement("button");
        b.textContent = "Unlearn";
        b.className = "ml-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 active:bg-green-400";
        b.onclick = () => {
          const known = new Set(window.ProgressStore?.loadKnown() || []);
          known.delete(word);
          window.ProgressStore?.saveKnown([...known]);
          window.dispatchEvent(new Event('knownWordsChanged'));
          renderProgress(); renderWordBank();
          // re-filter current session
          filteredWords = filteredWords.filter(x => x.Spanish !== word);
          if (!filteredWords.length) card.classList.add("hidden");
        };
        li.appendChild(s); li.appendChild(b);
        bankList.appendChild(li);
      });
    }
  }

  // —— React to cloud / auth / known changes —— 
  window.addEventListener("cloudProgressUpdated", () => {
    knownWords = window.ProgressStore?.loadKnown() || [];
    if (bookSelect.value && chapterSelect.value && wordData.length) {
      filteredWords = wordData
        .filter(w =>
          w.Book === bookSelect.value &&
          String(w.Chapter) === chapterSelect.value &&
          !(window.ProgressStore?.loadKnown() || []).includes(w.Spanish)
        )
        .sort((a, b) => a.Spanish.localeCompare(b.Spanish));
      renderProgress();
      renderWordBank();
      if (filteredWords.length) showCard(); else card.classList.add("hidden");
    }
  });

  window.addEventListener("authChanged", () => {
    renderProgress(); renderWordBank();
  });

  window.addEventListener("knownWordsChanged", () => {
    renderProgress(); renderWordBank();
  });
}

window.initFlashcards = initFlashcards;
