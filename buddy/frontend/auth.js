class BuddyAuth {
    constructor() {
        try {
            this.token = localStorage.getItem('buddy_token');
            this.baseUrl = (localStorage.getItem('apiUrl') || 'http://127.0.0.1:2520').replace(/\/$/, '');
            this.currentSessionId = localStorage.getItem('buddy_current_session');
        } catch (e) {
            console.warn('localStorage access failed, using memory fallback', e);
            this.token = null;
            this.baseUrl = 'http://127.0.0.1:2520';
            this.currentSessionId = null;
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

        btnToggleSidebar.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        btnLogout.addEventListener('click', () => this.logout());

        btnNewChat.addEventListener('click', () => this.createNewSession());
    }

    async checkAuthState() {
        if (this.token) {
            try {
                const response = await fetch(`${this.baseUrl}/health`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
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
        document.getElementById('authOverlay').classList.add('active');
    }

    onAuthSuccess(username = 'AGENT') {
        document.getElementById('authOverlay').classList.remove('active');
        document.getElementById('diagnosticOverlay').classList.remove('active'); // Clear residual errors
        this.loadSessions();
        // Update username display safely
        const displayEl = document.getElementById('displayUsername');
        if (displayEl) displayEl.textContent = username.toUpperCase();

        const sideProfileName = document.querySelector('.side-left .chip-value');
        if (sideProfileName) sideProfileName.textContent = `${username.toUpperCase()} • ONLINE`;

        // Broadcast to main core
        if (window.buddy) window.buddy.apiUrl = this.baseUrl;
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
            localStorage.setItem('buddy_token', this.token);
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
        if (window.buddy && window.buddy.speak) {
            window.buddy.speak(`Neural Fault. ${title}.`);
        }
    }

    logout() {
        localStorage.removeItem('buddy_token');
        localStorage.removeItem('buddy_current_session');
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
                item.dataset.id = s.id; // CRITICAL: Fix session switching
                item.textContent = s.title;
                item.onclick = () => this.switchSession(s.id);
                list.appendChild(item);
            });

            if (!this.currentSessionId && sessions.length > 0) {
                this.switchSession(sessions[0].id);
            }
        } catch (e) {
            console.error("Failed to load sessions", e);
        }
    }

    switchSession(sessionId) {
        this.currentSessionId = sessionId;
        localStorage.setItem('buddy_current_session', sessionId);

        // Update UI
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === sessionId);
        });

        // Trigger message load in script.js (via custom event)
        window.dispatchEvent(new CustomEvent('sessionChanged', { detail: { sessionId } }));
    }

    async startHealthCheck() {
        const updateStatus = (isOnline) => {
            const statusIndicator = document.getElementById('authStatus');
            if (!statusIndicator) return;

            if (isOnline) {
                statusIndicator.classList.add('online');
                statusIndicator.querySelector('.status-label').textContent = 'UPLINK ACTIVE';
            } else {
                statusIndicator.classList.remove('online');
                statusIndicator.querySelector('.status-label').textContent = 'OFFLINE';
            }
        };

        const check = async () => {
            try {
                const res = await fetch(`${this.baseUrl}/health`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000)
                });
                updateStatus(res.ok);
            } catch (e) {
                updateStatus(false);
            }
        };

        check();
        setInterval(check, 5000);
    }

    async apiFetch(endpoint, options = {}) {
        // Ensure accurate base URL
        const base = (localStorage.getItem('apiUrl') || 'http://127.0.0.1:2520').replace(/\/$/, '');
        const url = `${base}${endpoint}`;

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
            ...options.headers
        };

        // Remove Content-Type if it's undefined (FormData)
        if (!headers['Content-Type']) delete headers['Content-Type'];

        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            console.warn("[AUTH] Session expired or invalid token.");
            this.logout();
            throw new Error("Unauthorized");
        }
        return res;
    }
}

const auth = new BuddyAuth();
window.buddyAuth = auth;
