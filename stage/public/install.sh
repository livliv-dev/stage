#!/bin/bash
# LivLiv Stage for macOS, from the latest release on GitHub, into Applications.
#   curl -fsSL https://livliv.ai/stage/install.sh | bash
# A browser marks what it downloads as "from the internet", and macOS then asks before opening an app that is not
# signed yet. This script downloads with curl instead, so LivLiv Stage opens straight away, and checks the download
# against the SHA-256 GitHub keeps for it before installing anything.
# LIVLIV_STAGE_DIR sets another folder than /Applications.
set -euo pipefail

releases="https://github.com/livliv-dev/stage/releases/latest"
if [ "$(uname -s)" != "Darwin" ]; then
  echo "This installer is for macOS. Other systems: $releases"
  exit 1
fi
case "$(uname -m)" in
  arm64) arch=arm64 ;;
  x86_64) arch=x64 ;;
  *) echo "No LivLiv Stage build for $(uname -m). See $releases"; exit 1 ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# the latest release's zip for this Mac, and the SHA-256 GitHub keeps for it (read with macOS's own plutil)
release="$tmp/release.json"
curl -fsSL -o "$release" "https://api.github.com/repos/livliv-dev/stage/releases/latest"
url="" sum="" i=0
while name=$(plutil -extract "assets.$i.name" raw -o - "$release" 2>/dev/null); do
  case "$name" in
    LivLiv-Stage-[0-9]*-"$arch".zip)
      url=$(plutil -extract "assets.$i.browser_download_url" raw -o - "$release")
      sum=$(plutil -extract "assets.$i.digest" raw -o - "$release" 2>/dev/null || true)
      break ;;
  esac
  i=$((i + 1))
done
if [ -z "$url" ] || [ "${sum%%:*}" != "sha256" ]; then
  echo "Couldn't find the download. Get it from $releases"
  exit 1
fi

dest="${LIVLIV_STAGE_DIR:-/Applications}"
if [ ! -w "$dest" ]; then
  dest="$HOME/Applications"
fi
mkdir -p "$dest"
app="$dest/LivLiv Stage.app"

echo "Downloading ${url##*/}"
curl -fL --progress-bar -o "$tmp/stage.zip" "$url"
if [ "$(shasum -a 256 "$tmp/stage.zip" | cut -d ' ' -f 1)" != "${sum#sha256:}" ]; then
  echo "The download doesn't match its checksum, so nothing was installed. Try again, or get it from $releases"
  exit 1
fi
ditto -x -k "$tmp/stage.zip" "$tmp/app"
if [ ! -d "$tmp/app/LivLiv Stage.app" ]; then
  echo "The download doesn't hold LivLiv Stage.app. Get it from $releases"
  exit 1
fi

if [ -d "$app" ]; then
  if pgrep -xq "LivLiv Stage"; then
    osascript -e 'quit app "LivLiv Stage"' >/dev/null 2>&1 || true
    sleep 2
  fi
  rm -rf "$app"
fi
mv "$tmp/app/LivLiv Stage.app" "$app"
xattr -dr com.apple.quarantine "$app" 2>/dev/null || true

echo "LivLiv Stage is in $dest"
open "$app"
