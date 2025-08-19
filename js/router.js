// js/router.js
// Simple SPA router: show/hide screens and initialize modules with debug logging

// List of all screen IDs
const screens = [
  'homeScreen',
  'flashcardScreen',
  'pdfScreen',
  'learnModeScreen',
  'wordBankScreen',
  'authScreen' // NEW
];

/**
 * Hide all screens, then show the one with the given ID.
 * If we’re leaving flashcards, call teardownFlashcards().
 * @param {string} screenId - The ID of the screen to display
 */
function showScreen(screenId) {
  console.log(`Routing to screen: ${screenId}`);

  // detect which screen is currently visible
  const current = screens.find(id => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  });

  // if we're leaving flashcards, tear them down
  if (current === 'flashcardScreen') {
    console.log('⏹️ Tearing down flashcards');
    window.teardownFlashcards?.();
  }

  // hide all screens
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // show the requested screen
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
  } else {
    console.error(`Cannot find screen element: ${screenId}`);
  }
}
window.showScreen = showScreen; // expose for other modules

document.addEventListener('DOMContentLoaded', () => {
  console.log('Router initialized, showing homeScreen');
  showScreen('homeScreen');

  // Home → Flashcards
  document.getElementById('goFlashcards')
    ?.addEventListener('click', () => {
      console.log('▶ Flashcards button clicked');
      window.initFlashcards?.();
      showScreen('flashcardScreen');
    });

  // Home → PDF Reader
  document.getElementById('goPDFs')
    ?.addEventListener('click', () => {
      console.log('▶ PDFs button clicked');
      window.initPDFReader?.();
      showScreen('pdfScreen');
    });

  // Home → Learn Mode
  document.getElementById('goLearnMode')
    ?.addEventListener('click', () => {
      console.log('▶ Learn Mode button clicked');
      showScreen('learnModeScreen');
      window.initLearnMode?.();
    });

  // Home → Word Bank
  document.getElementById('goWordBank')
    ?.addEventListener('click', () => {
      console.log('▶ Word Bank button clicked');
      window.initWordBank?.();
      showScreen('wordBankScreen');
    });

  // Home → Manage Account (NEW)
  document.getElementById('goAccount')
    ?.addEventListener('click', () => {
      console.log('▶ Manage Account clicked');
      window.initAuth?.();
      showScreen('authScreen');
    });

  // Back buttons for each screen
  document.getElementById('flashcardsBack')
    ?.addEventListener('click', () => {
      console.log('▶ Back from flashcardScreen to homeScreen');
      showScreen('homeScreen');
    });
  document.getElementById('pdfBack')
    ?.addEventListener('click', () => {
      console.log('▶ Back from pdfScreen to homeScreen');
      showScreen('homeScreen');
    });
  document.getElementById('learnModeBack')
    ?.addEventListener('click', () => {
      console.log('▶ Back from learnModeScreen to homeScreen');
      showScreen('homeScreen');
    });
  document.getElementById('wordBankBack')
    ?.addEventListener('click', () => {
      console.log('▶ Back from wordBankScreen to homeScreen');
      showScreen('homeScreen');
    });

  // Auth Back (NEW)
  document.getElementById('authBack')
    ?.addEventListener('click', () => {
      console.log('▶ Back from authScreen to homeScreen');
      showScreen('homeScreen');
    });
});
