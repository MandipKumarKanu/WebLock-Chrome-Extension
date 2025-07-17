class WebLockBackground {
    constructor() {
        this.recentRedirects = new Map(); 
        this.tabSessions = new Map();
        this.init();
    }

    init() {
        chrome.webNavigation.onBeforeNavigate.addListener(
            this.handleNavigation.bind(this),
            { url: [{ schemes: ['http', 'https'] }] }
        );
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
        chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
        chrome.runtime.onStartup.addListener(this.clearTemporaryUnlocks.bind(this));
        chrome.runtime.onInstalled.addListener(this.clearTemporaryUnlocks.bind(this));
        chrome.action.onClicked.addListener(this.handleIconClick.bind(this));
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        this.initializeSessionData();
    }

    async initializeSessionData() {
        const data = await this.getStorageData(['sessionUnlocked', 'extensionStartTime']);
        const now = Date.now();
        const lastStartTime = data.extensionStartTime || 0;
        const timeDiff = now - lastStartTime;
        if (timeDiff > 5 * 60 * 1000) { 
            await this.setStorageData({ 
                sessionUnlocked: [],
                oneTimeUnlock: [],
                dontAskAgainUrls: [],
                extensionStartTime: now
            });
            this.tabSessions.clear();
        } else {
            await this.setStorageData({ extensionStartTime: now });
            const oneHourAgo = now - (60 * 60 * 1000);
            for (const [key, timestamp] of this.tabSessions.entries()) {
                if (timestamp < oneHourAgo) {
                    this.tabSessions.delete(key);
                }
            }
        }
    }

    async handleNavigation(details) {
        if (details.frameId !== 0) return;
        if (details.url.includes(chrome.runtime.getURL('options.html'))) return;
        setTimeout(async () => {
            await this.checkAndBlockUrl(details.url, details.tabId);
        }, 200);
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        if (!changeInfo.url && changeInfo.status !== 'loading') return;
        const url = changeInfo.url || tab.url;
        if (url) {
            if (url.includes(chrome.runtime.getURL('options.html'))) return;
            await this.checkAndBlockUrl(url, tabId);
        }
    }

    async handleTabRemoved(tabId, removeInfo) {
        for (const [key, timestamp] of this.tabSessions.entries()) {
            if (key.startsWith(`${tabId}-`)) {
                this.tabSessions.delete(key);
            }
        }
        if (removeInfo.isWindowClosing) {
            const windows = await chrome.windows.getAll();
            if (windows.length <= 1) {
                const sessionData = await this.getStorageData(['sessionUnlocked', 'dontAskAgainUrls']);
                const updateData = {};
                if (sessionData.sessionUnlocked && sessionData.sessionUnlocked.length > 0) {
                    updateData.sessionUnlocked = [];
                }
                if (sessionData.dontAskAgainUrls && sessionData.dontAskAgainUrls.length > 0) {
                    updateData.dontAskAgainUrls = [];
                }
                if (Object.keys(updateData).length > 0) {
                    await this.setStorageData(updateData);
                }
                this.tabSessions.clear();
            }
        }
        if (removeInfo.isWindowClosing) {
            const data = await this.getStorageData(['oneTimeUnlock']);
            if (data.oneTimeUnlock && data.oneTimeUnlock.length > 0) {
                await this.setStorageData({ oneTimeUnlock: [] });
            }
        }
    }

    async checkAndBlockUrl(url, tabId) {
        try {
            const data = await this.getStorageData(['lockedUrls', 'temporarilyUnlocked', 'sessionUnlocked', 'oneTimeUnlock', 'dontAskAgainUrls', 'isSetup']);
            if (!data.isSetup) {
                return;
            }
            const lockedUrls = data.lockedUrls || [];
            const temporarilyUnlocked = data.temporarilyUnlocked || [];
            const sessionUnlocked = data.sessionUnlocked || [];
            const oneTimeUnlock = data.oneTimeUnlock || [];
            const dontAskAgainUrls = data.dontAskAgainUrls || [];
            const lockedUrl = lockedUrls.find(item => this.urlMatches(url, item.url));
            if (lockedUrl) {
                const isTemporarilyUnlocked = temporarilyUnlocked.includes(lockedUrl.id);
                const isInDontAskAgainList = dontAskAgainUrls.includes(lockedUrl.id);
                const isSessionUnlocked = isInDontAskAgainList && sessionUnlocked.includes(lockedUrl.id);
                const isOneTimeUnlocked = oneTimeUnlock.includes(lockedUrl.id);
                const tabSessionKey = `${tabId}-${lockedUrl.id}`;
                const isTabUnlocked = this.tabSessions.has(tabSessionKey);
                if (!isTemporarilyUnlocked && !isSessionUnlocked && !isOneTimeUnlocked && !isTabUnlocked) {
                    const redirectKey = `${tabId}-${lockedUrl.id}`;
                    const now = Date.now();
                    const lastRedirect = this.recentRedirects.get(redirectKey);
                    if (lastRedirect && (now - lastRedirect) < 5000) {
                        return;
                    }
                    this.recentRedirects.set(redirectKey, now);
                    for (const [key, timestamp] of this.recentRedirects.entries()) {
                        if (now - timestamp > 10000) {
                            this.recentRedirects.delete(key);
                        }
                    }
                    const unlockPageUrl = chrome.runtime.getURL('options.html') + 
                        `?action=unlock&url=${encodeURIComponent(url)}`;
                    await chrome.tabs.update(tabId, { url: unlockPageUrl });
                } else {
                    if (isOneTimeUnlocked) {
                        setTimeout(async () => {
                            try {
                                const clearData = await this.getStorageData(['oneTimeUnlock']);
                                const updatedOneTime = (clearData.oneTimeUnlock || []).filter(id => id !== lockedUrl.id);
                                await this.setStorageData({ oneTimeUnlock: updatedOneTime });
                            } catch (error) {}
                        }, 30000);
                    }
                }
            }
        } catch (error) {}
    }

    urlMatches(currentUrl, lockedUrl) {
        try {
            const current = new URL(currentUrl);
            const locked = new URL(lockedUrl);
            let currentPath = current.pathname.replace(/\/$/, '') || '/';
            let lockedPath = locked.pathname.replace(/\/$/, '') || '/';
            const hostnameMatch = current.hostname === locked.hostname;
            const pathMatch = currentPath.startsWith(lockedPath);
            return hostnameMatch && pathMatch;
        } catch (error) {
            return false;
        }
    }

    async injectModal(tabId) {}

    async handleIconClick(tab) {
        const unlockPageUrl = chrome.runtime.getURL('options.html') + '?action=dashboard';
        await chrome.tabs.create({
            url: unlockPageUrl
        });
    }

    async clearTemporaryUnlocks() {
        await this.setStorageData({ 
            temporarilyUnlocked: [],
            oneTimeUnlock: []
        });
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
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

    unlockTabSession(tabId, urlId) {
        const tabSessionKey = `${tabId}-${urlId}`;
        this.tabSessions.set(tabSessionKey, Date.now());
        return true;
    }

    handleMessage(request, sender, sendResponse) {
        if (request.action === 'unlockTabSession') {
            try {
                const { tabId, urlId } = request;
                const success = this.unlockTabSession(tabId, urlId);
                sendResponse({ success: success });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
        }
        sendResponse({ success: false, error: 'Unknown action' });
        return true;
    }
}

new WebLockBackground();
