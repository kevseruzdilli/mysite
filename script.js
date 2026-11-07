/* ============================================================
   KEVSER UZDİLLİ — GERÇEKÇİ KİTAP MOTORU (SCRIPT.JS)
   StPageFlip Kütüphanesi İle Gerçek Kağıt Bükülme, Gölgelendirme
   ve Sürükleme Deneyimi
   ============================================================ */

'use strict';

/* ─── Edebi Makale Verileri ───────────────────────────────── */
const ARTICLES_DATA = [
  {
    id: 1,
    title: "Virginia Woolf Eserlerinde 3 Farklı Temaya Bakış",
    category: "Akademi",
    date: "Mart 2026",
    readingTime: "6 dk",
    teaser: "Modernist edebiyatın öncülerinden Virginia Woolf'un yapıtlarında örülen yalnızlık, kadın kimliği ve akıp giden zaman algısı kavramlarına kuramsal ve eleştirel bir yaklaşım.",
    link: "https://www.soylentidergi.com/author/kevseruzdilli/",
    themes: [
      "Bilinç akışı ve iç monologlar",
      "Kadın kimliği ve bağımsızlık arayışı",
      "Zamanın öznel algılanışı",
      "Varoluşsal yalnızlık"
    ]
  },
  {
    id: 2,
    title: "3 Farklı Yazardan Arkadaşlık Teması",
    category: "Akademi",
    date: "Mart 2026",
    readingTime: "5 dk",
    teaser: "Dünya edebiyatının seçkin kalemlerinin eserleri üzerinden dostluk, vefa ve sadakat olgusuna karşılaştırmalı edebi bakış.",
    link: "https://www.soylentidergi.com/author/kevseruzdilli/",
    themes: [
      "Dostluk ve vefa izleği",
      "Duygusal ve felsefi bağlar",
      "Sadakat sınavları",
      "Metinlerarası karşılaştırma"
    ]
  }
];

/* ─── Kitap Alıntıları ────────────────────────────────────── */
const BOOK_QUOTES = [
  { q: '"Bir kadının para kazanması ve kendine ait bir odası olması gerekir; eğer kurgu yazacaksa."', by: '— Virginia Woolf' },
  { q: '"Kelimeler öyle bir güç taşır ki, gerçeği hem inşa edebilir hem de darmadağın edebilir."', by: '— Virginia Woolf' },
  { q: '"Geçmiş hiçbir zaman ölmez; aslında geçmiş bile değildir."', by: '— William Faulkner' },
  { q: '"Yazmak, insanın kendi içindeki sessizliğe bir isim verme arayışıdır."', by: '— Ahmet Hamdi Tanpınar' },
  { q: '"Bir kitap, içimizdeki donmuş denizi parçalayacak bir balta olmalıdır."', by: '— Franz Kafka' },
];
let currentQuoteIdx = 0;

/* Global flipbook referansı */
window.bookFlip = null;

/* ─── Sayfa Sesi Sentezleyici (Web Audio API - Saf Prosedürel Kağıt Hışırtısı) ─── */
let audioCtx = null;
let soundEnabled = true;

function playPaperRustle() {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const duration = 0.45;
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Kağıt hışırtısı frekansı (1200Hz - 2400Hz bandpass)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600 + (Math.random() - 0.5) * 300, now);
    filter.Q.setValueAtTime(1.2, now);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch (e) {
    // Ses desteği yoksa sessizce devam et
  }
}

function initSoundToggle() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
    btn.title = soundEnabled ? 'Sayfa Sesi Açık' : 'Sayfa Sesi Kapalı';
  });
}

/* ─── Sayfa Durumu ve Gösterge Güncelleme ──────────────────── */
function updateStatus(pageIndex) {
  const statusEl = document.getElementById('dock-status');
  const prevBtn = document.getElementById('dock-prev-btn');
  const nextBtn = document.getElementById('dock-next-btn');

  if (statusEl) {
    if (pageIndex === 0) {
      statusEl.textContent = 'Ön Kapak';
    } else if (pageIndex >= 11) {
      statusEl.textContent = 'Arka Kapak (@liamizsh)';
    } else {
      statusEl.textContent = `Sayfa ${pageIndex} / 10`;
    }
  }

  if (prevBtn) prevBtn.disabled = (pageIndex === 0);
  if (nextBtn) nextBtn.disabled = (pageIndex >= 11);
}

