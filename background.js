class WebLockBackground {
  constructor() {
    this.recentRedirects = new Map();
    this.tabSessions = new Map();
    this.setupComplete = false;
    this.init();
  }

  async init() {
    await this.checkSetupStatus();
    
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.runtime.onStartup.addListener(this.clearTemporaryUnlocks.bind(this));
    chrome.runtime.onInstalled.addListener(this.clearTemporaryUnlocks.bind(this));
    chrome.action.onClicked.addListener(this.handleIconClick.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    if (this.setupComplete) {
      this.addNavigationListeners();
      await this.initializeSessionData();
      this.startPeriodicRefresh();
    }
  }

  async checkSetupStatus() {
    try {
      const data = await this.getStorageData(["isSetup"]);
      this.setupComplete = !!data.isSetup;
    } catch (error) {
      this.setupComplete = false;
    }
  }

  addNavigationListeners() {
    chrome.webNavigation.onBeforeNavigate.addListener(
      this.handleNavigation.bind(this),
      { url: [{ schemes: ["http", "https"] }] }
    );
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
  }

  async initializeSessionData() {
    try {
      const data = await this.getStorageData([
        "sessionUnlocked",
        "extensionStartTime",
        "tabSessions"
      ]);
      
      const now = Date.now();
      const lastStartTime = data.extensionStartTime || 0;
      const timeDiff = now - lastStartTime;

      const storedTabSessions = data.tabSessions || {};
      this.tabSessions.clear();
      for (const [key, timestamp] of Object.entries(storedTabSessions)) {
        this.tabSessions.set(key, timestamp);
      }

      if (timeDiff > 5 * 60 * 1000) {
        await this.setStorageData({
          sessionUnlocked: [],
          oneTimeUnlock: [],
          dontAskAgainUrls: [],
          extensionStart极Time: now,
        });
      }
    } catch (error) {
      console.error("WebLock Error in initializeSessionData:", error);
    }
  }

  startPeriodicRefresh() {
    if (!this.setupComplete) return;
    
    setInterval(async () => {
      try {
        await this.ensureTabSessionsLoaded();
      } catch (error) {
        console.error("WebLock Error in periodic refresh:", error);
      }
    }, 15000);
  }

  async clearTemporaryUnlocks() {
    try {
      const data = await this.getStorageData(["isSetup"]);
      if (!data.isSetup) return;
      
      await this.setStorageData({
        temporarilyUnlocked: [],
        oneTimeUnlock: [],
      });
    } catch (error) {
      console.error("WebLock Error in clearTemporaryUnlocks:", error);
    }
  }

  async handleNavigation(details) {
    if (details.frameId !== 0) return;
    if (!this.setupComplete) return;
    if (details.url.includes(chrome.runtime.getURL("options.html"))) return;
    
    setTimeout(async () => {
      await this.checkAndBlockUrl(details.url, details.tabId);
    }, 500);
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (!changeInfo.url && changeInfo.status !== "loading") return;
    if (!this.setupComplete) return;
    
    const url = changeInfo.url || tab.url;
    if (url) {
      if (url.includes(chrome.runtime.getURL("options.html"))) return;
      
      setTimeout(async () => {
        await this.checkAndBlockUrl(url, tabId);
      }, 300);
    }
  }

  async handleTabRemoved(tabId, removeInfo) {
    for (const [key, timestamp] of this.tabSessions.entries()) {
      if (key.startsWith(`${tabId}-`)) {
        this.tabSessions.delete(key);
      }
    }

    await this.saveTabSessions();

    if (removeInfo.isWindowClosing) {
      const windows = await chrome.windows.getAll();
      if (windows.length <= 1) {
        const sessionData = await this.getStorageData([
          "sessionUnlocked",
          "dontAskAgainUrls",
        ]);
        const updateData = {};
        if (
          sessionData.sessionUnlocked &&
          sessionData.sessionUnlocked.length > 0
        ) {
          updateData.sessionUnlocked = [];
        }
        if (
          sessionData.dontAskAgainUrls &&
          sessionData.dontAskAgainUrls.length > 0
        ) {
          updateData.dontAskAgainUrls = [];
        }
        if (Object.keys(updateData).length > 0) {
          await this.setStorageData(updateData);
        }
        this.tabSessions.clear();
        await this.saveTabSessions();
      }
    }
    if (removeInfo.isWindowClosing) {
      const data = await this.getStorageData(["oneTimeUnlock"]);
      if (data.oneTimeUnlock && data.oneTimeUnlock.length > 0) {
        await this.setStorageData({ oneTimeUnlock: [] });
      }
    }
  }

  async checkAndBlockUrl(url, tabId) {
    try {
      if (url.includes(chrome.runtime.getURL("options.html"))) {
        return;
      }
      
      const data = await this.getStorageData([
        "lockedUrls",
        "temporarilyUnlocked",
        "sessionUnlocked",
        "oneTimeUnlock",
        "dontAskAgainUrls",
        "isSetup",
      ]);
      
      if (!data.isSetup) {
        return;
      }
      
      await this.ensureTabSessionsLoaded();
      
      const lockedUrls = data.lockedUrls || [];
      const temporarilyUnlocked = data.temporarilyUnlocked || [];
      const sessionUnlocked = data.sessionUnlocked || [];
      const oneTimeUnlock = data.oneTimeUnlock || [];
      const dontAskAgainUrls = data.dontAskAgainUrls || [];
      const lockedUrl = lockedUrls.find((item) =>
        this.urlMatches(url, item.url)
      );
      
      if (lockedUrl) {
        const isTemporarilyUnlocked = temporarilyUnlocked.includes(
          lockedUrl.id
        );
        const isInDontAskAgainList = dontAskAgainUrls.includes(lockedUrl.id);
        const isSessionUnlocked =
          isInDontAskAgainList && sessionUnlocked.includes(lockedUrl.id);
        const isOneTimeUnlocked = oneTimeUnlock.includes(lockedUrl.id);
        const tabSessionKey = `${tabId}-${lockedUrl.id}`;
        const isTabUnlocked = this.tabSessions.has(tabSessionKey);

        if (
          !isTemporarilyUnlocked &&
          !isSessionUnlocked &&
          !isOneTimeUnlocked &&
          !isTabUnlocked
        ) {
          const redirectKey = `${tabId}-${lockedUrl.id}`;
          const now = Date.now();
          const lastRedirect = this.recentRedirects.get(redirectKey);
          if (lastRedirect && now - lastRedirect < 5000) {
            return;
          }
          this.recentRedirects.set(redirectKey, now);
          for (const [key, timestamp] of this.recentRedirects.entries()) {
            if (now - timestamp > 10000) {
              this.recentRedirects.delete(key);
            }
          }
          const unlockPageUrl =
            chrome.runtime.getURL("options.html") +
            `?action=unlock&url=${encodeURIComponent(url)}`;
          await chrome.tabs.update(tabId, { url: unlockPageUrl });
        } else {
          if (isOneTimeUnlocked) {
            setTimeout(async () => {
              try {
                const clearData = await this.getStorageData(["oneTimeUnlock"]);
                const updatedOneTime = (clearData.oneTimeUnlock || []).filter(
                  (id) => id !== lockedUrl.id
                );
                await this.setStorageData({ oneTimeUnlock: updatedOneTime });
              } catch (error) {}
            }, 30000);
          }
        }
      }
    } catch (error) {
      console.error("WebLock Error:", error);
    }
  }

  async ensureTabSessionsLoaded() {
    const data = await this.getStorageData(["tabSessions"]);
    const storedTabSessions = data.tabSessions || {};
    
    for (const [key, timestamp] of Object.entries(storedTabSessions)) {
      this.tabSessions.set(key, timestamp);
    }
  }

  urlMatches(currentUrl, lockedUrl) {
    try {
      const current = new URL(currentUrl);
      const locked = new URL(lockedUrl);

      // Normalize hostnames by removing www prefix for comparison
      const normalizeHostname = (hostname) => {
        return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
      };

      const currentNormalized = normalizeHostname(current.hostname);
      const lockedNormalized = normalizeHostname(locked.hostname);

      return currentNormalized === lockedNormalized;
    } catch (error) {
      return false;
    }
  }

  async injectModal(tabId) {}

  async handleIconClick(tab) {
    const unlockPageUrl =
      chrome.runtime.getURL("options.html") + "?action=dashboard";
    await chrome.tabs.create({
      url: unlockPageUrl,
    });
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
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
    const timestamp = Date.now();
    this.tabSessions.set(tabSessionKey, timestamp);
    this.saveTabSessions();
    return true;
  }

  async saveTabSessions() {
    const tabSessionsObj = {};
    for (const [key, timestamp] of this.tabSessions.entries()) {
      tabSessionsObj[key] = timestamp;
    }
    await this.setStorageData({ tabSessions: tabSessionsObj });
  }

  async handleMessage(request, sender, sendResponse) {
    if (request.action === "unlockTabSession") {
      try {
        const { tabId, urlId } = request;
        const success = this.unlockTabSession(tabId, urlId);
        sendResponse({ success: success });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    if (request.action === "setupComplete") {
      this.setupComplete = true;
      
      sendResponse({ success: true });
      
      this.addNavigationListeners();
      
      this.initializeSessionData().then(() => {
        this.startPeriodicRefresh();
      }).catch(error => {
        console.error("WebLock Error during post-setup initialization:", error);
      });
      
      return true;
    }
    
    sendResponse({ success: false, error: "Unknown action" });
    return true;
  }
}

new WebLockBackground();