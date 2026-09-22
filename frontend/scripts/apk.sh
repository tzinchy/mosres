#!/usr/bin/env sh
# Builds a debug APK with the API address baked in:
#   npm run apk -- http://192.168.1.10:5433
# The URL is where the phone can reach the API (LAN IP, tunnel or server), not
# localhost — that would point at the phone itself.
set -eu
API=${1:-${VITE_API_URL:-}}
[ -n "$API" ] || { echo "usage: npm run apk -- <api-url>   e.g. http://192.168.1.10:5433"; exit 1; }

export JAVA_HOME=${JAVA_HOME:-$HOME/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home}
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}

VITE_API_URL="$API" npm run build
npx cap sync android
(cd android && ./gradlew --no-daemon assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk ./mosres.apk
echo "APK: $(pwd)/mosres.apk  (API: $API)"
