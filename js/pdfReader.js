// js/pdfReader.js
(() => {
  // ── Edit this array to add/remove your books ──
  const books = [
    {
      title: 'Don Quixote',
      url:   'https://www.gutenberg.org/files/2000/2000-h/2000-h.htm'
    },
    {
      title: '50 Bible Stories for Children',
      url:   'https://freekidsbooks.org/wp-content/uploads/2023/12/50_Bible_Stories-Spanish-CC-FKB_sml.pdf'
    },
    // { title: 'Another Book', url: 'https://…' },
  ];

  function initPDFReader(pdfUrl) {
    const list = document.getElementById('bookList');
    if (!list) return console.error('#bookList not found');

    list.className = 'bg-gray-100 p-4 rounded mb-4';
    Object.assign(list.style, {
      height:     '75vh',    // fixed viewport height
      overflowY:  'scroll',  // always show scrollbar
      overflowX:  'hidden',
      boxSizing:  'border-box',
    });
    list.innerHTML = '';

    books.forEach(book => {
      const entry = document.createElement('div');
      entry.style.marginBottom = '1rem';

      const heading = document.createElement('h3');
      heading.textContent      = book.title;
      heading.style.margin     = '0 0 0.5rem 0';
      heading.style.fontWeight = '600';

      const link = document.createElement('a');
      link.href                  = book.url;
      link.textContent           = book.url;
      link.target                = '_blank';
      link.rel                   = 'noopener';
      link.style.display         = 'block';
      link.style.wordBreak       = 'break-all';
      link.style.color           = '#1d4ed8';
      link.style.textDecoration  = 'underline';

      entry.appendChild(heading);
      entry.appendChild(link);
      list.appendChild(entry);
    });

    list.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      // window.renderPDF(a.href);
    });

    console.log(`📚 Rendered ${books.length} books; scrollable list ready.`);
  }

  window.initPDFReader = initPDFReader;
})();
