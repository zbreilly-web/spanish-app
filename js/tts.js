// js/tts.js
(() => {
  let voices = [];
  let ready = false;
  let enabled = false;

  // 🔧 Tweak these to adjust speed & delays
  const cfg = {
    rateEs: 1.2,     // Spanish TTS speed (0.1 – 10)
    rateEn: 1.2,     // English TTS speed (0.1 – 10)
    gapMs: 50,      // Delay between Spanish→English and English→Spanish
    cardGapMs: 400,  // Extra delay after the final Spanish before moving to next card (used by autoplay)
    volume: 1.0,     // 0.0 – 1.0
    pitch: 1.0       // 0.1 – 2.0
  };

  function loadVoices() {
    voices = window.speechSynthesis.getVoices() || [];
    if (voices.length) ready = true;
  }
  loadVoices();
  if (!ready) {
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }

  function pickVoice(langPrefix) {
    if (!ready) return null;
    const exact = voices.find(v => v.lang && v.lang.toLowerCase() === langPrefix.toLowerCase());
    if (exact) return exact;
    const starts = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix.split('-')[0].toLowerCase()));
    return starts || null;
  }

  function speakOnce(text, lang) {
    if (!('speechSynthesis' in window) || !enabled || !text) return null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.volume = cfg.volume;
    u.pitch = cfg.pitch;
    u.rate = lang.startsWith('es') ? cfg.rateEs : cfg.rateEn;
    const v =
      lang.startsWith('es') ? (pickVoice('es-ES') || pickVoice('es')) :
      lang.startsWith('en') ? (pickVoice('en-US') || pickVoice('en')) : null;
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
    return u;
  }

  function cancel() { window.speechSynthesis.cancel(); }

  function speakSeq(spanish, english, onDone) {
    if (!enabled) { onDone?.(); return; }
    cancel();
    const u1 = speakOnce(spanish, 'es-ES');
    if (!u1) { onDone?.(); return; }
    u1.onend = () => {
      setTimeout(() => {
        const u2 = speakOnce(english, 'en-US');
        if (!u2) { onDone?.(); return; }
        u2.onend = () => {
          setTimeout(() => {
            const u3 = speakOnce(spanish, 'es-ES');
            if (!u3) { onDone?.(); return; }
            u3.onend = () => onDone?.();
          }, cfg.gapMs);
        };
      }, cfg.gapMs);
    };
  }

  window.TTS = {
    setEnabled(v) { enabled = !!v; if (!enabled) cancel(); },
    isEnabled() { return enabled; },
    speakSpanish(text) { speakOnce(text, 'es-ES'); },
    speakEnglish(text) { speakOnce(text, 'en-US'); },
    speakSeq,
    cancel,
    // config helpers
    getConfig() { return { ...cfg }; },
    setConfig(patch) { Object.assign(cfg, patch || {}); }
  };
})();
