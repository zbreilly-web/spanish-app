// js/wordBank.js
function initWordBank() {
  const screen = document.getElementById('wordBankScreen');
  if (!screen) return;

  screen.innerHTML = `
    <div class="relative flex items-center mb-4">
      <h2 class="text-xl font-semibold">Word Bank</h2>
      <div class="ml-auto">
        <button id="wordBankBack" class="bg-gray-200 text-gray-800 py-1 px-3 rounded hover:bg-gray-300">Back</button>
      </div>
    </div>
    <div class="mb-3">
      <label class="mr-2">Book:</label>
      <select id="wbBook"></select>
      <button id="wbReview" class="ml-3 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600">Start Review (Learn Mode)</button>
    </div>
    <div class="text-sm text-gray-700 mb-2" id="wbCount"></div>
    <div id="wordBankDisplay" class="bg-gray-100 p-4 rounded mb-4" style="height: 60vh; overflow-y: auto;">
      <ul id="wordBankList" class="space-y-2"></ul>
    </div>
    <div id="wbLearnHost"></div>
  `;

  const $ = id => screen.querySelector('#' + id);
  const backBtn = $('wordBankBack');
  const bookSel = $('wbBook');
  const listEl  = $('wordBankList');
  const countEl = $('wbCount');
  const learnHost = $('wbLearnHost');

  backBtn.addEventListener('click', () => window.showScreen?.('homeScreen'));

  // Build book dropdown from words.json
  function ensureWords(cb) {
    if (window.wordData) { cb(window.wordData); return; }
    fetch('words.json').then(r => r.json()).then(d => { window.wordData = d; cb(d); });
  }

  function populateBooks(data) {
    const books = [...new Set(data.map(w => w.Book))];
    bookSel.innerHTML = '<option value="">Select book</option>';
    books.forEach(b => {
      const o = document.createElement('option'); o.value = b; o.textContent = b; bookSel.appendChild(o);
    });
  }

  function renderList() {
    const known = new Set(window.ProgressStore?.loadKnown() || []);
    const book = bookSel.value;
    const rows = (window.wordData || []).filter(w => w.Book === book && known.has(w.Spanish));
    const unique = [...new Map(rows.map(w => [w.Spanish, w])).values()]
                   .sort((a,b)=>a.Spanish.localeCompare(b.Spanish));

    listEl.innerHTML = '';
    countEl.textContent = book ? `Known in "${book}": ${unique.length}` : '';

    if (!book) return;
    if (!unique.length) {
      const li = document.createElement('li'); li.className = 'text-gray-500'; li.textContent = 'No words learned yet in this book.'; listEl.appendChild(li);
      return;
    }

    unique.forEach(rec => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between bg-white p-2 h-10 rounded shadow';
      const s = document.createElement('span'); s.className = 'truncate'; s.textContent = rec.Spanish + ' — ' + rec.English;
      const b = document.createElement('button');
      b.textContent = 'Unlearn';
      b.className = 'ml-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 active:bg-green-400';
      b.onclick = () => {
        const k = new Set(window.ProgressStore?.loadKnown() || []);
        k.delete(rec.Spanish);
        window.ProgressStore?.saveKnown([...k]);
        window.dispatchEvent(new Event('knownWordsChanged'));
        renderList();
      };
      li.appendChild(s); li.appendChild(b);
      listEl.appendChild(li);
    });
  }

  $('wbReview').addEventListener('click', () => {
    const book = bookSel.value;
    if (!book) return;

    window.setAppContext?.(book, 'all'); // context for saveProgress (chapter not used here)
    const known = new Set(window.ProgressStore?.loadKnown() || []);
    const items = (window.wordData || [])
      .filter(w => w.Book === book && known.has(w.Spanish))
      .map(w => ({ spanish: w.Spanish, english: w.English }));

    // Mount the same Learn UI on this screen, sourcing from known words
    window.LearnCore.mount(learnHost, items, { hideSelectors: true });
  });

  window.addEventListener('knownWordsChanged', renderList);
  window.addEventListener('authChanged', renderList);

  ensureWords((data) => {
    populateBooks(data);
    renderList();
  });
}

window.initWordBank = initWordBank;
