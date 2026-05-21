/**
 * Meteal i18n System
 * Auto-detects browser language, loads locale JSON, applies translations.
 * Exposes: window.i18n = { t(key), setLang(lang), currentLang }
 */
(function () {
  'use strict';

  const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh', 'de', 'fr', 'it'];
  const STORAGE_KEY = 'meteal_lang';
  const LANG_LABELS = {
    ko: { flag: '🇰🇷', label: '한국어' },
    en: { flag: '🇺🇸', label: 'English' },
    ja: { flag: '🇯🇵', label: '日本語' },
    zh: { flag: '🇨🇳', label: '中文' },
    de: { flag: '🇩🇪', label: 'Deutsch' },
    fr: { flag: '🇫🇷', label: 'Français' },
    it: { flag: '🇮🇹', label: 'Italiano' },
  };

  let _messages = {};
  let _currentLang = 'en';

  /** Detect best language from browser/storage */
  function detectLang() {
    // 1. From localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

    // 2. From browser preferences
    const navLangs = navigator.languages || [navigator.language || 'en'];
    for (const nl of navLangs) {
      const code = nl.toLowerCase().split('-')[0];
      if (SUPPORTED_LANGS.includes(code)) return code;
    }
    return 'en';
  }

  /** Flat get by dot-notation key */
  function get(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  /** Translate a key */
  function t(key, fallback) {
    const val = get(_messages, key);
    return val !== undefined ? val : (fallback !== undefined ? fallback : key);
  }

  /** Apply translations to DOM */
  function applyTranslations() {
    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val !== key) el.textContent = val;
    });

    // data-i18n-html → innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key);
      if (val !== key) el.innerHTML = val;
    });

    // data-i18n-placeholder → placeholder attr
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val !== key) el.setAttribute('placeholder', val);
    });

    // data-i18n-title → title attr
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val !== key) el.setAttribute('title', val);
    });

    // Update <html lang>
    document.documentElement.lang = _currentLang;

    // Update active button in dropdown
    document.querySelectorAll('.lang-dropdown button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === _currentLang);
    });

    // Update lang button label
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
      const info = LANG_LABELS[_currentLang];
      langBtn.innerHTML = `<span>${info.flag} ${info.label}</span><span class="chevron">▾</span>`;
    }
  }

  /** Load locale JSON and apply */
  async function loadLang(lang) {
    try {
      // Fetch relative to the HTML page (document.baseURI)
      const url = 'locales/' + lang + '.json';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      _messages = await resp.json();
      _currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      applyTranslations();
    } catch (err) {
      console.warn('[i18n] Failed to load', lang, err);
      // Fallback to 'en' if not already trying it
      if (lang !== 'en') {
        await loadLang('en');
      }
    }
  }

  /** Public API: change language */
  async function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    await loadLang(lang);
  }

  /** Build and inject language dropdown */
  function buildDropdown() {
    const containers = document.querySelectorAll('.lang-selector');
    containers.forEach(container => {
      // Button
      const btn = document.createElement('button');
      btn.className = 'lang-btn';
      btn.id = 'langBtn';
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      const info = LANG_LABELS[_currentLang];
      btn.innerHTML = `<span>${info.flag} ${info.label}</span><span class="chevron">▾</span>`;

      // Dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'lang-dropdown';
      dropdown.setAttribute('role', 'menu');

      SUPPORTED_LANGS.forEach(code => {
        const langInfo = LANG_LABELS[code];
        const langBtn = document.createElement('button');
        langBtn.dataset.lang = code;
        langBtn.setAttribute('role', 'menuitem');
        langBtn.innerHTML = `<span>${langInfo.flag}</span><span>${langInfo.label}</span>`;
        if (code === _currentLang) langBtn.classList.add('active');
        langBtn.addEventListener('click', () => {
          setLang(code);
          container.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        });
        dropdown.appendChild(langBtn);
      });

      container.appendChild(btn);
      container.appendChild(dropdown);

      // Toggle
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = container.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(isOpen));
      });
    });

    // Close on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.lang-selector.open').forEach(el => {
        el.classList.remove('open');
        const b = el.querySelector('.lang-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /** Sticky header scroll effect */
  function initScrollHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /** Mobile nav toggle */
  function initMobileNav() {
    const toggle = document.getElementById('mobileNavToggle');
    const navLinks = document.querySelector('.nav-links');
    if (!toggle || !navLinks) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
    navLinks.addEventListener('click', (e) => e.stopPropagation());
  }

  /** Initialize */
  async function init() {
    const lang = detectLang();
    buildDropdown();
    initScrollHeader();
    initMobileNav();
    await loadLang(lang);
  }

  // Expose public API
  window.i18n = {
    get t() { return t; },
    setLang,
    get currentLang() { return _currentLang; },
    SUPPORTED_LANGS,
    LANG_LABELS,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