/* ─── PageFlip Başlatma ───────────────────────────────────── */
function initPhysicalFlipBook() {
  const bookEl = document.getElementById('book');
  if (!bookEl || typeof St === 'undefined' || !St.PageFlip) {
    console.error('StPageFlip kütüphanesi yüklenemedi!');
    return;
  }

  // Genişlik ve yükseklik hesaplama
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const isMobile = winW <= 840;

  // Mobilde ekranın neredeyse tamamını kaplayan şık sayfa boyutu
  let pageW, pageH;
  if (isMobile) {
    pageW = Math.min(winW - 24, 460);
    pageH = Math.min(winH - 120, 680);
  } else {
    pageW = Math.min(Math.floor((winW - 80) / 2), 540);
    pageH = Math.min(winH - 140, 680);
  }

  window.bookFlip = new St.PageFlip(bookEl, {
    width: pageW,
    height: pageH,
    size: 'stretch',
    minWidth: 280,
    maxWidth: 600,
    minHeight: 420,
    maxHeight: 760,
    maxShadowOpacity: 0.65,      // Gerçek kağıt katlanma gölgesi derinliği
    showCover: true,             // İlk ve son sayfa sert kapak
    usePortrait: true,           // Mobilde tek sayfa modu
    flippingTime: 1000,          // Yavaş, hissedilir, akıcı kağıt geçişi (ms)
    drawShadow: true,
    useMouseEvents: true,        // Basılı tutup sürükleyerek çevirme açık
    showPageCorners: false,      // Fare üzerine gelince (hover) kendiliğinden köşenin kıvrılmasını engeller
    disableFlipByClick: true,    // Basılı tutmadan tek tıkla sayfa çevrilmesini engeller (sadece basılı tutup sürükleyince çevrilir)
    autoSize: true,
    mobileScrollSupport: true
  });

  // Sayfaları DOM'dan yükle
  window.bookFlip.loadFromHTML(document.querySelectorAll('.book-page'));

  // Kitabı görünür yap
  bookEl.style.display = 'block';

  // Olay dinleyicileri
  window.bookFlip.on('flip', (e) => {
    updateStatus(e.data);
    playPaperRustle();
  });

  window.bookFlip.on('init', (e) => {
    updateStatus(e.data.page);
  });

  // Alt dock butonları
  document.getElementById('dock-prev-btn')?.addEventListener('click', () => {
    if (window.bookFlip) window.bookFlip.flipPrev();
  });
  document.getElementById('dock-next-btn')?.addEventListener('click', () => {
    if (window.bookFlip) window.bookFlip.flipNext();
  });

  // Klavye ok tuşları
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('article-modal');
    if (modal && modal.classList.contains('active')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      if (window.bookFlip) window.bookFlip.flipNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      if (window.bookFlip) window.bookFlip.flipPrev();
    }
  });

  // Fare Tekerleği (Scroll)
  let wheelAcc = 0;
  let wheelTimer = null;
  window.addEventListener('wheel', (e) => {
    const modal = document.getElementById('article-modal');
    if (modal && modal.classList.contains('active')) return;

    wheelAcc += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAcc = 0; }, 350);

    if (wheelAcc > 80) {
      wheelAcc = 0;
      if (window.bookFlip) window.bookFlip.flipNext();
    } else if (wheelAcc < -80) {
      wheelAcc = 0;
      if (window.bookFlip) window.bookFlip.flipPrev();
    }
  }, { passive: true });
}

/* ─── Makale Modalı ───────────────────────────────────────── */
window.openArticleModal = function(id) {
  const a = ARTICLES_DATA.find(x => x.id === id);
  if (!a) return;
  const modal = document.getElementById('article-modal');
  if (!modal) return;

  document.getElementById('modal-category').textContent = a.category;
  document.getElementById('modal-title').textContent = a.title;
  document.getElementById('modal-date').textContent = a.date;
  document.getElementById('modal-time').textContent = a.readingTime;
  document.getElementById('modal-summary').textContent = a.teaser;

  const themesEl = document.getElementById('modal-themes-list');
  if (themesEl) themesEl.innerHTML = a.themes.map(t => `<li>${t}</li>`).join('');

  const readLink = document.getElementById('modal-read-link');
  if (readLink) readLink.href = a.link;

  modal.classList.add('active');
};

