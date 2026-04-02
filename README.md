# LegendTimer

A neon-inspired workout and interval timer app designed for smooth performance across iOS, Android, Web, and Fire TV devices.

## Features

- **Real-time Clock Display** - Shows current time (12/24 hour format)
- **Workout Timer** - Tracks total time spent in workouts
- **Interval Timer** - Configurable interval durations (10-120 seconds)
- **Audio Cues** - Chime sounds at 3, 2, 1 seconds and interval completion with optimized preloading for consistency
- **Rotation Support** - Responds to device orientation changes (portrait and landscape)
- **Multi-platform** - iOS, Android, Web, and FireOS compatible
- **Mute Control** - Toggle sound on/off with visual indicator
- **Customizable Settings** - Adjust clock format and interval length

## Prerequisites

Before building, ensure you have the following installed:

- **Node.js** (v16 or later) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Expo CLI** - Install globally with: `npm install -g expo-cli`
- **EAS CLI** - Install globally with: `npm install -g eas-cli`

### Additional Requirements by Platform

**iOS:**
- Mac with Xcode installed (for local development)
- OR use EAS Build for cloud-based building (no Mac required)

**Android:**
- Android SDK or Android Studio installed
- OR use EAS Build for cloud-based building

## Setup

1. **Clone or download the project:**
   ```bash
   cd LegendTimer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure EAS (optional, required for cloud builds):**
   ```bash
   eas login
   ```

## Building the App

### Option 1: Build for iOS

**Local Build (Mac only):**
```bash
eas build --platform ios
```

**Custom Build with Custom Configuration:**
```bash
eas build --platform ios --profile production
```

After building, download the `.ipa` file from the EAS dashboard and deploy to the App Store, TestFlight, or use a device provisioning profile.

**App Store Submission:**
1. Download the `.ipa` file
2. Use Xcode Organizer or Transporter to submit to App Store Connect
3. Fill in app details (description, screenshots, etc.)
4. Submit for review

### Option 2: Build for Android

**Local Build:**
```bash
eas build --platform android
```

**Build as APK (for direct installation):**
```bash
eas build --platform android --local
```

After building, download the `.apk` or `.aab` file from the EAS dashboard.

**Play Store Submission:**
1. Download the `.aab` (Android App Bundle) file
2. Sign in to Google Play Console
3. Create a new app and fill in required information
4. Upload the `.aab` file
5. Add store listing details and submit for review

**Direct APK Installation:**
```bash
adb install path/to/app.apk
```

### Option 3: Build for Web

```bash
npm run build:web
```

Output will be in the `dist/` directory, ready to deploy to Vercel, Netlify, or any static hosting service.

### Option 4: Build for FireOS / Fire TV

Build as Android:
```bash
eas build --platform android
```

Download the `.apk` file and sideload on Fire devices:
1. Enable "Unknown Sources" in Fire device settings
2. Transfer `.apk` via USB or cloud storage
3. Install using file manager or `adb install`

## Development

### Run Locally

**Start Dev Server:**
```bash
npm start
```

**Run on iOS Simulator (Mac):**
```bash
npm run ios
```

**Run on Android Emulator:**
```bash
npm run android
```

**Run Web Version:**
```bash
npm run web
```

### Testing

- Test on physical devices for audio timing accuracy
- Verify orientation changes work on all platforms
- Test audio playback in muted/unmuted modes
- Validate landscape layout displays all elements

## App Configuration

See `app.json` for platform-specific configurations:

- **Audio Permissions** - Android requires audio recording and modification permissions
- **Orientation** - Set to "default" to allow rotation on all platforms
- **Android Specific** - `screenOrientation: "sensor"` enables auto-rotation on Android

## Troubleshooting

### Audio not playing
- Ensure device is not in silent mode (iOS respects this by default)
- Check app notification settings in device settings
- Verify audio permissions are granted

### Orientation not rotating
- **iOS:** Check Device Orientation Lock in Control Center (should be OFF)
- **Android:** Check auto-rotate setting in system settings

### Build fails
- Clear cache: `eas build:cache --platform android` or `--platform ios`
- Update EAS CLI: `npm install -g eas-cli@latest`
- Check Node.js version: `node --version` (should be v16+)

### Play Store/App Store issues
- Ensure app version is incremented in `app.json`
- Verify bundle IDs match your app registration
- Check review guidelines for audio/fitness apps

## Building and Submitting

### Complete Build & Release Workflow

**1. Update Version:**
```bash
npm run update-version
```

**2. Build for Both Platforms:**
```bash
eas build --platform ios && eas build --platform android
```

**3. Download from EAS Dashboard:**
- Get `.ipa` for iOS
- Get `.aab` (or `.apk`) for Android

**4. Submit to Stores:**
- **iOS:** Use Transporter or Xcode to submit `.ipa` to App Store Connect
- **Android:** Upload `.aab` to Google Play Console

## Project Structure

```
LegendTimer/
├── App.js                 # Main app component
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── eas.json             # EAS build configuration
├── assets/              # Images and audio files
│   ├── beep.mp3        # Countdown beep sound
│   └── start.mp3       # Interval start sound
└── android/            # Android-specific files
    └── app/src/main/   # Native Android code
```

## Dependencies

- **expo** - Development framework
- **expo-av** - Audio/video playback
- **expo-screen-orientation** - Orientation control
- **react-navigation** - Navigation between screens
- **async-storage** - Local data persistence

## License

Private project for LegendTimer

## Support

For issues or feature requests, contact the development team.
