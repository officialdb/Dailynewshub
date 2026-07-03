# Daily Newshub 📰

**Project submitted by Group 3**

Daily Newshub is a modern, fully functional news reading application built with Flutter. It features a striking Dark Neo-Brutalist design aesthetic, offering users a premium and highly engaging way to consume their daily news. 

## ✨ Key Features
- **Auto-Scrolling Trending Feed**: A smooth, timer-driven carousel that cycles through the top 5 newest and most trending articles.
- **Dynamic Categories**: Instantly filter articles across various topics like Technology, Sports, Health, Economy, and Entertainment.
- **Robust Search System**: Live-search functionality allowing users to find specific articles by title or category instantly.
- **Bookmarking (Save for Later)**: Users can save their favorite articles. Saved articles are securely stored in a dedicated tab and can be unsaved at any time.
- **Smooth Navigation**: Custom Cupertino sliding page transitions and an elegant Hamburger drawer menu that seamlessly connects all sections of the app without any jarring flashes or lags.
- **Customizable Settings**: Interactive neo-brutalist toggles for preferences like Dark Mode and Push Notifications.

## 🛠 Tech Stack
- **Framework**: Flutter / Dart
- **State Management**: `provider` (MultiProvider architecture for News & Settings states)
- **Typography**: `google_fonts` (Space Grotesk for headers, Inter for body text)

## 🚀 Getting Started

1. Ensure you have the Flutter SDK installed.
2. Clone this repository.
3. Fetch the dependencies:
   ```bash
   flutter pub get
   ```
4. Run the app on your preferred emulator or physical device:
   ```bash
   flutter run
   ```

## � Build Release APKs

Use these commands to build release APKs for both modern and older Android devices.

### High-end Android (arm64-v8a)
```bash
flutter build apk --release --target-platform=android-arm64
```
The release APK will be generated at:
```bash
build/app/outputs/flutter-apk/app-release.apk
```

### Lower-end Android (armeabi-v7a)
```bash
flutter build apk --release --target-platform=android-arm
```
The release APK will be generated at:
```bash
build/app/outputs/flutter-apk/app-release.apk
```

### Build both APKs in one command
```bash
flutter build apk --release --target-platform=android-arm,android-arm64
```
This creates a single universal APK compatible with older and newer devices.

### Install the generated APK
```bash
flutter install
```
Or install the APK directly with `adb`:
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

## �🚀 Presentation Startup Guide (Backend & App)

I need everyone to follow these steps exactly so the demo works with the hardcoded APKs.

### Step 1: Start the Backend
Open a terminal and run the backend from the `backend` folder. Activate the virtual environment first, then start FastAPI:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
If port 8000 is already taken, use a free port instead:
```bash
cd backend
source .venv/bin/activate
FREE_PORT=$(python - <<'PY'
import socket
s = socket.socket()
s.bind(('', 0))
print(s.getsockname()[1])
s.close()
PY
)
uvicorn app.main:app --host 0.0.0.0 --port "$FREE_PORT"
```
Verify the backend is running by checking the health endpoint:
```bash
curl http://127.0.0.1:8000/api/v1/health
```
If you used a different port, substitute that port number for `8000` in the command.

### Step 2: Start the Internet Tunnel
The APKs are fixed to `https://dailynewshub2026.loca.lt`, so open a second terminal and expose the backend using Localtunnel:
```bash
npx localtunnel --port 8000 --subdomain dailynewshub2026
```
If the backend is running on another port, replace `8000` with that port.

You should see output like: `your url is: https://dailynewshub2026.loca.lt`.
*(If a password prompt appears in the browser, it is just Localtunnel security. The app will still work.)*

### Step 3: Install the APKs
Distribute the APK files to the devices. After installation, the mobile app will connect to the backend through the `dailynewshub2026` tunnel.

Keep both terminals open while the demo is running.

## 👥 GROUP 3 MEMBERS

1. Chilaka Chigozie Micheal
2. Don Praise Chinonso
3. Okeh Norah Odinakachi
4. Blessing Isaac
5. Oguh Caleb Kelechi
6. Maduakolam Victor
7. ETOH COLLINS CHIMEZIE
8. Kamsi Roosevelt John

*Developed with ❤️ by Group 3.*
