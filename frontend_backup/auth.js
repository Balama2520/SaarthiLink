class SaarthiAuth {
    constructor() {
        try {
            this.token = localStorage.getItem('saarthi_token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const defaultApi = isLocal ? "http://localhost:2520/api" : 'http://16.170.208.71:2520/api';
            this.isProd = window.location.hostname.includes('netlify.app');

            let storedApi = localStorage.getItem('apiUrl');

            // Hardening: If on localhost, favor local backend unless user explicitly saved a reachable alternative
            if (isLocal && (!storedApi || storedApi.includes('ngrok-free.dev'))) {
                storedApi = defaultApi;
                localStorage.setItem('apiUrl', storedApi);
            }

            if (this.isProd && (!storedApi || storedApi.includes('localhost') || storedApi.includes('127.0.0.1'))) {
                storedApi = defaultApi;
            }

            this.baseUrl = (storedApi || defaultApi).replace(/\/$/, '');
            this.currentSessionId = localStorage.getItem('saarthi_current_session');
        } catch (e) {
            console.warn('localStorage access failed, using memory fallback', e);
            this.token = null;
            this.baseUrl = 'http://16.170.208.71:2520';
            this.currentSessionId = null;
            this.isProd = window.location.hostname.includes('netlify.app');
        }
        this.activeTab = 'login';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
        this.startHealthCheck();
        this._initDiagnosticUI();
    }

    _initDiagnosticUI() {
        const btnClose = document.getElementById('btnDiagClose');
        if (btnClose) {
            btnClose.onclick = () => {
                document.getElementById('diagnosticOverlay').classList.remove('active');
            };
        }
    }

    setupEventListeners() {
        const authForm = document.getElementById('authForm');
        const authTabs = document.querySelectorAll('.auth-tab');
        const btnToggleSidebar = document.getElementById('btnToggleSidebar');
        const btnLogout = document.getElementById('btnLogout');
        const btnNewChat = document.getElementById('btnNewChat');

        authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeTab = tab.dataset.tab;
                document.getElementById('btnAuthSubmit').textContent =
                    this.activeTab === 'login' ? 'ESTABLISH LINK' : 'INITIATE REGISTRATION';
            });
        });

        btnNewChat.addEventListener('click', () => this.createNewSession());
        if (btnLogout) btnLogout.addEventListener('click', () => this.logout());

        // New Login Config Logic
        const btnToggleConfig = document.getElementById('btnShowAuthConfig');
        const configFields = document.getElementById('authConfigFields');
        const btnSaveApi = document.getElementById('btnSaveAuthApi');
        const apiInput = document.getElementById('authApiUrl');

        if (btnToggleConfig && configFields) {
            btnToggleConfig.onclick = () => {
                configFields.classList.toggle('hidden');
                if (!configFields.classList.contains('hidden')) {
                    apiInput.value = this.baseUrl;
                }
            };
        }

        if (btnSaveApi && apiInput) {
            btnSaveApi.onclick = () => {
                const newUrl = apiInput.value.trim();
                if (newUrl) {
                    this.updateBaseUrl(newUrl);
                    btnSaveApi.textContent = '✅ LINK ESTABLISHED';
                    setTimeout(() => {
                        btnSaveApi.textContent = 'APPLY LINK';
                        configFields.classList.add('hidden');
                    }, 1500);
                }
            };
        }

        // Help Toggle Logic
        const btnShowHelp = document.getElementById('btnShowAuthHelp');
        const helpSection = document.getElementById('authHelpSection');
        if (btnShowHelp && helpSection) {
            btnShowHelp.onclick = () => {
                helpSection.classList.toggle('hidden');
            };
        }
    }

    updateBaseUrl(newUrl) {
        this.baseUrl = newUrl.replace(/\/$/, '');
        localStorage.setItem('apiUrl', this.baseUrl);
        console.log(`[AUTH] API Base URL recalibrated: ${this.baseUrl}`);

        // Broadcast to main core
        if (window.saarthi) {
            window.saarthi.apiUrl = this.baseUrl;
            if (window.saarthi.network) window.saarthi.network.baseUrl = this.baseUrl;
        }

        // Trigger immediate health check
        this.checkHealth();
    }

    async checkAuthState() {
        if (this.token) {
            try {
                const response = await fetch(`${this.baseUrl}/health`, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'ngrok-skip-browser-warning': 'true'
                    }
                });
                if (response.ok) {
                    this.onAuthSuccess();
                } else {
                    this.showAuthOverlay();
                }
            } catch (e) {
                this.showAuthOverlay();
            }
        } else {
            this.showAuthOverlay();
        }
    }

    showAuthOverlay() {
        const overlay = document.getElementById('authOverlay');
        const card = document.querySelector('.auth-card');
        overlay.classList.add('active');

        if (window.gsap) {
            const tl = gsap.timeline();

            tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 1.5 });

            tl.fromTo(card,
                { opacity: 0, scale: 0.7, rotateX: 20, y: 100 },
                { opacity: 1, scale: 1, rotateX: 0, y: 0, duration: 2, ease: "expo.out" },
                "-=1"
            );

            tl.from(".auth-header > *, .auth-tabs, .auth-form > *", {
                opacity: 0,
                y: 20,
                stagger: 0.1,
                duration: 1,
                ease: "power2.out"
            }, "-=1.2");
        }
    }

    onAuthSuccess(username = 'AGENT') {
        const overlay = document.getElementById('authOverlay');
        const card = document.querySelector('.auth-card');

        if (window.gsap && overlay.classList.contains('active')) {
            const tl = gsap.timeline({
                onComplete: () => {
                    overlay.classList.remove('active');
                    this.loadSessions();
                    if (window.saarthi) window.saarthi.startSupremacySequence();
                }
            });

            tl.to(".auth-card > *", { opacity: 0, y: -20, stagger: 0.05, duration: 0.5 });

            tl.to(card, {
                scaleX: 1.5,
                scaleY: 0.001,
                opacity: 0,
                duration: 0.6,
                ease: "expo.in"
            });

            tl.to(overlay, {
                opacity: 0,
                duration: 0.8,
                backdropFilter: "blur(0px)"
            }, "-=0.2");
        } else {
            overlay.classList.remove('active');
            this.loadSessions();
        }

        document.getElementById('diagnosticOverlay').classList.remove('active');
        const displayEl = document.getElementById('displayUsername');
        if (displayEl) displayEl.textContent = username.toUpperCase();

        const sideProfileName = document.querySelector('.side-left .chip-value');
        if (sideProfileName) sideProfileName.textContent = `${username.toUpperCase()} • ONLINE`;

        if (window.saarthi) window.saarthi.apiUrl = this.baseUrl;
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const username = document.getElementById('authUsername').value;
        const password = document.getElementById('authPassword').value;
        const endpoint = this.activeTab === 'login' ? '/auth/login' : '/auth/register';
        const url = `${this.baseUrl}${endpoint}`;

        console.log(`[AUTH] Initiating ${this.activeTab} uplink to: ${url}`);

        try {
            let body;
            let headers = {};

            if (this.activeTab === 'login') {
                body = new URLSearchParams();
                body.append('username', username);
                body.append('password', password);
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                body = JSON.stringify({ username, password });
                headers['Content-Type'] = 'application/json';
            }
            headers['ngrok-skip-browser-warning'] = 'true';

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ detail: 'Neural Link Fault' }));
                console.error("[AUTH] Server Error Response:", err);
                const msg = err.detail || err.error || 'Access Denied';
                const errors = err.errors ? `\nDetails: ${JSON.stringify(err.errors)}` : '';
                const hint = err.hint ? `\n\nSuggestion: ${err.hint}` : '';

                this.showDiagnostic("Authentication Failure", msg + errors + hint);
                return;
            }

            const data = await response.json();
            this.token = data.access_token;
            localStorage.setItem('saarthi_token', this.token);
            this.onAuthSuccess(username);
        } catch (err) {
            console.error("[AUTH] Fetch Error:", err);
            this.showDiagnostic("Neural Uplink Fault", `Unable to establish connection to the neural backend at ${this.baseUrl}. Ensure the server is active.`);
        }
    }

    showDiagnostic(title, message) {
        const overlay = document.getElementById('diagnosticOverlay');
        const titleEl = overlay.querySelector('.diag-title');
        const msgEl = document.getElementById('diagMessage');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        overlay.classList.add('active');

        // Voice Synthesis for the mistake
        if (window.saarthi && window.saarthi.speak) {
            window.saarthi.speak(`Neural Fault. ${title}.`);
        }
    }

    logout() {
        localStorage.removeItem('saarthi_token');
        localStorage.removeItem('saarthi_current_session');
        location.reload();
    }

    async createNewSession() {
        const title = prompt("Enter conversation title:", "New Conversation") || "Untitled Chat";
        try {
            const res = await this.apiFetch('/sessions/', {
                method: 'POST',
                body: JSON.stringify({ title })
            });
            const session = await res.json();
            this.switchSession(session.id);
            this.loadSessions();
        } catch (e) {
            console.error("Failed to create session", e);
        }
    }

    async loadSessions() {
        try {
            const res = await this.apiFetch('/sessions/');
            const sessions = await res.json();
            const list = document.getElementById('sessionList');
            list.innerHTML = '';

            sessions.forEach(s => {
                const item = document.createElement('div');
                item.className = `session-item ${s.id === this.currentSessionId ? 'active' : ''}`;
                item.dataset.id = s.id;

                const titleSpan = document.createElement('span');
                titleSpan.textContent = s.title;
                titleSpan.onclick = () => this.switchSession(s.id);
                item.appendChild(titleSpan);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-session-delete';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.title = 'Purge Neural Context';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Purge context "${s.title}"?`)) {
                        this.deleteSession(s.id);
                    }
                };
                item.appendChild(deleteBtn);

                list.appendChild(item);
            });


            if (!this.currentSessionId && sessions.length > 0) {
                this.switchSession(sessions[0].id);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }

    async deleteSession(sessionId) {
        try {
            await this.apiFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
                localStorage.removeItem('saarthi_current_session');
            }
            this.loadSessions();
        } catch (e) {
            console.error("Deletion failed", e);
        }
    }

    switchSession(sessionId) {

        this.currentSessionId = sessionId;
        localStorage.setItem('saarthi_current_session', sessionId);

        // Update UI
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === sessionId);
        });

        // Trigger message load in script.js (via custom event)
        window.dispatchEvent(new CustomEvent('sessionChanged', { detail: { sessionId } }));
    }

    async startHealthCheck() {
        const check = async () => {
            await this.checkHealth();
        };
        check();
        this.healthInterval = setInterval(check, 5000);
    }

    async checkHealth() {
        const updateStatus = (isOnline, label = 'OFFLINE') => {
            const statusIndicator = document.getElementById('authStatus');
            const topStatus = document.getElementById('statusText');
            if (!statusIndicator) return;

            if (isOnline) {
                statusIndicator.classList.add('online');
                statusIndicator.querySelector('.status-label').textContent = 'UPLINK ACTIVE';
                if (topStatus && !window.saarthi?.state.includes('PROCESS')) {
                    topStatus.textContent = 'SYSTEM: OPERATIONAL';
                    topStatus.style.color = '#22d3ee';
                }
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.querySelector('.status-label').textContent = label;
                if (topStatus) {
                    topStatus.textContent = `LINK: ${label}`;
                    topStatus.style.color = '#f43f5e';
                }
            }
        };

        try {
            const res = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'ngrok-skip-browser-warning': 'true' },
                signal: AbortSignal.timeout(5000)
            });
            updateStatus(res.ok);
            return res.ok;
        } catch (e) {
            let label = 'OFFLINE';
            if (e.name === 'TimeoutError') label = 'LINK TIMEOUT';
            else if (e.message.includes('fetch')) label = 'CONNECTION REFUSED';

            updateStatus(false, label);
            return false;
        }
    }

    async apiFetch(endpoint, options = {}) {
        const base = (localStorage.getItem('apiUrl') || this.baseUrl).replace(/\/$/, '');
        const url = `${base}${endpoint}`;

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...options.headers
        };

        if (!headers['Content-Type']) delete headers['Content-Type'];

        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            this.logout();
            throw new Error("Unauthorized");
        }
        return res;
    }
}

const auth = new SaarthiAuth();
window.saarthiAuth = auth;
