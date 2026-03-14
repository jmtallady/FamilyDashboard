# Family Dashboard 🏠

A simple, beautiful family behavior points tracking system with Google Sheets integration. Built for families who want an easy way to track and manage kids' behavior points on a dedicated display (like a Raspberry Pi).

## ✨ Features

### Current Features (v2.0)
- **📊 Real-time Points Tracking** - Track behavior points for multiple kids
- **🔒 PIN Protection** - Secure mouse-friendly number pad (no keyboard needed!)
- **☁️ Google Sheets Integration** - Automatic sync with Google Sheets for data persistence
- **💾 Offline Mode** - Works offline with localStorage fallback
- **🎨 Clean, Modern UI** - Purple gradient design with large touch-friendly buttons
- **⏰ Auto-reset** - Points reset to default at midnight
- **📱 Responsive** - Works on any device (desktop, tablet, Raspberry Pi)
- **🔓 Manual Lock** - Click unlock indicator to immediately lock dashboard
- **⚙️ Configurable** - Easy to customize kid names, default points, and PIN

### Coming Soon (Roadmap)
- 📋 Chores tracking and completion
- 📅 Family calendar integration
- 🎁 Rewards system
- 📊 Historical charts and analytics
- 🎯 Goals and milestones
- 🌤️ Weather widget
- 👪 Multi-family support (for resale/distribution)

## 🚀 Quick Start

### Option 1: Use Without Google Sheets (Offline Mode)
1. Open [family-dashboard.html](https://jmtallady.github.io/FamilyDashboard/family-dashboard.html) in your browser
2. Points are saved in browser localStorage
3. Works great for single-device setups!

### Option 2: Set Up Google Sheets Integration
Follow the complete setup guide: **[SETUP-GUIDE.md](SETUP-GUIDE.md)**

**Quick summary:**
1. Create a Google Sheet with "Points Log" tab
2. Deploy the Apps Script as a Web App
3. Add the Web App URL to the dashboard config
4. Enjoy automatic cloud sync! ☁️

## 🎮 How to Use

1. **View Current Points** - Dashboard loads and displays current points
2. **Unlock to Edit** - Click any +/- button to bring up PIN entry
3. **Enter PIN** - Click numbers on the keypad (default: `1220`)
4. **Adjust Points** - Click + to add a point, - to remove a point
5. **Lock When Done** - Click the green "Unlocked" indicator to lock
6. **Auto-lock** - Dashboard auto-locks after 2 minutes of inactivity

## ⚙️ Configuration

Edit the `CONFIG` object in [family-dashboard.html](family-dashboard.html) (around line 60):

```javascript
const CONFIG = {
    kid1: {
        name: 'Clara',      // Change to your kid's name
        id: 'clara',        // Lowercase ID for internal use
        defaultPoints: 5    // Starting points each day
    },
    kid2: {
        name: 'Champ',      // Second kid's name
        id: 'champ',
        defaultPoints: 5
    },
    pin: '1220',                    // Change your PIN!
    requirePinForEdits: true,       // Set to false to disable PIN
    sheetsApiUrl: ''                // Add Google Sheets Web App URL here
};
```

### Adding More Kids

Just add another kid object:

```javascript
kid3: {
    name: 'Alex',
    id: 'alex',
    defaultPoints: 5
}
```

The dashboard automatically generates cards for all kids!

## 📁 File Structure

```
FamilyDashboard/
├── family-dashboard.html   # Main dashboard (HTML + JavaScript)
├── styles.css              # All styling
├── apps-script.js          # Google Apps Script (for Sheets integration)
├── SETUP-GUIDE.md          # Detailed setup instructions
└── README.md               # This file
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no dependencies!)
- **Storage**: localStorage + Google Sheets API
- **Backend**: Google Apps Script (serverless)
- **Hosting**: GitHub Pages

## 🔐 Security Features

- **PIN Protection** - Prevent unauthorized point changes
- **Mouse-only Input** - No keyboard needed (perfect for Raspberry Pi)
- **Auto-lock** - 2-minute inactivity timeout
- **Manual Lock** - Click to lock immediately
- **No External Dependencies** - No tracking, no external scripts

## 📊 Google Sheets Data Structure

**Sheet Name:** Points Log

| Date       | Kid   | Points | Note                |
|------------|-------|--------|---------------------|
| 3/14/2026  | Clara | 5      | Reset to default    |
| 3/14/2026  | Champ | 7      | earned via dashboard|
| 3/13/2026  | Clara | 3      | lost via dashboard  |

Simple, clean, and easy to analyze!

## 🎯 Use Cases

- **Family Behavior Management** - Track and reward good behavior
- **Raspberry Pi Dashboard** - Perfect for a kitchen display
- **Classroom Management** - Teachers can track student points
- **Team Points** - Use for team competitions or gamification
- **Multi-device Sync** - Access from phone, tablet, or computer

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

**Ideas for contribution:**
- Additional themes/color schemes
- More widgets (weather, calendar, chores)
- Internationalization (multiple languages)
- Mobile app version
- Docker container for easy deployment

## 📝 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Credits

- Built with ❤️ for families who want to stay organized
- Powered by Google Sheets API
- Designed for Raspberry Pi displays
- Created with assistance from Claude (Anthropic)

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Questions**: Check the [SETUP-GUIDE.md](SETUP-GUIDE.md)
- **Feature Requests**: Open an issue with your idea!

## 🚦 Roadmap

### Phase 1: Core Dashboard ✅
- [x] Basic points tracking
- [x] PIN protection
- [x] Auto-reset at midnight
- [x] Configurable kids

### Phase 2: Google Sheets Integration ✅
- [x] Read points from Google Sheets
- [x] Write points to Google Sheets
- [x] Offline mode fallback

### Phase 3: Enhanced Features (In Progress)
- [ ] Chores tracking
- [ ] Calendar integration
- [ ] Rewards system
- [ ] Historical data visualization

### Phase 4: Polish & Expansion
- [ ] Weather widget
- [ ] Themes and customization
- [ ] Multi-family configuration
- [ ] Export data to CSV

### Phase 5: Distribution
- [ ] Make it easy for other families to use
- [ ] Setup wizard
- [ ] Pre-built configurations
- [ ] Maybe sell it? 🤔

---

**Current Version:** 2.0
**Last Updated:** March 14, 2026
**Live Demo:** [jmtallady.github.io/FamilyDashboard](https://jmtallady.github.io/FamilyDashboard/family-dashboard.html)

Made with ❤️ for keeping families organized!
