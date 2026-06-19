/**
 * ═══════════════════════════════════════════════════════════════
 * SAARTHI AI - ANTIGRAVITY SAARTHI CORE v4.0
 * ═══════════════════════════════════════════════════════════════
 * Production-Grade Architecture | 2025 Standards
 * - Full State Machine Driven UI
 * - Resilient Streaming with Watchdog
 * - Intelligent History Pruning & Storage
 * - Advanced Networking with Conditional Retries
 * - Professional Voice Synth & Recognition
 * - Exposed Public API for Extensibility
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION MAPPING
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  API_VERSION: '/api/v1',
  ENDPOINTS: {
    CHAT: '/chat',
    CHAT_WITH_FILE: '/chat-with-file',
    UPLOAD: '/upload-file',
    CLEAR: '/clear-memory',
    HEALTH: '/health',
    METRICS: '/telemetry'
  },
  FALLBACK_BACKEND: 'http://16.170.208.71:2520',
  TIMEOUTS: {
    REQUEST: 30000,
    HEALTH: 3000,
    RETRY_BASE: 1000,
    STALE_STREAM: 10000 // Watchdog: 10s without a chunk = kill stream
  },
  LIMITS: {
    FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MESSAGE_RATE: 500, // Debounce (ms)
    MAX_RETRIES: 2,
    MAX_HISTORY: 50, // Auto-pruning limit
    LOCALSTORAGE_QUOTA: 4 * 1024 * 1024 // 4MB transition barrier
  },
  VOICE: {
    PREFERENCE: ['google us english', 'azure', 'samantha', 'female'],
    FALLBACK_LANG: 'en-US',
    QUALITIES: { pitch: 1.0, rate: 1.0, volume: 1.0 }
  },
  PERFORMANCE: {
    LOG_LEVEL: 'info', // 'debug' | 'info' | 'warn' | 'error'
    ENABLE_METRICS: true
  }
};
let voices = [];

// ═══════════════════════════════════════════════════════════════
// BASE UTILITIES
// ═══════════════════════════════════════════════════════════════

class Logger {
  static log(level, message, context = {}) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[CONFIG.PERFORMANCE.LOG_LEVEL]) return;

    const styles = {
      debug: 'color: #94a3b8',
      info: 'color: #38bdf8',
      warn: 'color: #fbbf24',
      error: 'color: #f87171; font-weight: bold'
    };

    console[level === 'error' ? 'error' : 'log'](
      `%c[${level.toUpperCase()}] ${message}`,
      styles[level],
      context
    );
  }

  static debug(m, ctx) { this.log('debug', m, ctx); }
  static info(m, ctx) { this.log('info', m, ctx); }
  static warn(m, ctx) { this.log('warn', m, ctx); }
  static error(m, ctx) { this.log('error', m, ctx); }
}

class RequestID {
  static next() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// STORAGE: INTELLIGENT EVENT SOURCING
// ═══════════════════════════════════════════════════════════════

class StorageManager {
  constructor() {
    this.dbName = 'SaarthiAI_EventCore';
    this.storeName = 'persistence';
    this.db = null;
    this.isIndexedDB = false;
  }

  async init() {
    try {
      // Test localStorage
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');

      // Check quota/size
      const size = Object.keys(localStorage).reduce((a, k) => a + localStorage[k].length, 0);
      if (size > CONFIG.LIMITS.LOCALSTORAGE_QUOTA) {
        Logger.warn('Storage quota nearing limit. Migrating to IndexedDB...');
        await this._migrateToIndexedDB();
      }
    } catch (e) {
      Logger.warn('localStorage restricted. Using IndexedDB fallback.', { error: e.message });
      await this._initIndexedDB();
    }
  }

  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isIndexedDB = true;
        Logger.info('IndexedDB context established.');
        resolve();
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async _migrateToIndexedDB() {
    await this._initIndexedDB();
    const history = localStorage.getItem('chatHistory');
    if (history) {
      await this.set('chatHistory', history);
      localStorage.removeItem('chatHistory');
      Logger.info('Migration complete.');
    }
  }

  async get(key) {
    if (!this.isIndexedDB) return localStorage.getItem(key);
    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => resolve(null);
    });
  }

  async set(key, value) {
    if (!this.isIndexedDB) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          await this._migrateToIndexedDB();
          return this.set(key, value);
        }
        throw e;
      }
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const request = tx.objectStore(this.storeName).put({ id: key, value });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(key) {
    if (!this.isIndexedDB) {
      localStorage.removeItem(key);
      return true;
    }
    return new Promise((resolve) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const request = tx.objectStore(this.storeName).delete(key);
      request.onsuccess = () => resolve(true);
    });
  }

  prune(history) {
    if (history.length <= CONFIG.LIMITS.MAX_HISTORY) return history;
    Logger.info('Pruning history...', { before: history.length, after: CONFIG.LIMITS.MAX_HISTORY });
    return history.slice(-CONFIG.LIMITS.MAX_HISTORY);
  }
}

// ═══════════════════════════════════════════════════════════════
// NETWORK: OBSERVABLE CLIENT
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SUPREME VISUAL ENGINES: NEURAL MESH & PARALLAX
// ═══════════════════════════════════════════════════════════════

class NeuralMesh {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.init();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  init() {
    this.resize();
    this.createParticles();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    const count = Math.floor((this.canvas.width * this.canvas.height) / 8000);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 0.5
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
    this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';

    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // Mouse attraction
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        p.x += dx * 0.01;
        p.y += dy * 0.01;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx2 = p.x - p2.x;
        const dy2 = p.y - p2.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist2 < 120) {
          this.ctx.globalAlpha = 1 - (dist2 / 120);
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
      this.ctx.globalAlpha = 1;
    });

    requestAnimationFrame(() => this.animate());
  }
}

class ParallaxEngine {
  constructor() {
    this.layers = [
      { el: document.querySelector('.bg-gradient'), strength: 0.02 },
      { el: document.querySelector('.grid-bg'), strength: 0.05 },
      { el: document.querySelector('.starfield'), strength: 0.1 },
      { el: document.querySelector('.orb-container'), strength: 0.03 }
    ];
    window.addEventListener('mousemove', (e) => this.update(e));
  }

  update(e) {
    const x = (e.clientX - window.innerWidth / 2) * -1;
    const y = (e.clientY - window.innerHeight / 2) * -1;

    this.layers.forEach(layer => {
      if (!layer.el) return;
      const moveX = x * layer.strength;
      const moveY = y * layer.strength;

      if (layer.el.classList.contains('orb-container')) {
        // Orb container already has transform: translate(-50%, -50%)
        gsap.to(layer.el, {
          xPercent: -50 + (moveX / 10),
          yPercent: -50 + (moveY / 10),
          duration: 1,
          ease: "power2.out"
        });
      } else {
        gsap.to(layer.el, {
          x: moveX,
          y: moveY,
          duration: 1,
          ease: "power2.out"
        });
      }
    });
  }
}

class KineticInteraction {
  constructor() {
    this.magnetics = document.querySelectorAll('.btn-circle, .btn-auth-submit, .side-panel .chip');
    this.init();
  }

  init() {
    this.magnetics.forEach(el => {
      el.addEventListener('mousemove', (e) => this.drag(e, el));
      el.addEventListener('mouseleave', () => this.reset(el));
      el.addEventListener('mousedown', () => this.pulse(el));
    });
  }

  drag(e, el) {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(el, {
      x: x * 0.4,
      y: y * 0.4,
      rotation: x * 0.05,
      duration: 0.3,
      ease: "power2.out"
    });
  }

  reset(el) {
    gsap.to(el, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.6,
      ease: "elastic.out(1, 0.3)"
    });
  }

  pulse(el) {
    if (navigator.vibrate) navigator.vibrate(10);
    gsap.to(el, {
      scale: 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
  }
}

class NetworkClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.requests = new Map();
  }

  async fetch(endpoint, options = {}, retries = CONFIG.LIMITS.MAX_RETRIES) {
    const id = RequestID.next();
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = performance.now();

    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(options.timeout || CONFIG.TIMEOUTS.REQUEST);

    // Combine signals if necessary
    const signal = options.signal ? this._anySignal([options.signal, controller.signal, timeoutSignal]) : controller.signal;

    this.requests.set(id, controller);
    Logger.info('XHR Open', { id, url, endpoint, retries });

    try {
      const headers = {
        'X-Request-ID': id,
        'ngrok-skip-browser-warning': 'true',
        ...options.headers
      };
      const response = await fetch(url, {
        ...options,
        headers,
        signal
      });

      if (!response.ok) {
        // Only retry on server instability (5xx)
        if (response.status >= 500 && retries > 0) throw new Error(`Server Error ${response.status}`);
        throw new Error(`CRITICAL: ${response.status} ${response.statusText}`);
      }

      const duration = performance.now() - startTime;
      Logger.info('XHR Done', { id, endpoint, duration: `${duration.toFixed(0)}ms` });
      return { response, id, duration };

    } catch (err) {
      const duration = performance.now() - startTime;
      const isAbort = err.name === 'AbortError' || err.name === 'TimeoutError';
      const isRetryable = !isAbort && !err.message.includes('CRITICAL') && retries > 0;

      Logger.warn('XHR Fault', { id, error: err.message, retry: isRetryable });

      if (isRetryable) {
        const backoff = CONFIG.TIMEOUTS.RETRY_BASE * Math.pow(2, CONFIG.LIMITS.MAX_RETRIES - retries);
        await new Promise(r => setTimeout(r, backoff));
        return this.fetch(endpoint, options, retries - 1);
      }
      throw err;
    } finally {
      this.requests.delete(id);
    }
  }

  // AbortSignal.any() polyfill/wrapper
  _anySignal(signals) {
    if (AbortSignal.any) return AbortSignal.any(signals);
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) return signal;
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    return controller.signal;
  }

  abortAll() {
    this.requests.forEach(c => c.abort());
    this.requests.clear();
    Logger.info('Network chain purged.');
  }
}

// ═══════════════════════════════════════════════════════════════
// VISUALIZER: REAL-TIME AUDIO CHART
// ═══════════════════════════════════════════════════════════════

class AudioVisualizer {
  constructor(container) {
    this.container = container;
    this.audioCtx = null;
    this.analyser = null;
    this.stream = null;
    this.animationId = null;
    this.bars = [];
    this.isActive = false;
    this.aura = new AuraVisualizer(document.getElementById('auraCanvas'));
  }

  async start() {
    if (this.isActive) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      this.isActive = true;
      this._createBars();

      if (this.audioCtx.state === 'suspended') {
        Logger.info('Resuming AudioContext...');
        await this.audioCtx.resume();
      }

      this.animate();
      Logger.info('Neural Audio Visualization Active');
    } catch (e) {
      Logger.error('Visualizer Fault', { error: e.message });
    }
  }

  stop() {
    this.isActive = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    this.bars.forEach(b => b.style.height = '12px');
    Logger.info('Neural Audio Visualization Standby');
  }

  _createBars() {
    if (this.bars.length > 0) return;
    const count = 12;
    this.container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const bar = document.createElement('div');
      bar.className = 'voice-bar';
      this.container.appendChild(bar);
      this.bars.push(bar);
    }
  }

  animate() {
    if (!this.isActive) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    this.bars.forEach((bar, j) => {
      const val = data[j % data.length] || 0;
      const height = Math.max(8, (val / 255) * 60);
      bar.style.height = `${height}px`;
      bar.style.opacity = 0.4 + (val / 255) * 0.6;
    });

    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const scale = 1 + (avg / 255) * 0.15;
    const glow = (avg / 255) * 40;

    if (window.saarthi && window.saarthi.dom.orbCore) {
      window.saarthi.dom.orbCore.style.transform = `scale(${scale})`;
      window.saarthi.dom.orbCore.style.boxShadow = `0 0 ${50 + glow}px var(--p-accent), 0 0 ${100 + glow}px var(--p-glow)`;
    }

    if (this.aura) this.aura.update(avg);

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}


class AuraVisualizer {
  constructor(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  update(intensity) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = 60 + (intensity / 255) * 40;

    // Draw energy rings
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 + (intensity / 255) * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mobile optimization: Reduce particles
    const spawnChance = window.innerWidth < 768 ? 0.95 : 0.8;
    if (intensity > 100 && Math.random() > spawnChance) {
      this.particles.push({
        r: radius,
        alpha: 0.5,
        speed: 2 + (intensity / 255) * 5
      });
    }

    this.particles.forEach((p, i) => {
      p.r += p.speed;
      p.alpha -= 0.012;
      ctx.beginPath();
      ctx.arc(centerX, centerY, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${p.alpha})`;
      ctx.stroke();
      if (p.alpha <= 0) this.particles.splice(i, 1);
    });
  }
}


// ═══════════════════════════════════════════════════════════════
// PERSONALITY: NEURAL THEME ENGINE
// ═══════════════════════════════════════════════════════════════

class PersonalityManager {
  constructor(core) {
    this.core = core;
    this.current = 'assist';
    this.modes = {
      assist: { name: 'ASSISTANCE PROTOCOL', color: '#22d3ee' },
      secure: { name: 'SECURITY OVERRIDE', color: '#ef4444' },
      analyze: { name: 'ANALYTICS ENGINE', color: '#ec4899' }
    };
  }

  set(mode) {
    if (!this.modes[mode]) return;
    this.current = mode;
    document.body.dataset.personality = mode;
    Logger.info(`Neural Personality Shifted: ${this.modes[mode].name}`);
    this.core.showToast('Neural Shift', this.modes[mode].name);
  }
}

// ═══════════════════════════════════════════════════════════════
// THOUGHTS: NEURAL REASONING VISUALIZER
// ═══════════════════════════════════════════════════════════════

class ThoughtProcessor {
  constructor(dom) {
    this.dom = dom;
    this.processingSteps = [
      'Initializing context vectors...',
      'Analyzing linguistic patterns...',
      'Retrieving neural weights...',
      'Synthesizing logical response...',
      'Optimizing output stream...'
    ];
  }

  async show() {
    if (!this.dom.container || !this.dom.content) return;
    this.dom.container.classList.remove('hidden');
    this.dom.content.innerHTML = '';

    for (const step of this.processingSteps) {
      this.dom.content.innerHTML += `> ${step}\n`;
      await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
    }
  }

  hide() {
    this.dom.container?.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMANDS: KINETIC NLP INTERCEPTOR
// ═══════════════════════════════════════════════════════════════

class CommandEngine {
  constructor(core) {
    this.core = core;
  }

  intercept(text) {
    const input = text.toLowerCase();

    if (input.includes('security mode')) {
      this.core.personality.set('secure');
      return true;
    }
    if (input.includes('analyze mode') || input.includes('analysis mode')) {
      this.core.personality.set('analyze');
      return true;
    }
    if (input.includes('assist mode') || input.includes('normal mode')) {
      this.core.personality.set('assist');
      return true;
    }
    if (input.includes('clear interface') || input.includes('clear screen')) {
      this.core.dom.messages.innerHTML = '';
      this.core.showToast('System', 'INTERFACE PURGED');
      return true;
    }

    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE: SAARTHI AI SAARTHI CORE v4.0
// ═══════════════════════════════════════════════════════════════

class SaarthiCore {
  constructor() {
    this.config = CONFIG;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const defaultApi = "http://16.170.208.71:2520/api"; // Cloud Backend Enforced
    this.isProd = window.location.hostname.includes('netlify.app');

    let storedApi = localStorage.getItem("apiUrl");

    // Hardening: If on localhost, favor local backend unless user explicitly saved a reachable alternative
    if (isLocal && (!storedApi || storedApi.includes('ngrok-free.dev'))) {
      storedApi = defaultApi;
      localStorage.setItem("apiUrl", storedApi);
    }

    if (this.isProd && storedApi && (storedApi.includes('localhost') || storedApi.includes('127.0.0.1'))) {
      storedApi = defaultApi;
      localStorage.setItem("apiUrl", storedApi);
    }

    this.apiUrl = storedApi || defaultApi;
    this.network = new NetworkClient(this.apiUrl);
    this.storage = new StorageManager();

    // State Machine
    this.state = 'IDLE';
    this.history = []; // Keep local copy for UI only
    this.currentSessionId = null;
    this.uploadedFile = null;
    this.selectedVoice = null;
    this.activeWatchdog = null;

    this.metrics = {
      count: 0,
      totalLatency: 0,
      errors: 0
    };

    this.hasGreeted = false;
    this.useVoice = true; // Auto-enable neural link audio
    this.audioContextStarted = false;
    this.initialize();
  }

  async initialize() {
    Logger.info('Initializing Saarthi Core (Session-Aware)...');
    try {
      await this.storage.init();
    } catch (e) {
      Logger.warn('Storage init failed, proceeding with memory fallback.');
    }

    this._initDOM();
    this._initEvents();
    this._initSpeech();
    this._initClock();

    // Next-Level Engines
    this.personality = new PersonalityManager(this);
    this.commands = new CommandEngine(this);
    this.thoughts = new ThoughtProcessor({
      container: this.dom.thoughtProcessor,
      content: this.dom.thoughtContent
    });

    this.restoreModel();

    // Listen for auth/session changes
    window.addEventListener('sessionChanged', async (e) => {
      this.currentSessionId = e.detail.sessionId;
      Logger.info('Switching Neural Context', { sessionId: this.currentSessionId });
      await this.loadSessionMessages(this.currentSessionId);
    });

    this.startTelemetry();
    this.visualizer = new AudioVisualizer(this.dom.voiceBars);

    // Supreme initialization
    this.neuralMesh = new NeuralMesh('neuralMesh');
    this.parallax = new ParallaxEngine();
    this.kinetic = new KineticInteraction();
    this.startSupremacySequence();

    this.updateState('IDLE');
  }

  startSupremacySequence() {
    if (!window.gsap) return;

    // Hide everything first
    gsap.set(".top-bar, .side-panel, .controls-dock, .chat-panel, .orb-container, .corner", { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.2 });

    tl.to(".orb-container", {
      opacity: 1,
      scale: 1.2,
      duration: 1.5,
      ease: "power4.out"
    });

    tl.to(".orb-container", {
      scale: 1,
      duration: 1,
      ease: "back.out(1.7)"
    }, "-=0.5");

    tl.to(".top-bar", {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: "expo.out"
    }, "-=0.8");

    tl.to(".side-left .chip, .side-right .chip", {
      x: 0,
      opacity: 1,
      stagger: 0.05,
      duration: 0.8,
      ease: "power3.out"
    }, "-=1");

    tl.to(".corner", {
      opacity: 0.5,
      scale: 1,
      duration: 1,
      stagger: 0.1
    }, "-=1");

    tl.to(".controls-dock", {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "back.out(1.7)"
    }, "-=0.5");

    tl.to(".chat-panel", {
      opacity: 1,
      x: 0,
      duration: 1,
      ease: "power2.out"
    }, "-=0.5");

    Logger.info('Saarthi 2.0 Supreme Ready');
  }

  restoreModel() {
    const saved = localStorage.getItem('saarthi_prev_model');
    if (saved && this.dom?.modelSelect) this.dom.modelSelect.value = saved;
  }

  _initDOM() {
    this.dom = {
      btnMic: document.getElementById("btnMic"),
      btnText: document.getElementById("btnText"),
      btnUpload: document.getElementById("btnUpload"),
      btnClear: document.getElementById("btnClear"),
      btnSettings: document.getElementById("btnSettings"),
      btnSend: document.getElementById("btnSend"),
      btnCancel: document.getElementById("btnCancel"),
      textOverlay: document.getElementById("textOverlay"),
      textInput: document.getElementById("textInput"),
      settingsPanel: document.getElementById("settingsPanel"),
      fileInput: document.getElementById("fileInput"),
      apiUrlInput: document.getElementById("apiUrlInput"),
      btnSaveSettings: document.getElementById("btnSaveSettings"),
      modelSelect: document.getElementById("modelSelect"),
      voiceSelect: document.getElementById("voiceSelect"),
      messagesEl: document.getElementById("messages"),
      orbWrapper: document.getElementById("orbWrapper"),
      chipApiUrl: document.getElementById("chipApiUrl"),
      typingIndicator: document.getElementById("typingIndicator"),
      timeText: document.getElementById("timeText"),
      statusText: document.getElementById("statusText"),
      chatPanel: document.querySelector(".chat-panel"),
      btnVoiceSwitch: document.getElementById("btnVoiceSwitch"),
      voiceBars: document.getElementById("voiceBars"),
      voiceStatusText: document.getElementById("voiceStatusText"),
      thoughtProcessor: document.getElementById("thoughtProcessor"),
      thoughtContent: document.getElementById("thoughtContent"),
      orbCore: document.querySelector(".orb-core"),
      personalitySelect: document.getElementById("personalitySelect"),
      telemetry: {
        cpu: document.getElementById("telemetryCpu"),
        mem: document.getElementById("telemetryMem"),
        latency: document.getElementById("telemetryLatency"),
        uptime: document.getElementById("telemetryUptime")
      }
    };


    // Auto-UI elements
    this.dom.btnJump = this._createUIElement('button', 'btn-jump hidden', '⬇ New Messages', 'btnJump');
    this.dom.btnStop = this._createUIElement('button', 'btn-cancel-stream hidden', '⏹ Stop', 'btnStop');
    this.dom.imagePreview = this._createUIElement('div', 'image-preview hidden', '', 'imagePreview');

    this.dom.chatPanel.appendChild(this.dom.btnJump);
    this.dom.chatPanel.appendChild(this.dom.btnStop);

    // Position image preview inside the text overlay above the input
    const overlayCard = this.dom.textOverlay.querySelector('.overlay-card');
    overlayCard.insertBefore(this.dom.imagePreview, this.dom.textInput);

    if (this.dom.chipApiUrl) this.dom.chipApiUrl.textContent = this.apiUrl;
  }


  _createUIElement(tag, className, html, id) {
    const el = document.createElement(tag);
    el.className = className;
    el.innerHTML = html;
    if (id) el.id = id;
    return el;
  }

  _initEvents() {
    this.dom.btnText.onclick = () => this.toggleOverlay(true);
    this.dom.btnCancel.onclick = () => this.toggleOverlay(false);
    this.dom.btnSend.onclick = () => this.handleSendMessage();
    this.dom.btnUpload.onclick = () => this.dom.fileInput.click();
    this.dom.btnClear.onclick = () => this.clearMemory();
    this.dom.btnSettings.onclick = () => this.toggleSettings();
    this.dom.btnSaveSettings.onclick = () => this.saveSettings();
    this.dom.btnJump.onclick = () => this.scrollToBottom(true);
    this.dom.btnStop.onclick = () => this.cancel();
    if (this.dom.btnVoiceSwitch) this.dom.btnVoiceSwitch.onclick = () => this.cycleVoices();

    // Mobile Sidebar Toggle
    const toggleBtn = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        toggleBtn.innerHTML = sidebar.classList.contains('active') ? '✕' : '☰';
      });
      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
          sidebar.classList.contains('active') &&
          !sidebar.contains(e.target) &&
          e.target !== toggleBtn) {
          sidebar.classList.remove('active');
          toggleBtn.innerHTML = '☰';
        }
      });
    }

    this.dom.modelSelect.onchange = () => {
      const model = this.dom.modelSelect.value;
      localStorage.setItem('saarthi_prev_model', model);
      this.showToast('Neural Cortex Shift', `Model switched to ${model.toUpperCase()}`);
    };


    this.dom.textInput.onkeypress = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    };

    this.dom.voiceSelect.onchange = () => {
      const idx = this.dom.voiceSelect.value;
      this.selectedVoice = voices[idx] || null;
      this._updateVoiceIcon();
    };

    this.dom.fileInput.onchange = () => {
      if (this.dom.fileInput.files[0]) this.uploadFile(this.dom.fileInput.files[0]);
      this.dom.fileInput.value = "";
    };

    this.dom.messagesEl.onscroll = () => {
      const isAtBottom = this.dom.messagesEl.scrollHeight - this.dom.messagesEl.clientHeight <= this.dom.messagesEl.scrollTop + 60;
      this.dom.btnJump.classList.toggle('hidden', isAtBottom);
    };

    this.dom.personalitySelect.onchange = () => {
      const p = this.dom.personalitySelect.value;
      document.body.setAttribute('data-personality', p);
      Logger.info(`Neural Personality Diverged: ${p}`);
      this.showToast('Personality Shift', `Saarthi is now in ${p.toUpperCase()} mode.`);
    };

    this.startTelemetry();
  }


  updateState(newState) {
    Logger.debug(`Transition: ${this.state} -> ${newState}`);
    this.state = newState;

    const isWorking = newState === 'PROCESSING' || newState === 'STREAMING';
    this.dom.typingIndicator?.classList.toggle('hidden', !isWorking);
    this.dom.btnStop.classList.toggle('hidden', !isWorking);
    this.dom.orbWrapper?.setAttribute('data-state', newState.toLowerCase());

    if (this.dom.statusText) {
      this.dom.statusText.textContent = newState;
      this.dom.statusText.style.color = {
        IDLE: '#22d3ee',
        PROCESSING: '#f59e0b',
        STREAMING: '#a855f7',
        LISTENING: '#10b981',
        ERROR: '#f43f5e',
        OFFLINE: '#64748b'
      }[newState] || '#22d3ee';
    }
  }

  cancel() {
    Logger.info('Manual override triggered.');
    this.network.abortAll();
    if (this.activeWatchdog) clearTimeout(this.activeWatchdog);
    this.updateState('IDLE');
  }

  handleSendMessage() {
    const text = this.dom.textInput.value.trim();
    if (this._isDebounced()) return;

    // Check for image in preview
    const img = this.dom.imagePreview.querySelector('img');
    const imageData = img ? img.src.split(',')[1] : null;

    this.send(text, imageData);

    this.dom.textInput.value = "";
    this.dom.imagePreview.innerHTML = "";
    this.dom.imagePreview.classList.add('hidden');
  }

  _isDebounced() {
    if (this.messageDebouncer) return true;
    this.messageDebouncer = setTimeout(() => this.messageDebouncer = null, CONFIG.LIMITS.MESSAGE_RATE);
    return false;
  }

  addMessage(role, text, persist = true) {
    const div = this._createUIElement('div', `message message-${role}`);
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <div class="message-meta">
        <span class="meta-label">${role === 'user' ? 'AGENT' : 'SAARTHI'}</span>
        <span class="meta-time">${timestamp}</span>
      </div>
      <div class="message-text">${text}</div>
    `;

    const textEl = div.querySelector('.message-text');
    // Use marked for Markdown rendering if available
    if (window.marked) {
      textEl.innerHTML = marked.parse(this._sanitize(text));
    } else {
      textEl.textContent = text;
    }

    this._addCopyBtn(div, textEl);

    this.dom.messagesEl.appendChild(div);
    this.scrollToBottom();
    return textEl;
  }

  _addCopyBtn(container, body) {
    const btn = this._createUIElement('button', 'btn-copy',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
    );
    btn.onclick = () => {
      navigator.clipboard.writeText(body.textContent);
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      }, 2000);
    };
    container.appendChild(btn);
  }

  scrollToBottom(smooth = false) {
    this.dom.messagesEl.scrollTo({
      top: this.dom.messagesEl.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  async send(text, imageData = null) {
    if (!text && !imageData) return;
    if (this.state !== 'IDLE') return;
    if (!this.currentSessionId) {
      this.showToast('Access Denied', 'Please select or create a session.');
      return;
    }

    this.toggleOverlay(false);

    // Intercept kinetic commands
    if (this.commands.intercept(text)) {
      this.dom.textInput.value = "";
      return;
    }

    this.updateState('PROCESSING');

    // Instant Reply Manner: Show thoughts and start stream concurrently
    this.addMessage('user', text);

    const bodyEl = this.addMessage("assistant", "", false);
    const startTime = Date.now();
    let reader = null;
    let fullResponse = "";

    try {
      const endpoint = this.uploadedFile ? CONFIG.ENDPOINTS.CHAT_WITH_FILE : CONFIG.ENDPOINTS.CHAT;
      const payload = {
        message: text,
        session_id: this.currentSessionId,
        model: this.dom.modelSelect.value,
        personality: this.dom.personalitySelect.value,
        image_data: imageData,
        ...(this.uploadedFile && { file_id: this.uploadedFile.file_id })
      };

      const response = await window.saarthiAuth.apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const latency = Date.now() - startTime;
      if (this.dom.telemetry.latency) this.dom.telemetry.latency.textContent = `${latency}ms`;


      this.updateState('STREAMING');
      reader = response.body.getReader();
      const decoder = new TextDecoder();

      const refreshWatchdog = () => {
        if (this.activeWatchdog) clearTimeout(this.activeWatchdog);
        this.activeWatchdog = setTimeout(() => {
          this.cancel();
          this.showToast('Link Lost', 'Neural stream timeout.');
        }, CONFIG.TIMEOUTS.STALE_STREAM);
      };

      refreshWatchdog();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        refreshWatchdog();
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;

        if (window.marked) {
          bodyEl.innerHTML = marked.parse(this._sanitize(fullResponse));
        } else {
          bodyEl.textContent = this._sanitize(fullResponse);
        }
        this.scrollToBottom();
      }

      if (this.activeWatchdog) clearTimeout(this.activeWatchdog);
      this.speak(this._sanitize(fullResponse));
      this.updateState('IDLE');

    } catch (err) {
      if (err.name === 'AbortError') {
        bodyEl.textContent = "⏹ Link severed by user.";
      } else {
        bodyEl.textContent = `⚠️ Uplink Error: ${err.message}`;
        this.updateState('ERROR');
        setTimeout(() => this.updateState('IDLE'), 3000);
      }
    } finally {
      if (reader) reader.releaseLock();
    }
  }

  async loadSessionMessages(sessionId) {
    this.dom.messagesEl.innerHTML = "";
    this.updateState('PROCESSING');
    try {
      const res = await window.saarthiAuth.apiFetch(`/sessions/${sessionId}/messages`);
      const messages = await res.json();

      messages.forEach(m => {
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        this.addMessage(role, m.content, false);
      });
      this.scrollToBottom();
      this.updateState('IDLE');
    } catch (e) {
      this.showToast('Recall Error', 'Failed to retrieve session history.');
      this.updateState('IDLE');
    }
  }

  async clearMemory() {
    if (!this.currentSessionId) return;

    // Just clear the UI messages, don't delete the session or reload
    this.dom.messagesEl.innerHTML = "";
    this.showToast('Interface Cleared', 'Message log purged.');

    // Optional: If you want to actually delete messages from backend, uncomment below:
    try {
      await window.saarthiAuth.apiFetch(`/sessions/${this.currentSessionId}/messages`, { method: 'DELETE' });
    } catch (e) {
      Logger.error('Failed to clear messages', e);
    }
  }

  async uploadFile(file) {
    // If it's an image, we handle it as multimodal input for the chat
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.dom.imagePreview.innerHTML = `<img src="${e.target.result}" style="max-height: 100px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--accent-cyan);">`;
        this.dom.imagePreview.classList.remove('hidden');
        this.toggleOverlay(true);
      };
      reader.readAsDataURL(file);
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      this.updateState('PROCESSING');
      const res = await window.saarthiAuth.apiFetch(CONFIG.ENDPOINTS.UPLOAD, {
        method: 'POST',
        headers: {},
        body: form
      });
      this.uploadedFile = await res.json();
      this.addMessage("assistant", `📄 Uplinked: ${file.name}`, false);
      this.updateState('IDLE');
    } catch (e) {
      this.showToast('Uplink Failed', e.message);
      this.updateState('IDLE');
    }
  }

  async startTelemetry() {
    if (!CONFIG.PERFORMANCE.ENABLE_METRICS) return;

    const update = async () => {
      if (this.state === 'OFFLINE') return;
      try {
        const res = await window.saarthiAuth.apiFetch(CONFIG.ENDPOINTS.METRICS);
        const data = await res.json();

        // Fluid mapping
        if (this.dom.telemetry.cpu) this.dom.telemetry.cpu.textContent = `${data.cpu_usage.toFixed(1)}%`;
        if (this.dom.telemetry.mem) this.dom.telemetry.mem.textContent = `${data.memory_usage.toFixed(0)} MB`;
        if (this.dom.telemetry.latency) this.dom.telemetry.latency.textContent = `${data.latency.toFixed(0)}ms`;
      } catch (e) {
        Logger.debug('Telemetry sync skipped');
      }
    };

    // Telemetry is still I/O bound, so we use a slower cadence than RAF
    setInterval(update, 2000);
  }

  // ═════════════════════════════════════════════════════════════
  // VOICE & SPEECH ENGINE
  // ═════════════════════════════════════════════════════════════


  _initSpeech() {
    const loadVoices = (retries = 3) => {
      voices = speechSynthesis.getVoices();
      if (!voices.length && retries > 0) return setTimeout(() => loadVoices(retries - 1), 200);

      if (this.dom.voiceSelect) {
        this.dom.voiceSelect.innerHTML = '<option value="">Saarthi Auto-Select</option>';
        voices.forEach((v, i) => {
          const opt = this._createUIElement('option', '', `${v.name} (${v.lang})`);
          opt.value = i;
          this.dom.voiceSelect.appendChild(opt);
        });
      }

      const pref = CONFIG.VOICE.PREFERENCE;
      this.selectedVoice = voices.find(v => v.lang.startsWith('en') && pref.some(p => v.name.toLowerCase().includes(p))) || voices[0];

      // Sync dropdown
      if (this.dom.voiceSelect && this.selectedVoice) {
        const idx = voices.indexOf(this.selectedVoice);
        if (idx !== -1) this.dom.voiceSelect.value = idx;
      }

      this._updateVoiceIcon();
      Logger.debug('Voice Engine Online', { voice: this.selectedVoice?.name });
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => loadVoices();
    }
    loadVoices();
    this._initRecognition();
  }

  cycleVoices() {
    this.useVoice = !this.useVoice;

    // Sync HUD
    if (this.dom.voiceStatusText) {
      this.dom.voiceStatusText.textContent = this.useVoice ? 'ON' : 'OFF';
    }
    if (this.dom.btnVoiceSwitch) {
      this.dom.btnVoiceSwitch.classList.toggle('voice-active', this.useVoice);
    }

    this._updateVoiceIcon();
    this.showToast('Neural Interface', this.useVoice ? 'Neural Speech Link: ACTIVE' : 'Neural Speech Link: OFFLINE');
  }

  _updateVoiceIcon() {
    const icon = this.dom.btnVoiceSwitch?.querySelector('.voice-switch-icon');
    if (icon) {
      const isFemale = CONFIG.VOICE.PREFERENCE.some(p => this.selectedVoice?.name?.toLowerCase().includes(p));
      icon.textContent = isFemale ? '👱‍♀️' : '👨‍🚀';
      icon.style.filter = `hue-rotate(${Math.random() * 360}deg) drop-shadow(0 0 10px var(--accent-cyan))`;
    }
  }

  _initKineticEffects() {
    document.addEventListener('mousemove', (e) => {
      // Mouse tracking for fluid grid
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);

      // Atmospheric parallax for orb
      if (this.dom.orbWrapper) {
        const moveX = (e.clientX - window.innerWidth / 2) / 50;
        const moveY = (e.clientY - window.innerHeight / 2) / 50;
        this.dom.orbWrapper.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
      }
    });
  }

  speak(text) {
    if (!text || !window.speechSynthesis || !this.useVoice) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;

    Object.assign(utterance, CONFIG.VOICE.QUALITIES);

    utterance.onstart = () => this.dom.orbWrapper?.classList.add('speaking');
    utterance.onend = () => this.dom.orbWrapper?.classList.remove('speaking');

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  _initRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      Logger.warn('Speech Recognition not supported in this browser.');
      this.dom.btnMic.classList.add('hidden');
      return;
    }

    const rec = new webkitSpeechRecognition();
    rec.lang = 'en-US';
    rec.continuous = false; // Changed to false for better one-shot command
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let isListening = false;
    let mediaRecorder = null;
    let audioChunks = [];

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice.wav');

          try {
            this.updateState('PROCESSING');
            const res = await window.saarthiAuth.apiFetch('/voice-to-text', {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            if (data.text) {
              this.dom.textInput.value = data.text;
              this.dom.textInput.focus();
              this.toggleOverlay(true);
            }
            this.updateState('IDLE');
          } catch (e) {
            Logger.error('Backend Voice Fault', e);
            this.updateState('IDLE');
          }
          stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
      } catch (e) {
        Logger.error('Failed to init MediaRecorder', e);
      }
    }

    rec.onstart = () => {
      isListening = true;
      Logger.info('Microphone active. Recognition started.');
      this.updateState('LISTENING');
      this.dom.btnMic.classList.add('active');
      if (this.visualizer) this.visualizer.start();
      this.showToast('Neural Link', 'LISTENING... Speak now!', 3000);
      startRecording();
    };
    rec.onend = () => {
      isListening = false;
      Logger.info('Recognition ended.');
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      // Only reset state if we aren't processing
      if (this.state === 'LISTENING') this.updateState('IDLE');
      this.dom.btnMic.classList.remove('active');
      if (this.visualizer) this.visualizer.stop();
    };
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      Logger.info('Mic Result (Local)', { text });
      // We prioritize mediaRecorder results from backend for v2.0
      if (!this.dom.textInput.value) this.dom.textInput.value = text;
      this.dom.textInput.focus();
    };
    rec.onerror = (e) => {
      Logger.error('Mic Fault', { error: e.error });
      isListening = false;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (this.visualizer) this.visualizer.stop();

      if (e.error === 'not-allowed') {
        this.showToast('Access Denied', 'Mic permission denied.');
      } else if (e.error === 'no-speech') {
        // Ignore no-speech, just stop listening
      } else {
        this.showToast('Mic Error', e.error);
      }
      this.updateState('IDLE');
    };

    this.dom.btnMic.onclick = () => {
      if (isListening) {
        rec.stop();
      } else {
        try { rec.start(); } catch (e) {
          Logger.error('Failed to start mic', e);
          rec.stop();
        }
      }
    };

  }

  // ═════════════════════════════════════════════════════════════
  // UTILS & HEARTBEAT
  // ═════════════════════════════════════════════════════════════

  _initClock() {
    const update = () => this.dom.timeText && (this.dom.timeText.textContent = new Date().toTimeString().split(' ')[0]);
    setInterval(update, 1000);
    update();
  }


  toggleOverlay(s) {
    this.dom.textOverlay.classList.toggle('hidden', !s);
    if (s) this.dom.textInput.focus();
  }

  toggleSettings() { this.dom.settingsPanel.classList.toggle('hidden'); }

  saveSettings() {
    const url = this.dom.apiUrlInput.value.trim();
    if (url && url !== this.apiUrl) {
      this.apiUrl = url;
      localStorage.setItem("apiUrl", url);
      this.network = new NetworkClient(url);
      if (this.dom.chipApiUrl) this.dom.chipApiUrl.textContent = url;
      if (window.saarthiAuth) window.saarthiAuth.baseUrl = url;
    }
    this.dom.btnSaveSettings.innerHTML = '✅ SETTINGS SAVED';
    this.dom.btnSaveSettings.classList.add('btn-success');

    setTimeout(() => {
      this.dom.btnSaveSettings.innerHTML = 'SAVE SETTINGS';
      this.dom.btnSaveSettings.classList.remove('btn-success');
      this.toggleSettings();
    }, 1000);
  }

  showToast(title, msg) {
    const t = this._createUIElement('div', 'toast', `<strong>${title}</strong>: ${msg}`);
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 500);
    }, 4000);
  }

  _sanitize(t) {
    // Remove emojis and control characters for a professional text-only display
    // Using Unicode property escapes to target all extended pictographs (emojis)
    return t.replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  // Public Metrics Export
  getMetrics() {
    const avg = this.metrics.count > 0 ? (this.metrics.totalLatency / this.metrics.count).toFixed(0) : 0;
    return {
      messages: this.metrics.count,
      avg_latency: `${avg}ms`,
      errors: this.metrics.errors,
      engine_state: this.state
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTANTIATION
// ═══════════════════════════════════════════════════════════════

window.saarthi = new SaarthiCore();
window.saarthiMetrics = () => {
  const m = window.saarthi.getMetrics();
  console.table(m);
  return m;
};

Logger.info('🚀 Saarthi System Online. Status: Standing by.');