function closeArticleModal() {
  const modal = document.getElementById('article-modal');
  if (modal) modal.classList.remove('active');
}

/* ─── Alıntılar ───────────────────────────────────────────── */
function initQuotes() {
  const textEl = document.getElementById('quote-text');
  const byEl = document.getElementById('quote-by');
  const nextBtn = document.getElementById('next-quote');
  if (!textEl || !byEl) return;

  function showQuote(idx) {
    textEl.style.opacity = '0';
    byEl.style.opacity = '0';
    setTimeout(() => {
      textEl.textContent = BOOK_QUOTES[idx].q;
      byEl.textContent = BOOK_QUOTES[idx].by;
      textEl.style.opacity = '1';
      byEl.style.opacity = '1';
    }, 180);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentQuoteIdx = (currentQuoteIdx + 1) % BOOK_QUOTES.length;
      showQuote(currentQuoteIdx);
    });
  }
}

/* ─── Tema (Gece / Gündüz) ────────────────────────────────── */
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('clean-book-theme', theme);
  }

  const saved = localStorage.getItem('clean-book-theme');
  applyTheme(saved || 'dark');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

/* ─── İletişim Formu & E-Posta Kopyalama ──────────────────── */
function initContact() {
  const copyBtn = document.getElementById('copy-email-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const email = (document.getElementById('email-text') || {}).textContent || 'kevseruzdilli@gmail.com';
      navigator.clipboard.writeText(email.trim()).then(() => {
        const icon = copyBtn.querySelector('i');
        if (icon) {
          icon.className = 'fa-solid fa-check';
          setTimeout(() => { icon.className = 'fa-regular fa-copy'; }, 2000);
        }
      });
    });
  }

  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('sender-name') || {}).value || '';
      const email = (document.getElementById('sender-email') || {}).value || '';
      const subject = (document.getElementById('sender-subject') || {}).value || 'İletişim & İşbirliği';
      const msg = (document.getElementById('sender-message') || {}).value || '';
      if (!name.trim() || !email.trim() || !msg.trim()) return;

      const body = encodeURIComponent(`İsim: ${name}\nE-posta: ${email}\n\nMesaj:\n${msg}`);
      window.location.href = `mailto:kevseruzdilli@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

      const fb = document.getElementById('form-feedback');
      if (fb) {
        fb.textContent = 'Mesajınız hazırlandı! E-posta istemciniz açılıyor…';
        fb.style.display = 'block';
        setTimeout(() => { fb.style.display = 'none'; form.reset(); }, 3000);
      }
    });
  }
}

/* ─── Kütüphane Ambiyansı ve İpeksi Toz Parçacıkları (Sade & Yaratıcı) ─── */
function initAmbientDust() {
  const canvas = document.getElementById('ambient-dust-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Az sayıda, çok yavaş süzülen edebi kütüphane toz tanecikleri
  const particleCount = 28;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -Math.random() * 0.3 - 0.1, // Hafifçe yukarı doğru süzülür
      alpha: Math.random() * 0.45 + 0.15,
      baseAlpha: Math.random() * 0.45 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      angle: Math.random() * Math.PI * 2
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const rgb = isDark ? '191, 165, 136' : '143, 119, 90'; // Bronz rengi

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.pulseSpeed;
      p.alpha = p.baseAlpha + Math.sin(p.angle) * 0.15;

      // Ekran dışına çıkınca yeniden yerleştir
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${Math.max(0.05, p.alpha)})`;
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  render();
}

/* ─── Başlat ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.documentElement.setAttribute('data-theme', 'dark');
  initSoundToggle();
  initQuotes();
  initContact();
  initPhysicalFlipBook();
  initAmbientDust();

  const mc = document.getElementById('modal-close');
  const mx = document.getElementById('modal-cancel');
  const mb = document.getElementById('article-modal');
  if (mc) mc.addEventListener('click', closeArticleModal);
  if (mx) mx.addEventListener('click', closeArticleModal);
  if (mb) mb.addEventListener('click', (e) => {
    if (e.target.id === 'article-modal') closeArticleModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeArticleModal();
  });
});
