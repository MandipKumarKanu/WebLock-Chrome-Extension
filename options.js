class WebLockOptions {
  constructor() {
    console.log("WebLock Debug - Options constructor called");
    this.setupPage = document.getElementById("setupPage");
    this.mainPage = document.getElementById("mainPage");
    this.forgotPasswordPage = document.getElementById("forgotPasswordPage");
    this.unlockPage = document.getElementById("unlockPage");
    
    console.log("WebLock Debug - DOM elements found:", {
      setupPage: !!this.setupPage,
      mainPage: !!this.mainPage,
      forgotPasswordPage: !!this.forgotPasswordPage,
      unlockPage: !!this.unlockPage
    });
    
    this.init();
  }

  async init() {
    console.log("WebLock Debug - Init method called");
    
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get("action");
    const blockedUrl = urlParams.get("url");

    console.log("WebLock Debug - URL params:", { action, blockedUrl });

    if (action === "unlock" && blockedUrl) {
      let decodedUrl = blockedUrl;
      try {
        decodedUrl = decodeURIComponent(blockedUrl);
        if (decodedUrl.includes("%3A")) {
          decodedUrl = decodeURIComponent(decodedUrl);
        }
      } catch (error) {
        console.error("Error decoding URL:", error);
        decodedUrl = blockedUrl;
      }
      await this.showUnlockPage(decodedUrl);
      return;
    }

    if (action === "dashboard") {
      console.log("WebLock Debug - Dashboard action detected");
      const isSetup = await this.isSetupComplete();
      console.log("WebLock Debug - Setup complete:", isSetup);
      if (isSetup) {
        await this.showDashboardUnlockPage();
      } else {
        console.log("WebLock Debug - Setup not complete, showing setup page");
        this.showSetupPage();
      }
      return;
    }
    
    console.log("WebLock Debug - Default behavior, checking initial setup");
    await this.checkInitialSetup();
    this.bindEvents();
  }

  async isSetupComplete() {
    const data = await this.getStorageData(["isSetup"]);
    return !!data.isSetup;
  }

  async checkInitialSetup() {
    const isSetup = await this.isSetupComplete();
    if (isSetup) {
      this.showMainPage();
      await this.loadLockedUrls();
    } else {
      this.showSetupPage();
    }
  }

  showSetupPage() {
    this.hideAllPages();
    this.setupPage.classList.remove("hidden");
    document.title = "WebLock Setup";
    
    this.bindSetupPageEvents();
  }

  bindSetupPageEvents() {
    console.log("WebLock Debug - bindSetupPageEvents called");
    
    const setupForm = document.getElementById("setupForm");
    console.log("WebLock Debug - Setup form found:", !!setupForm);
    
    if (setupForm) {
      setupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("WebLock Debug - Form submit prevented");
        return false;
      });
    }
    
    const setupBtn = document.getElementById("setupWebLockBtn");
    console.log("WebLock Debug - Setup button found:", !!setupBtn);
    
    if (setupBtn) {
      console.log("WebLock Debug - Button text:", setupBtn.textContent);
      console.log("WebLock Debug - Button disabled:", setupBtn.disabled);
      
      setupBtn.replaceWith(setupBtn.cloneNode(true));
      const newSetupBtn = document.getElementById("setupWebLockBtn");
      console.log("WebLock Debug - Button replaced, adding click listener");
      
      newSetupBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Setup button clicked!");
        this.handleSetup(e);
      });
      console.log("WebLock Debug - Click listener added successfully");
    }
    
    const setupInputs = document.querySelectorAll("#setupForm input");
    console.log("WebLock Debug - Found", setupInputs.length, "form inputs");
    
    setupInputs.forEach((input, index) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          console.log("Enter key pressed on input", index);
          this.handleSetup(e);
        }
      });
    });
    
    console.log("WebLock Debug - bindSetupPageEvents completed");
  }

  showMainPage() {
    this.hideAllPages();
    this.mainPage.classList.remove("hidden");
    document.title = "WebLock Dashboard";
    this.bindMainPageEvents();
    this.loadLockedUrls();
    setTimeout(() => {
      this.bindUrlActionEvents();
    }, 100);
  }

  showForgotPasswordPage() {
    this.hideAllPages();
    this.forgotPasswordPage.classList.remove("hidden");
    document.title = "Reset Password - WebLock";
  }

  async showUnlockPage(blockedUrl) {
    this.hideAllPages();
    this.unlockPage.classList.remove("hidden");
    document.title = "Website Locked - WebLock";
    const urlDisplay = document.getElementById("blockedUrlDisplay");
    if (urlDisplay) {
      try {
        let decodedUrl = blockedUrl;
        let attempts = 0;
        while (attempts < 3) {
          try {
            const urlObj = new URL(decodedUrl);
            urlDisplay.textContent = `Access to ${urlObj.hostname} is restricted`;
            break;
          } catch (e) {
            decodedUrl = decodeURIComponent(decodedUrl);
            attempts++;
            if (attempts >= 3) throw e;
          }
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
        let hostname = blockedUrl;
        try {
          hostname = decodeURIComponent(blockedUrl);
        } catch (e) {}
        hostname = hostname
          .replace(/^https?:\/\//, "")
          .split("/")[0]
          .split("?")[0];
        urlDisplay.textContent = `Access to ${hostname} is restricted`;
      }
    }
    this.currentBlockedUrl = blockedUrl;
    this.dashboardAccess = false;
    this.bindUnlockPageEvents();
    setTimeout(() => {
      const passwordInput = document.getElementById("unlockPassword");
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }

  async showDashboardUnlockPage() {
    this.hideAllPages();
    this.unlockPage.classList.remove("hidden");
    document.title = "Dashboard Access - WebLock";
    const urlDisplay = document.getElementById("blockedUrlDisplay");
    if (urlDisplay) {
      urlDisplay.textContent = "🔒 Dashboard Access Required";
    }
    const dontAskContainer = document.querySelector(".checkbox-container");
    if (dontAskContainer) {
      dontAskContainer.style.display = "none";
    }
    this.dashboardAccess = true;
    this.currentBlockedUrl = null;
    this.bindUnlockPageEvents();
    setTimeout(() => {
      const passwordInput = document.getElementById("unlockPassword");
      if (passwordInput) {
        passwordInput.focus();
      }
    }, 100);
  }

  bindUnlockPageEvents() {
    const unlockBtn = document.getElementById("unlockBtn");
    if (unlockBtn) {
      unlockBtn.replaceWith(unlockBtn.cloneNode(true));
      const newUnlockBtn = document.getElementById("unlockBtn");
      newUnlockBtn.addEventListener(
        "click",
        this.handleUnlockWebsite.bind(this)
      );
    }
    const unlockPassword = document.getElementById("unlockPassword");
    if (unlockPassword) {
      unlockPassword.replaceWith(unlockPassword.cloneNode(true));
      const newPasswordInput = document.getElementById("unlockPassword");
      newPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleUnlockWebsite();
        }
      });
    }
    const forgotPasswordUnlockBtn = document.getElementById(
      "forgotPasswordUnlockBtn"
    );
    if (forgotPasswordUnlockBtn) {
      forgotPasswordUnlockBtn.replaceWith(
        forgotPasswordUnlockBtn.cloneNode(true)
      );
      const newForgotBtn = document.getElementById("forgotPasswordUnlockBtn");
      newForgotBtn.addEventListener(
        "click",
        this.triggerForgotPassword.bind(this)
      );
    }
  }

  hideAllPages() {
    this.setupPage.classList.add("hidden");
    this.mainPage.classList.add("hidden");
    this.forgotPasswordPage.classList.add("hidden");
    this.unlockPage.classList.add("hidden");
  }

  bindEvents() {
    const addUrlBtn = document.getElementById("addUrlBtn");
    if (addUrlBtn) {
      addUrlBtn.addEventListener("click", this.handleAddUrl.bind(this));
    }
    const forgotPasswordMainBtn = document.getElementById(
      "forgotPasswordMainBtn"
    );
    if (forgotPasswordMainBtn) {
      forgotPasswordMainBtn.addEventListener(
        "click",
        this.triggerForgotPassword.bind(this)
      );
    }
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", this.handleReset.bind(this));
    }
    const resetPasswordBtn = document.getElementById("resetPasswordBtn");
    if (resetPasswordBtn) {
      resetPasswordBtn.addEventListener(
        "click",
        this.handleResetPassword.bind(this)
      );
    }
    const backToMainBtn = document.getElementById("backToMainBtn");
    if (backToMainBtn) {
      backToMainBtn.addEventListener("click", this.showMainPage.bind(this));
    }
    const unlockBtn = document.getElementById("unlockBtn");
    if (unlockBtn) {
      unlockBtn.addEventListener("click", this.handleUnlockWebsite.bind(this));
    }
    const forgotPasswordUnlockBtn = document.getElementById(
      "forgotPasswordUnlockBtn"
    );
    if (forgotPasswordUnlockBtn) {
      forgotPasswordUnlockBtn.addEventListener(
        "click",
        this.triggerForgotPassword.bind(this)
      );
    }
    const urlInput = document.getElementById("urlInput");
    if (urlInput) {
      urlInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleAddUrl();
        }
      });
    }
    const unlockPassword = document.getElementById("unlockPassword");
    if (unlockPassword) {
      unlockPassword.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleUnlockWebsite();
        }
      });
    }
  }

  bindMainPageEvents() {
    const addUrlBtn = document.getElementById("addUrlBtn");
    if (addUrlBtn) {
      addUrlBtn.replaceWith(addUrlBtn.cloneNode(true));
      const newAddUrlBtn = document.getElementById("addUrlBtn");
      newAddUrlBtn.addEventListener("click", this.handleAddUrl.bind(this));
    }
    const forgotPasswordMainBtn = document.getElementById(
      "forgotPasswordMainBtn"
    );
    if (forgotPasswordMainBtn) {
      forgotPasswordMainBtn.replaceWith(forgotPasswordMainBtn.cloneNode(true));
      const newForgotBtn = document.getElementById("forgotPasswordMainBtn");
      newForgotBtn.addEventListener(
        "click",
        this.triggerForgotPassword.bind(this)
      );
    }
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.replaceWith(resetBtn.cloneNode(true));
      const newResetBtn = document.getElementById("resetBtn");
      newResetBtn.addEventListener("click", this.handleReset.bind(this));
    }
    const resetPasswordNavBtn = document.getElementById("resetPasswordNavBtn");
    if (resetPasswordNavBtn) {
      resetPasswordNavBtn.replaceWith(resetPasswordNavBtn.cloneNode(true));
      const newResetPasswordBtn = document.getElementById(
        "resetPasswordNavBtn"
      );
      newResetPasswordBtn.addEventListener(
        "click",
        this.triggerForgotPassword.bind(this)
      );
    }
    const urlInput = document.getElementById("urlInput");
    if (urlInput) {
      urlInput.replaceWith(urlInput.cloneNode(true));
      const newUrlInput = document.getElementById("urlInput");
      newUrlInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleAddUrl();
        }
      });
    }
    const resetPasswordBtn = document.getElementById("resetPasswordBtn");
    if (resetPasswordBtn) {
      resetPasswordBtn.replaceWith(resetPasswordBtn.cloneNode(true));
      const newResetPasswordBtn = document.getElementById("resetPasswordBtn");
      newResetPasswordBtn.addEventListener(
        "click",
        this.handleResetPassword.bind(this)
      );
    }
    const backToMainBtn = document.getElementById("backToMainBtn");
    if (backToMainBtn) {
      backToMainBtn.replaceWith(backToMainBtn.cloneNode(true));
      const newBackToMainBtn = document.getElementById("backToMainBtn");
      newBackToMainBtn.addEventListener("click", this.showMainPage.bind(this));
    }
  }

  async handleSetup(e) {
    console.log("WebLock Debug - handleSetup called");
    e.preventDefault();
    e.stopPropagation();
    
    const setupBtn = document.getElementById("setupWebLockBtn");
    console.log("WebLock Debug - Setup button found:", !!setupBtn);
    
    if (setupBtn && setupBtn.disabled) {
      console.log("WebLock Debug - Button already disabled, preventing double submission");
      return;
    }
    
    if (setupBtn) {
      setupBtn.disabled = true;
      setupBtn.textContent = "Setting up...";
      console.log("WebLock Debug - Button disabled and text changed");
    }
    
    try {
      const email = document.getElementById("recoveryEmail").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      
      console.log("WebLock Debug - Form elements found:", {
        emailElement: !!document.getElementById("recoveryEmail"),
        passwordElement: !!document.getElementById("password"),
        confirmElement: !!document.getElementById("confirmPassword")
      });
      
      console.log("WebLock Debug - Form values:", { 
        email: email ? "***filled***" : "empty", 
        password: password ? "***filled***" : "empty",
        confirmPassword: confirmPassword ? "***filled***" : "empty"
      });
      
      this.clearErrors();
      console.log("WebLock Debug - Form validation passed, starting setup process");
      
      if (!this.isValidEmail(email)) {
        console.log("WebLock Debug - Email validation failed");
        this.showError("emailError", "Please enter a valid email address");
        return;
      }
      if (password.length < 4) {
        console.log("WebLock Debug - Password length validation failed");
        this.showError("passwordError", "Password must be at least 4 characters");
        return;
      }
      if (password !== confirmPassword) {
        console.log("WebLock Debug - Password confirmation failed");
        this.showError("confirmError", "Passwords do not match");
        return;
      }

      console.log("WebLock Debug - All validations passed, hashing password");
      const passwordHash = await this.hashPassword(password);
      console.log("WebLock Debug - Password hashed successfully");
      
      console.log("WebLock Debug - Saving setup data to storage");
      await this.setStorageData({
        isSetup: true,
        recoveryEmail: email,
        passwordHash: passwordHash,
        lockedUrls: [],
        extensionStartTime: Date.now(),
      });
      console.log("WebLock Debug - Setup data saved successfully");

      console.log("WebLock Debug - Sending message to background script");
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "setupComplete" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("WebLock Debug - Background message error:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log("WebLock Debug - Background message response:", response);
            resolve(response);
          }
        });
      });
      console.log("WebLock Debug - Background script notified successfully");

      this.showSuccess("Setup complete! Redirecting to dashboard...");

      setTimeout(async () => {
        try {
          const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
          if (tab) {
            await chrome.tabs.update(tab.id, {
              url: chrome.runtime.getURL("options.html?action=dashboard")
            });
          }
        } catch (error) {
          this.showMainPage();
        }
      }, 1500);
      
    } catch (error) {
      console.error("WebLock Debug - Setup error occurred:");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Full error object:", error);
      
      let errorMessage = "An error occurred during setup. Please try again.";
      if (error.message) {
        errorMessage = `Setup failed: ${error.message}`;
      }
      
      this.showNotification(errorMessage, "error");
      
      const setupBtn = document.getElementById("setupWebLockBtn");
      if (setupBtn) {
        setupBtn.disabled = false;
        setupBtn.textContent = "Setup WebLock";
        console.log("WebLock Debug - Button re-enabled after error");
      }
    }
  }

  async handleAddUrl() {
    const urlInput = document.getElementById("urlInput");
    const url = urlInput.value.trim();
    if (!url) {
      this.showNotification("Please enter a URL", "error");
      return;
    }
    if (!this.isValidUrl(url)) {
      this.showNotification(
        "Please enter a valid URL (e.g., https://example.com)",
        "error"
      );
      return;
    }
    const data = await this.getStorageData(["lockedUrls"]);
    const lockedUrls = data.lockedUrls || [];
    if (lockedUrls.some((item) => item.url === url)) {
      this.showNotification("This URL is already protected", "warning");
      return;
    }
    lockedUrls.push({
      url: url,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    await this.setStorageData({ lockedUrls });
    urlInput.value = "";
    await this.loadLockedUrls();
    this.showNotification(
      `${new URL(url).hostname} is now protected!`,
      "success"
    );
  }

  async loadLockedUrls() {
    const data = await this.getStorageData(["lockedUrls"]);
    const lockedUrls = data.lockedUrls || [];
    const listContainer = document.getElementById("lockedUrlsList");
    const emptyState = document.getElementById("emptyState");
    const urlCount = document.getElementById("urlCount");
    if (urlCount) {
      urlCount.textContent = `${lockedUrls.length} website${
        lockedUrls.length !== 1 ? "s" : ""
      } protected`;
    }
    if (lockedUrls.length === 0) {
      if (listContainer) listContainer.innerHTML = "";
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");
    if (listContainer) {
      listContainer.innerHTML = lockedUrls
        .map((item) => {
          const url = new URL(item.url);
          const createdDate = new Date(item.createdAt).toLocaleDateString();
          return `
                    <div class="url-item" data-id="${item.id}">
                        <div class="url-text">${item.url}</div>
                        <div class="url-meta">Protected since ${createdDate}</div>
                        <div class="url-actions">
                            <button class="btn btn-small btn-edit" data-action="edit" data-id="${item.id}">✏️ Edit</button>
                            <button class="btn btn-small btn-unlock" data-action="unlock" data-id="${item.id}">🔓 Unlock Temporarily</button>
                            <button class="btn btn-small btn-remove" data-action="remove" data-id="${item.id}">❌ Remove</button>
                        </div>
                    </div>
                `;
        })
        .join("");
      this.bindUrlActionEvents();
    }
  }

  bindUrlActionEvents() {
    const listContainer = document.getElementById("lockedUrlsList");
    if (!listContainer) return;
    const newContainer = listContainer.cloneNode(true);
    listContainer.parentNode.replaceChild(newContainer, listContainer);
    newContainer.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-action]");
      if (!button) return;
      const action = button.getAttribute("data-action");
      const id = button.getAttribute("data-id");
      if (action === "unlock") {
        this.unlockUrl(id);
      } else if (action === "edit") {
        this.editUrl(id);
      } else if (action === "remove") {
        this.removeUrl(id);
      }
    });
  }

  async unlockUrl(id) {
    const data = await this.getStorageData(["temporarilyUnlocked"]);
    const temporarilyUnlocked = data.temporarilyUnlocked || [];
    if (!temporarilyUnlocked.includes(id)) {
      temporarilyUnlocked.push(id);
      await this.setStorageData({ temporarilyUnlocked });
    }
    this.showNotification(
      "Website temporarily unlocked until browser restart",
      "success"
    );
  }

  async editUrl(id) {
    const data = await this.getStorageData(["lockedUrls"]);
    const lockedUrls = data.lockedUrls || [];
    const urlToEdit = lockedUrls.find((item) => item.id === id);
    if (!urlToEdit) {
      this.showNotification("URL not found", "error");
      return;
    }
    const newUrl = await this.showEditUrlDialog(urlToEdit.url);
    if (!newUrl || newUrl === urlToEdit.url) {
      return;
    }
    if (!this.isValidUrl(newUrl)) {
      this.showNotification("Please enter a valid URL", "error");
      return;
    }
    if (lockedUrls.some((item) => item.url === newUrl && item.id !== id)) {
      this.showNotification("This URL is already protected", "warning");
      return;
    }
    urlToEdit.url = newUrl;
    urlToEdit.updatedAt = new Date().toISOString();
    await this.setStorageData({ lockedUrls });
    await this.loadLockedUrls();
    const hostname = new URL(newUrl).hostname;
    this.showNotification(`${hostname} updated successfully!`, "success");
  }

  async removeUrl(id) {
    const data = await this.getStorageData(["lockedUrls"]);
    const lockedUrls = data.lockedUrls || [];
    const urlToRemove = lockedUrls.find((item) => item.id === id);
    if (!urlToRemove) {
      this.showNotification("URL not found", "error");
      return;
    }
    const hostname = new URL(urlToRemove.url).hostname;
    const confirmed = await this.showDeleteConfirmDialog(hostname);
    if (!confirmed) {
      return;
    }
    const updatedUrls = lockedUrls.filter((item) => item.id !== id);
    await this.setStorageData({ lockedUrls: updatedUrls });
    await this.loadLockedUrls();
    this.showNotification(`${hostname} removed from protection`, "success");
  }

  async handleUnlockWebsite() {
    const passwordInput = document.getElementById("unlockPassword");
    const askAgainCheckbox = document.getElementById("askAgainOnNextPage");
    const errorDiv = document.getElementById("unlockError");
    const password = passwordInput.value.trim();
    if (!password) {
      this.showError("unlockError", "Please enter your password");
      this.showNotification("Please enter your password", "error");
      return;
    }
    this.clearErrors();
    const unlockBtn = document.getElementById("unlockBtn");
    const originalText = unlockBtn.textContent;
    unlockBtn.textContent = "Verifying...";
    unlockBtn.disabled = true;
    try {
      const data = await this.getStorageData(["passwordHash", "lockedUrls"]);
      const hash = await this.hashPassword(password);
      if (hash === data.passwordHash) {
        this.showNotification("Password correct! Processing...", "success");
        if (this.dashboardAccess) {
          setTimeout(() => {
            this.showMainPage();
          }, 1500);
          return;
        }
        try {
          await this.performWebsiteUnlock(data, askAgainCheckbox);
          setTimeout(async () => {
            try {
              const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
              });
              await chrome.tabs.update(tab.id, { url: this.currentBlockedUrl });
            } catch (error) {
              window.location.replace(this.currentBlockedUrl);
            }
          }, 1500);
        } catch (unlockError) {
          this.showError(
            "unlockError",
            "Error during unlock process. Please try again."
          );
          this.showNotification(
            "Error during unlock process. Please try again.",
            "error"
          );
          unlockBtn.textContent = originalText;
          unlockBtn.disabled = false;
          return;
        }
      } else {
        this.showNotification("Incorrect password. Please try again.", "error");
        passwordInput.value = "";
        passwordInput.focus();
        unlockBtn.textContent = originalText;
        unlockBtn.disabled = false;
      }
    } catch (error) {
      this.showError(
        "unlockError",
        "Error verifying password. Please try again."
      );
      this.showNotification(
        "Error verifying password. Please try again.",
        "error"
      );
      unlockBtn.textContent = originalText;
      unlockBtn.disabled = false;
    }
  }

  async performWebsiteUnlock(data, askAgainCheckbox) {
    const lockedUrls = data.lockedUrls || [];
    const lockedUrl = lockedUrls.find((item) =>
      this.urlMatches(this.currentBlockedUrl, item.url)
    );
    if (!lockedUrl) {
      return;
    }
    const dontAskAgain = askAgainCheckbox.checked;
    if (dontAskAgain) {
      const sessionData = await this.getStorageData(["sessionUnlocked"]);
      const sessionUnlocked = sessionData.sessionUnlocked || [];
      if (!sessionUnlocked.includes(lockedUrl.id)) {
        sessionUnlocked.push(lockedUrl.id);
        await this.setStorageData({ sessionUnlocked });
      }
      const dontAskData = await this.getStorageData(["dontAskAgainUrls"]);
      const dontAskUrls = dontAskData.dontAskAgainUrls || [];
      if (!dontAskUrls.includes(lockedUrl.id)) {
        dontAskUrls.push(lockedUrl.id);
        await this.setStorageData({ dontAskAgainUrls: dontAskUrls });
      }
    } else {
      const sessionData = await this.getStorageData(["sessionUnlocked"]);
      const sessionUnlocked = sessionData.sessionUnlocked || [];
      const updatedSessionUnlocked = sessionUnlocked.filter(
        (id) => id !== lockedUrl.id
      );
      await this.setStorageData({ sessionUnlocked: updatedSessionUnlocked });
      const dontAskData = await this.getStorageData(["dontAskAgainUrls"]);
      const dontAskUrls = dontAskData.dontAskAgainUrls || [];
      const updatedDontAskUrls = dontAskUrls.filter(
        (id) => id !== lockedUrl.id
      );
      await this.setStorageData({ dontAskAgainUrls: updatedDontAskUrls });
      try {
        const [currentTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (currentTab) {
          chrome.runtime.sendMessage(
            {
              action: "unlockTabSession",
              tabId: currentTab.id,
              urlId: lockedUrl.id,
            },
            (response) => {}
          );
        } else {
          throw new Error("No current tab found for tab-only unlock");
        }
      } catch (error) {
        throw error;
      }
    }
  }

  async resetButtonState(button, originalText) {
    button.textContent = originalText;
    button.disabled = false;
  }

  async handleReset() {
    if (
      !confirm(
        "This will reset the entire extension and remove all protected websites. Are you sure?"
      )
    ) {
      return;
    }
    await chrome.storage.local.clear();
    this.showNotification("Extension reset successfully", "success");
    setTimeout(() => {
      this.showSetupPage();
    }, 1000);
  }

  async handleResetPassword() {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword =
      document.getElementById("confirmNewPassword").value;
    this.clearErrors();
    if (!currentPassword) {
      this.showError(
        "currentPasswordError",
        "Please enter your current password"
      );
      return;
    }
    const data = await this.getStorageData(["passwordHash"]);
    const currentHash = await this.hashPassword(currentPassword);
    if (currentHash !== data.passwordHash) {
      this.showError("currentPasswordError", "Current password is incorrect");
      return;
    }
    if (newPassword.length < 4) {
      this.showError(
        "newPasswordError",
        "Password must be at least 4 characters"
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      this.showError("confirmNewPasswordError", "New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      this.showError(
        "newPasswordError",
        "New password must be different from current password"
      );
      return;
    }
    const newPasswordHash = await this.hashPassword(newPassword);
    await this.setStorageData({
      passwordHash: newPasswordHash,
    });
    this.showNotification("Password updated successfully!", "success");
    setTimeout(() => {
      this.showMainPage();
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmNewPassword").value = "";
    }, 1500);
  }

  async triggerForgotPassword() {
    const unlockPage = document.getElementById("unlockPage");
    if (unlockPage && !unlockPage.classList.contains("hidden")) {
      this.showUnlockForgotPasswordPage();
    } else {
      this.showForgotPasswordPage();
    }
  }

  showUnlockForgotPasswordPage() {
    document.getElementById("unlockPage").classList.add("hidden");
    document
      .getElementById("unlockForgotPasswordPage")
      .classList.remove("hidden");
    this.bindUnlockForgotPasswordEvents();
  }

  bindUnlockForgotPasswordEvents() {
    const unlockVerifyEmailBtn = document.getElementById(
      "unlockVerifyEmailBtn"
    );
    if (unlockVerifyEmailBtn) {
      unlockVerifyEmailBtn.replaceWith(unlockVerifyEmailBtn.cloneNode(true));
      const newBtn = document.getElementById("unlockVerifyEmailBtn");
      newBtn.addEventListener("click", this.handleUnlockVerifyEmail.bind(this));
    }
    const unlockUpdatePasswordBtn = document.getElementById(
      "unlockUpdatePasswordBtn"
    );
    if (unlockUpdatePasswordBtn) {
      unlockUpdatePasswordBtn.replaceWith(
        unlockUpdatePasswordBtn.cloneNode(true)
      );
      const newBtn = document.getElementById("unlockUpdatePasswordBtn");
      newBtn.addEventListener(
        "click",
        this.handleUnlockUpdatePassword.bind(this)
      );
    }
    const backToUnlockBtn = document.getElementById("backToUnlockBtn");
    if (backToUnlockBtn) {
      backToUnlockBtn.replaceWith(backToUnlockBtn.cloneNode(true));
      const newBtn = document.getElementById("backToUnlockBtn");
      newBtn.addEventListener("click", this.showUnlockPage.bind(this));
    }
  }

  async handleUnlockVerifyEmail() {
    const emailInput = document.getElementById("unlockVerifyEmail");
    const enteredEmail = emailInput.value.trim();
    this.clearErrors();
    if (!enteredEmail) {
      this.showError("unlockEmailError", "Please enter your email address");
      return;
    }
    if (!this.isValidEmail(enteredEmail)) {
      this.showError("unlockEmailError", "Please enter a valid email address");
      return;
    }
    const data = await this.getStorageData(["recoveryEmail"]);
    if (!data.recoveryEmail) {
      this.showError(
        "unlockEmailError",
        "No recovery email found. Please reset password from dashboard."
      );
      return;
    }
    if (enteredEmail.toLowerCase() !== data.recoveryEmail.toLowerCase()) {
      this.showError(
        "unlockEmailError",
        "Email address does not match your recovery email"
      );
      return;
    }
    document.getElementById("unlockEmailStep").classList.add("hidden");
    document.getElementById("unlockPasswordStep").classList.remove("hidden");
  }

  async handleUnlockUpdatePassword() {
    const newPassword = document.getElementById("unlockNewPassword").value;
    const confirmPassword = document.getElementById(
      "unlockConfirmPassword"
    ).value;
    this.clearErrors();
    if (newPassword.length < 4) {
      this.showError(
        "unlockNewPasswordError",
        "Password must be at least 4 characters"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      this.showError("unlockConfirmPasswordError", "Passwords do not match");
      return;
    }
    const newPasswordHash = await this.hashPassword(newPassword);
    await this.setStorageData({
      passwordHash: newPasswordHash,
    });
    this.showNotification("Password updated successfully!", "success");
    setTimeout(() => {
      document.getElementById("unlockEmailStep").classList.remove("hidden");
      document.getElementById("unlockPasswordStep").classList.add("hidden");
      document.getElementById("unlockVerifyEmail").value = "";
      document.getElementById("unlockNewPassword").value = "";
      document.getElementById("unlockConfirmPassword").value = "";
      this.showUnlockPage();
    }, 1500);
  }

  urlMatches(currentUrl, lockedUrl) {
    try {
      const current = new URL(currentUrl);
      const locked = new URL(lockedUrl);

      return current.hostname === locked.hostname;
    } catch (error) {
      return false;
    }
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
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.style.display = "block";
      element.style.color = "#ff6b6b";
      element.style.marginTop = "8px";
      element.style.fontSize = "14px";
    }
  }

  clearErrors() {
    const errorElements = document.querySelectorAll(".error");
    errorElements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: slideInNotification 0.3s ease-out;
        `;
    switch (type) {
      case "success":
        notification.style.background = "#4ecdc4";
        break;
      case "error":
        notification.style.background = "#ff6b6b";
        break;
      case "warning":
        notification.style.background = "#ffa726";
        break;
      default:
        notification.style.background = "#667eea";
    }
    if (!document.getElementById("notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
                @keyframes slideInNotification {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
      document.head.appendChild(style);
    }
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
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
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async testPasswordVerification(testPassword) {
    const data = await this.getStorageData(["passwordHash"]);
    const hash = await this.hashPassword(testPassword);
    return hash === data.passwordHash;
  }

  async showEditUrlDialog(currentUrl) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(5px);
            `;
      const modal = document.createElement("div");
      modal.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.3s ease-out;
            `;
      modal.innerHTML = `
                <style>
                    @keyframes modalSlideIn {
                        from { transform: translateY(-20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                </style>
                <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.5rem;">✏️ Edit Website URL</h3>
                <p style="margin: 0 0 1.5rem 0; color: #666;">Update the website URL below:</p>
                <input type="url" id="editUrlInput" value="${currentUrl}" style="
                    width: 100%;
                    padding: 1rem;
                    border: 2px solid #e1e8ed;
                    border-radius: 8px;
                    font-size: 1rem;
                    margin-bottom: 1.5rem;
                    box-sizing: border-box;
                ">
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button id="cancelEditBtn" style="
                        padding: 0.75rem 1.5rem;
                        border: 2px solid #e1e8ed;
                        background: white;
                        color: #666;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Cancel</button>
                    <button id="saveEditBtn" style="
                        padding: 0.75rem 1.5rem;
                        border: none;
                        background: #4ecdc4;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">Save Changes</button>
                </div>
            `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      const input = modal.querySelector("#editUrlInput");
      const cancelBtn = modal.querySelector("#cancelEditBtn");
      const saveBtn = modal.querySelector("#saveEditBtn");
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);
      const cleanup = () => {
        document.body.removeChild(overlay);
      };
      cancelBtn.addEventListener("click", () => {
        cleanup();
        resolve(null);
      });
      saveBtn.addEventListener("click", () => {
        const newUrl = input.value.trim();
        cleanup();
        resolve(newUrl);
      });
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const newUrl = input.value.trim();
          cleanup();
          resolve(newUrl);
        } else if (e.key === "Escape") {
          cleanup();
          resolve(null);
        }
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(null);
        }
      });
    });
  }

  async showDeleteConfirmDialog(hostname) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            `;
      const modal = document.createElement("div");
      modal.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 2rem;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
                animation: modalSlideIn 0.3s ease-out;
            `;
      modal.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.5rem;">Confirm Deletion</h3>
                <p style="margin: 0 0 1.5rem 0; color: #666; line-height: 1.5;">
                    Are you sure you want to remove <strong>${hostname}</strong> from protection?
                </p>
                <p style="margin: 0 0 2rem 0; color: #999; font-size: 0.9rem;">
                    This action cannot be undone.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="cancelDeleteBtn" style="
                        padding: 0.75rem 1.5rem;
                        border: 2px solid #e1e8ed;
                        background: white;
                        color: #666;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        min-width: 100px;
                    ">Cancel</button>
                    <button id="confirmDeleteBtn" style="
                        padding: 0.75rem 1.5rem;
                        border: none;
                        background: #ff6b6b;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        min-width: 100px;
                    ">Delete</button>
                </div>
            `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      const cancelBtn = modal.querySelector("#cancelDeleteBtn");
      const confirmBtn = modal.querySelector("#confirmDeleteBtn");
      const cleanup = () => {
        document.body.removeChild(overlay);
      };
      cancelBtn.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });
      confirmBtn.addEventListener("click", () => {
        cleanup();
        resolve(true);
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
      document.addEventListener("keydown", function escapeHandler(e) {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", escapeHandler);
          cleanup();
          resolve(false);
        }
      });
    });
  }
}

let webLockOptions;
console.log("WebLock Debug - Script loaded, waiting for DOM");
document.addEventListener("DOMContentLoaded", () => {
  console.log("WebLock Debug - DOM loaded, creating options instance");
  try {
    webLockOptions = new WebLockOptions();
    console.log("WebLock Debug - Options instance created:", !!webLockOptions);
  } catch (error) {
    console.error("WebLock Error - Failed to create options instance:", error);
  }
});
