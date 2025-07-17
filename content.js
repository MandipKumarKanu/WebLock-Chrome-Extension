class WebLockContent {
    constructor() {
        this.modal = null;
        this.isModalShown = false;
        this.init();
    }

    async init() {
        if (window.webLockInitialized) return;
        window.webLockInitialized = true;
        await this.checkIfBlocked();
    }

    async checkIfBlocked() {
        try {
            const currentUrl = window.location.href;
            const data = await this.getStorageData(['lockedUrls', 'temporarilyUnlocked', 'isSetup']);
            if (!data.isSetup) return;
            const lockedUrls = data.lockedUrls || [];
            const temporarilyUnlocked = data.temporarilyUnlocked || [];
            const lockedUrl = lockedUrls.find(item => this.urlMatches(currentUrl, item.url));
            if (lockedUrl && !temporarilyUnlocked.includes(lockedUrl.id)) {
                this.showModal(lockedUrl);
            }
        } catch (error) {
            console.error('WebLock error:', error);
        }
    }

    urlMatches(currentUrl, lockedUrl) {
        try {
            const current = new URL(currentUrl);
            const locked = new URL(lockedUrl);
            return current.hostname === locked.hostname && 
                   current.pathname.startsWith(locked.pathname);
        } catch (error) {
            return false;
        }
    }

    showModal(lockedUrlData) {
        if (this.isModalShown) return;
        this.isModalShown = true;
        this.modal = document.createElement('div');
        this.modal.id = 'weblock-modal';
        this.modal.innerHTML = `
            <div class="weblock-overlay">
                <div class="weblock-modal-content">
                    <div class="weblock-header">
                        <h1>🔐 WebLock</h1>
                        <p>This website is locked</p>
                    </div>
                    <div class="weblock-form">
                        <div class="weblock-form-group">
                            <label for="weblock-password">Enter Password to Unlock:</label>
                            <input type="password" id="weblock-password" placeholder="Enter your password">
                            <div class="weblock-error" id="weblock-error"></div>
                        </div>
                        <div class="weblock-checkbox-group">
                            <label>
                                <input type="checkbox" id="weblock-dont-ask"> 
                                Don't ask again until I close the browser
                            </label>
                        </div>
                        <div class="weblock-actions">
                            <button id="weblock-unlock-btn" class="weblock-btn weblock-btn-primary">Unlock</button>
                            <button id="weblock-forgot-btn" class="weblock-btn weblock-btn-secondary">Forgot Password?</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
        this.bindModalEvents(lockedUrlData);
        setTimeout(() => {
            document.getElementById('weblock-password').focus();
        }, 100);
        document.body.style.overflow = 'hidden';
    }

    bindModalEvents(lockedUrlData) {
        const passwordInput = document.getElementById('weblock-password');
        const unlockBtn = document.getElementById('weblock-unlock-btn');
        const forgotBtn = document.getElementById('weblock-forgot-btn');
        const dontAskCheckbox = document.getElementById('weblock-dont-ask');
        const errorDiv = document.getElementById('weblock-error');
        unlockBtn.addEventListener('click', () => this.handleUnlock(lockedUrlData, passwordInput, dontAskCheckbox, errorDiv));
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUnlock(lockedUrlData, passwordInput, dontAskCheckbox, errorDiv);
            }
        });
        forgotBtn.addEventListener('click', this.handleForgotPassword.bind(this));
        const modalContent = this.modal.querySelector('.weblock-modal-content');
        modalContent.addEventListener('click', (e) => e.stopPropagation());
    }

    async handleUnlock(lockedUrlData, passwordInput, dontAskCheckbox, errorDiv) {
        const password = passwordInput.value;
        if (!password) {
            this.showError(errorDiv, 'Please enter your password');
            return;
        }
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'verifyPassword',
                password: password
            });
            if (response.valid) {
                if (dontAskCheckbox.checked) {
                    await chrome.runtime.sendMessage({
                        action: 'unlockTemporarily',
                        urlId: lockedUrlData.id,
                        dontAskAgain: true
                    });
                }
                this.hideModal();
            } else {
                this.showError(errorDiv, 'Incorrect password. Please try again.');
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            this.showError(errorDiv, 'Error verifying password. Please try again.');
        }
    }

    async handleForgotPassword() {
        try {
            alert('To reset your password:\n\n1. Click the WebLock extension icon in your browser toolbar\n2. Use the forgot password option in the popup\n\nThe popup will handle the password reset process.');
        } catch (error) {
            console.error('Error with forgot password:', error);
        }
    }

    showError(errorDiv, message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideModal() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
            this.isModalShown = false;
            document.body.style.overflow = '';
        }
    }

    async getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WebLockContent();
    });
} else {
    new WebLockContent();
}
