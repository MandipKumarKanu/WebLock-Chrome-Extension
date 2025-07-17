class WebLockPopup {
    constructor() {
        this.setupPage = document.getElementById('setupPage');
        this.mainPage = document.getElementById('mainPage');
        this.forgotPasswordPage = document.getElementById('forgotPasswordPage');
        this.init();
    }

    async init() {
        await this.checkInitialSetup();
        this.bindEvents();
    }

    async checkInitialSetup() {
        const data = await this.getStorageData(['isSetup', 'recoveryEmail', 'passwordHash']);
        if (data.isSetup) {
            this.showMainPage();
            await this.loadLockedUrls();
        } else {
            this.showSetupPage();
        }
    }

    showSetupPage() {
        this.hideAllPages();
        this.setupPage.classList.remove('hidden');
    }

    showMainPage() {
        this.hideAllPages();
        this.mainPage.classList.remove('hidden');
    }

    showForgotPasswordPage() {
        this.hideAllPages();
        this.forgotPasswordPage.classList.remove('hidden');
    }

    hideAllPages() {
        this.setupPage.classList.add('hidden');
        this.mainPage.classList.add('hidden');
        this.forgotPasswordPage.classList.add('hidden');
    }

    bindEvents() {
        document.getElementById('setupForm').addEventListener('submit', this.handleSetup.bind(this));
        document.getElementById('addUrlBtn').addEventListener('click', this.handleAddUrl.bind(this));
        document.getElementById('forgotPasswordMainBtn').addEventListener('click', this.triggerForgotPassword.bind(this));
        document.getElementById('resetBtn').addEventListener('click', this.handleReset.bind(this));
        document.getElementById('verifyOtpBtn').addEventListener('click', this.handleVerifyOtp.bind(this));
        document.getElementById('resetPasswordBtn').addEventListener('click', this.handleResetPassword.bind(this));
        document.getElementById('backToMainBtn').addEventListener('click', this.showMainPage.bind(this));
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAddUrl();
            }
        });
    }

    async handleSetup(e) {
        e.preventDefault();
        const email = document.getElementById('recoveryEmail').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        this.clearErrors();
        if (!this.isValidEmail(email)) {
            this.showError('emailError', 'Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            this.showError('passwordError', 'Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            this.showError('confirmError', 'Passwords do not match');
            return;
        }
        const passwordHash = await this.hashPassword(password);
        await this.setStorageData({
            isSetup: true,
            recoveryEmail: email,
            passwordHash: passwordHash,
            lockedUrls: []
        });
        this.showMainPage();
    }

    async handleAddUrl() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        if (!this.isValidUrl(url)) {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }
        const data = await this.getStorageData(['lockedUrls']);
        const lockedUrls = data.lockedUrls || [];
        if (lockedUrls.some(item => item.url === url)) {
            alert('This URL is already locked');
            return;
        }
        lockedUrls.push({
            url: url,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        });
        await this.setStorageData({ lockedUrls });
        urlInput.value = '';
        await this.loadLockedUrls();
    }

    async loadLockedUrls() {
        const data = await this.getStorageData(['lockedUrls']);
        const lockedUrls = data.lockedUrls || [];
        const listContainer = document.getElementById('lockedUrlsList');
        const emptyState = document.getElementById('emptyState');
        if (lockedUrls.length === 0) {
            listContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');
        listContainer.innerHTML = lockedUrls.map(item => `
            <div class="url-item" data-id="${item.id}">
                <div class="url-text">${item.url}</div>
                <div class="url-actions">
                    <button class="btn btn-unlock" onclick="webLockPopup.unlockUrl('${item.id}')">🔓 Unlock</button>
                    <button class="btn btn-remove" onclick="webLockPopup.removeUrl('${item.id}')">❌ Remove</button>
                </div>
            </div>
        `).join('');
    }

    async unlockUrl(id) {
        const data = await this.getStorageData(['temporarilyUnlocked']);
        const temporarilyUnlocked = data.temporarilyUnlocked || [];
        if (!temporarilyUnlocked.includes(id)) {
            temporarilyUnlocked.push(id);
            await this.setStorageData({ temporarilyUnlocked });
        }
        alert('URL temporarily unlocked until browser restart');
    }

    async removeUrl(id) {
        if (!confirm('Are you sure you want to remove this URL from the lock list?')) {
            return;
        }
        const data = await this.getStorageData(['lockedUrls']);
        const lockedUrls = data.lockedUrls || [];
        const updatedUrls = lockedUrls.filter(item => item.id !== id);
        await this.setStorageData({ lockedUrls: updatedUrls });
        await this.loadLockedUrls();
    }

    async handleReset() {
        if (!confirm('This will reset the entire extension. Are you sure?')) {
            return;
        }
        await chrome.storage.local.clear();
        this.showSetupPage();
    }

    async handleVerifyOtp() {
        const otpInput = document.getElementById('otpInput');
        const enteredOtp = otpInput.value.trim();
        const data = await this.getStorageData(['resetOtp']);
        if (!data.resetOtp || enteredOtp !== data.resetOtp) {
            alert('Invalid OTP. Please try again.');
            return;
        }
        document.getElementById('otpStep').classList.add('hidden');
        document.getElementById('resetPasswordStep').classList.remove('hidden');
    }

    async handleResetPassword() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            alert('Passwords do not match');
            return;
        }
        const passwordHash = await this.hashPassword(newPassword);
        await this.setStorageData({ 
            passwordHash: passwordHash,
            resetOtp: null
        });
        alert('Password reset successfully!');
        this.showMainPage();
        document.getElementById('otpStep').classList.remove('hidden');
        document.getElementById('resetPasswordStep').classList.add('hidden');
        document.getElementById('otpInput').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error');
        errorElements.forEach(el => el.textContent = '');
    }

    async getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    async setStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }

    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async triggerForgotPassword() {
        const otp = this.generateOtp();
        await this.setStorageData({ resetOtp: otp });
        console.log('Generated OTP:', otp);
        alert(`OTP sent to your recovery email. For demo purposes, the OTP is: ${otp}`);
        this.showForgotPasswordPage();
    }
}

let webLockPopup;
document.addEventListener('DOMContentLoaded', () => {
    webLockPopup = new WebLockPopup();
});

window.webLockPopup = {
    unlockUrl: (id) => webLockPopup.unlockUrl(id),
    removeUrl: (id) => webLockPopup.removeUrl(id),
    triggerForgotPassword: () => webLockPopup.triggerForgotPassword()
};
