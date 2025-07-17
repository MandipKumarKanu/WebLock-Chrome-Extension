# WebLock Chrome Extension

A powerful website locker Chrome extension that allows you to password-protect specific websites with advanced session management.

## 🚀 Features

### 🔐 Initial Setup
- Beautiful full-page setup interface
- Set up recovery email and master password
- Password validation (minimum 6 characters)
- Secure password hashing using SHA-256

### 🧩 Main Features
- **Full-page dashboard** with modern UI
- Add any URL to the lock list with instant validation
- **Immediate URL blocking** - URLs are blocked as soon as you type them in the address bar
- **Advanced session unlock system** with flexible options
- Edit protected URLs with inline dialog
- Remove URLs from lock list with confirmation
- Reset extension functionality

### 🚫 URL Blocking & Smart Unlock System
- **Full-page unlock interface** instead of modal
- Redirects blocked URLs to dedicated unlock page
- Password verification to access blocked sites
- **Smart unlock modes:**
  - **Browser Session Mode**: "Don't ask again until I close the browser" - seamless navigation across all tabs
  - **Tab-Only Mode**: Unlock applies only to current tab, new tabs require password
- **Session persistence** across extension reloads
- **Tab-specific session tracking** for granular control
- Clean, user-friendly unlock experience

### ❓ Password Recovery
- **Full-page password reset flow**
- OTP-based password reset (demo mode)
- New password setup after OTP verification
- Recovery email integration
- **Dual password reset access** from dashboard and unlock page

## 📁 File Structure

```
web-lock/
├── manifest.json          # Extension manifest (Manifest V3)
├── options.html           # Main full-page interface  
├── options.css            # Full-page styling
├── options.js             # Main functionality with session management
├── background.js          # Background service worker with tab tracking
├── popup.html             # Legacy popup (kept for compatibility)
├── popup.css              # Legacy popup styling
├── popup.js               # Legacy popup functionality
├── content.js             # Content script (legacy modal system)
├── content.css            # Modal styling (legacy)
├── debug.html             # Debug tools for session testing
├── icon16.png             # 16x16 extension icon
├── icon48.png             # 48x48 extension icon
└── icon128.png            # 128x128 extension icon
```

## 🛠️ Installation

1. Clone or download this repository
2. Add icon files (icon16.png, icon48.png, icon128.png) 
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension directory
6. The WebLock extension should now appear in your extensions

## 🎯 Usage

### First Time Setup
1. Click the WebLock extension icon (opens full-page setup)
2. Enter your recovery email
3. Set a master password (minimum 6 characters)
4. Confirm your password

### Adding Locked URLs
1. Click the WebLock extension icon to open dashboard
2. Enter a URL in the "Add Website to Lock" field
3. Press Enter or click "Lock Website"
4. **The website is now immediately protected!**

### Testing URL Blocking
1. Add a website (e.g., https://instagram.com) to the lock list
2. **Type the URL in your browser's address bar** and press Enter
3. **You'll be immediately redirected** to the unlock page
4. Enter your master password to access the site

### Smart Unlock System
**Browser Session Mode** (Checkbox CHECKED):
1. When visiting a locked website, check "Don't ask again until I close the browser"
2. Enter your master password and click "Unlock Website"
3. **Navigate freely** between all pages of that site in ANY tab
4. **Open new tabs** to the same site without password prompts
5. Password required again only after closing browser

**Tab-Only Mode** (Checkbox UNCHECKED):
1. When visiting a locked website, leave the checkbox unchecked
2. Enter your master password and click "Unlock Website"
3. **Navigate freely** within the same tab
4. **New tabs** to the same site will require password again
5. Perfect for shared computers or temporary access

### Managing Protected Websites
1. **Edit URLs**: Click the ✏️ edit button to modify website addresses
2. **Temporary Unlock**: Use 🔓 to unlock until browser restart
3. **Remove Protection**: Click ❌ to remove from protection list

### Password Recovery
1. On any password prompt, click "Forgot Password?"
2. Enter the OTP (displayed for demo purposes)
3. Set a new password

## 🔧 Technical Details

### Advanced Session Management
- **Tab Session Tracking**: Each tab maintains individual unlock status
- **Browser Session Persistence**: Global unlocks persist across tabs when enabled
- **Session State Recovery**: Extension reloads preserve unlock states
- **Automatic Cleanup**: Tab sessions cleared when tabs close
- **Window Closure Detection**: All sessions reset when browser closes

### Storage & Data Management
- Uses `chrome.storage.local` for data persistence
- Stores hashed passwords (SHA-256)
- Maintains multiple unlock state arrays:
  - `sessionUnlocked`: Browser-wide session unlocks
  - `tabSessions`: Individual tab unlock tracking (in memory)
  - `dontAskAgainUrls`: URLs marked for session-wide unlock
  - `temporarilyUnlocked`: Until-restart unlocks
  - `oneTimeUnlock`: Single-navigation unlocks

### Security
- Passwords are hashed using SHA-256
- No plain text password storage
- Local-only data storage (no external servers)
- Secure message passing between extension components

### URL Matching Algorithm
- Matches by hostname and path prefix
- Ignores query parameters and fragments
- Supports HTTP and HTTPS protocols
- Path-aware blocking (e.g., `/admin` vs `/` routes)

## 🔒 Privacy & Security

- All data is stored locally in your browser
- Passwords are hashed and never stored in plain text
- No data is sent to external servers
- OTP generation is simulated locally (for demo)

## 🐛 Known Limitations

- OTP email sending is simulated (demo mode only)
- Limited to Chrome browser (Manifest V3)
- Session persistence limited to 5-minute detection window
- Legacy content script modal system (deprecated in favor of redirect approach)

## 📝 Development Notes

This extension uses **Manifest V3** and includes:
- **Service worker** (`background.js`) for URL monitoring and session management
- **Content scripts** for legacy modal support
- **Chrome Storage API** for persistent data
- **Web Navigation API** for URL interception
- **Tabs API** for tab-specific session tracking
- **Runtime messaging** for component communication

### Architecture Highlights
- **Background service worker** handles all URL blocking logic
- **Tab session mapping** for granular unlock control  
- **Message passing system** between options page and background script
- **Session persistence logic** to maintain state across extension reloads
- **Redirect loop prevention** with timing-based safeguards

## 🧪 Debug Tools

The extension includes `debug.html` for testing session functionality:
- View current storage state
- Test session unlock scenarios
- Simulate tab-only vs browser-wide unlocks
- Clear session data manually

## 🤝 Contributing

Feel free to submit issues and pull requests to improve the extension.

## 📄 License

This project is open source. Please check the license file for details.
