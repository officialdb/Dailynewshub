# Daily News Hub 📰

**Project submitted by Group 3**

Daily News Hub is a modern, full-stack news reading application built with Flutter and FastAPI. It features a Dark Neo-Brutalist design aesthetic, real-time article feeds, short-form video reels, channel subscriptions, bookmarking, AI-powered summaries, and much more.

---

## ✨ Key Features

- **Auto-Scrolling Trending Feed** — A smooth, timer-driven carousel cycling through the top newest and most trending articles.
- **Dynamic Categories** — Instantly filter articles across topics like Technology, Sports, Health, Economy, and Entertainment.
- **Short-Form Reels** — TikTok-style vertical video feed sourced from YouTube news channels.
- **Channel Subscriptions** — Follow your favourite news channels and get personalised feeds.
- **Robust Search** — Live-search by title, keyword, or category.
- **Bookmarking** — Save articles and reels; access them anytime in a dedicated tab.
- **Reading History** — Automatically tracks articles you've read.
- **AI Summaries & Text-to-Speech** — AI-generated article summaries with audio playback.
- **Reactions & Comments** — React and comment on articles and reels.
- **Customizable Settings** — Dark mode, push notification, and preference toggles.
- **JWT Authentication** — Secure register/login with access and refresh token rotation.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Mobile** | Flutter / Dart |
| **State Management** | Riverpod (AsyncNotifier) |
| **HTTP Client** | Dio |
| **Backend** | FastAPI (Python 3.11) |
| **Database** | PostgreSQL 16 (via SQLAlchemy + asyncpg) |
| **Cache / Queue** | Redis 7 |
| **Async Tasks** | Celery + APScheduler |
| **Migrations** | Alembic |
| **Push Notifications** | Firebase Admin SDK |
| **Typography** | Google Fonts (Space Grotesk, Inter) |

---

## 🚀 Running the Project

### Prerequisites

- [Flutter SDK](https://flutter.dev/docs/get-started/install) installed and on your PATH
- Python 3.11+ with `pip`
- PostgreSQL 16 running locally **or** Docker Desktop installed
- Redis running locally **or** via Docker

---

### 1. Clone & Install Flutter Dependencies

```bash
git clone <repository-url>
cd Dailynewshub
flutter pub get
```

---

### 2. Start the Backend

Open a terminal at the root of the project (`Dailynewshub/`) and run the following command to automatically start all backend services (PostgreSQL, Redis, Uvicorn, Celery) via Docker and connect the ADB tunnel:

```bash
make start
```

That's it! 

> **Note:** If you want to stop the backend cleanly, just run `make backend-stop`.
> Logs for the backend are automatically saved to `backend/app.log`.

---

### 3. Configure the Flutter App to Talk to the Backend

The backend URL is configured in [`lib/config/api_config.dart`](lib/config/api_config.dart).

By default it points to `http://10.11.52.123:8000/api/v1`. **Change this to your machine's local IP address** before running on a physical device:

```bash
# Find your machine's local IP
hostname -I | awk '{print $1}'
```

Then update the value in `lib/config/api_config.dart`:
```dart
return 'http://<YOUR_LOCAL_IP>:8000/api/v1';
```

Or override it at build/run time without touching the file:
```bash
flutter run --dart-define=API_BASE_URL=http://<YOUR_LOCAL_IP>:8000/api/v1
```

---

### 4. 📱 Run on a Physical Android Device

1. **Enable Developer Options** on your phone: go to *Settings → About Phone* and tap **Build Number** 7 times.
2. Enable **USB Debugging** inside Developer Options.
3. Connect the device via USB cable and accept the prompt on your phone.
4. Verify the device is recognised:
   ```bash
   flutter devices
   ```
   You should see your phone listed (e.g. `SM A055F`).

5. **(Easiest option)** Use `adb reverse` so the phone reaches the backend through the USB cable — no Wi-Fi required:
   ```bash
   # adb is located at ~/Android/Sdk/platform-tools/adb on this machine
   ~/Android/Sdk/platform-tools/adb reverse tcp:8000 tcp:8000
   ```
   > **Tip:** Add `~/Android/Sdk/platform-tools` to your `PATH` so you can just type `adb`:
   > ```bash
   > echo 'export PATH="$HOME/Android/Sdk/platform-tools:$PATH"' >> ~/.bashrc && source ~/.bashrc
   > ```

   When using `adb reverse`, update the base URL in `lib/config/api_config.dart` to:
   ```
   http://localhost:8000/api/v1
   ```
   Alternatively, keep the LAN IP (`10.11.52.123`) so it works over Wi-Fi without needing `adb reverse`.

6. Run the app on your device:
   ```bash
   # Run on the SM A055F (device ID: R92X819WPPW)
   flutter run -d R92X819WPPW

   # Or let Flutter auto-detect the only connected device
   flutter run
   ```

---

### 5. 📦 Build a Release APK

Build an APK to share or install without a USB cable.

```bash
# ARM64 (modern phones)
flutter build apk --release --target-platform=android-arm64

# ARM (older phones)
flutter build apk --release --target-platform=android-arm

# Universal (both architectures)
flutter build apk --release --target-platform=android-arm,android-arm64
```

The generated APK is at:
```
build/app/outputs/flutter-apk/app-release.apk
```

Install it directly onto the connected device:
```bash
flutter install
# or
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

---

## 🎤 Presentation / Demo Guide

Follow these steps exactly to run a live demo from a pre-built APK.

### Step 1 — Start the Backend
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 2 — Expose via Localtunnel (for pre-built APKs)
The pre-built APKs are hardcoded to `https://dailynewshub2026.loca.lt`. Open a **second terminal** and run:
```bash
npx localtunnel --port 8000 --subdomain dailynewshub2026
```
You should see: `your url is: https://dailynewshub2026.loca.lt`

### Step 3 — Install the APK on Devices
Distribute the APK to the demo devices. The app will automatically connect to the backend via the tunnel.

> Keep **both** terminals open for the duration of the demo.

---

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
