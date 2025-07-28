# WebLock 🔐

A Chrome extension that locks access to specified websites with password protection, keeping your private browsing secure from prying eyes.

## 📸 Screenshot

![WebLock Screenshot](screenshot.png)

## 🎯 What It Does

WebLock acts as a digital security guard for your browser tabs. When someone (including yourself) tries to access a protected website, they'll need to enter your password first. Perfect for keeping sensitive sites like banking, social media, or work platforms secure when others might use your computer.

## 🛠️ Installation

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract to a folder on your computer

2. **Install in Chromimum based browswer**
   - Open Browser and go to extensions option from the browswer menu
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the extension folder
   - The WebLock icon should appear in your browser toolbar

3. **Initial Setup**
   - Right-click the WebLock icon and select "Options"
   - Create your master password and recovery email
   - Start adding websites to protect

## ✨ Features

### Core Protection
- **Password-Protected Access**: Secure your sensitive websites behind a master password
- **Smart URL Matching**: Protects entire domains including www variations (e.g., protecting `facebook.com` blocks both `facebook.com` and `www.facebook.com`)
- **Instant Blocking**: Protection activates immediately after adding a website

### Unlock Modes
- **Temporary Session Unlock**: Access a site for the current browser session
- **Single-Page Unlock**: Maximum security - requires password for each page visit
- **Dashboard Access**: Secure access to manage your protected sites

### Management Features
- **Easy Website Management**: Add, edit, or remove protected websites from the dashboard
- **Password Recovery**: Reset your master password using your recovery email
- **Visual Dashboard**: Clean interface to manage all your protected sites
- **URL Validation**: Automatic validation ensures only valid websites are added

### Security Features
- **Local Storage Only**: All data stays on your computer - no cloud storage
- **SHA-256 Password Hashing**: Your password is securely hashed and never stored in plain text
- **No External Dependencies**: Works entirely offline, no internet connection required for protection

## � How to Use

1. **Set Up Protection**
   - Right-click the WebLock icon → "Options"
   - Enter a master password and recovery email
   - Click "Setup WebLock"

2. **Add Websites to Protect**
   - In the dashboard, enter a website URL (e.g., `https://facebook.com`)
   - Click "Add Website"
   - The site is now password-protected (includes www variations automatically)
   - **Note**: Adding `facebook.com` protects both `facebook.com` and `www.facebook.com`

3. **Access Protected Sites**
   - Try visiting a protected website
   - Enter your master password when prompted
   - Choose your unlock mode (session or single-page)

4. **Manage Protection**
   - Access the dashboard anytime via the extension icon
   - Edit, temporarily unlock, or remove protected sites
   - Reset your password if needed

## 🔒 Privacy & Security

- **100% Local**: All data stored locally on your device
- **No Tracking**: No analytics, no data collection, no external servers
- **Secure Hashing**: Passwords protected with SHA-256 encryption
- **Open Source**: Code is open for inspection and verification

## ⚙️ Technical Details

- **Browser Support**: Chrome, Edge, and other Chromium-based browsers
- **Manifest Version**: V3 (latest Chrome extension standard)
- **Permissions**: Only requests necessary permissions for URL blocking and storage
- **Storage**: Uses Chrome's local storage API for data persistence

## 🐛 Known Limitations

- **Chromium-based browsers only**: Does not support Firefox or Safari
- **Client-side protection**: Determined users with developer knowledge could bypass
- **No mobile support**: Desktop browser extension only
- **Password recovery**: Requires manual verification of recovery email

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests. This extension is designed to be simple, secure, and privacy-focused.

## 📄 License

This project is open source. Please check the license file for details.

---

**Remember**: WebLock helps protect your privacy, but it's not a substitute for good security practices. Always log out of sensitive accounts and use strong, unique passwords! �
