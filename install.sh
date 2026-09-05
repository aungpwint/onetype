#!/usr/bin/env bash
#
# install.sh — OneType Linux installer
#
# Downloads the correct signed OneType package for this machine, verifies its
# SHA256 checksum against the checksums.txt published in the GitHub Release,
# and only then installs it. Fails safely: nothing is written to the system
# when the download, checksum or privilege checks do not pass.
#
# Safety model:
#   * HTTPS only (GitHub) — never a plain HTTP source.
#   * download -> verify -> execute, never `curl ... | bash`.
#   * the package is verified against the SHA256 published by the release,
#     which is itself trusted over HTTPS.
#
# Usage:
#   ./install.sh                       # latest release, native package
#   ./install.sh --version v1.2.3      # pin a specific release
#   ./install.sh --repo OWNER/REPO     # override the repository
#   ./install.sh --arch amd64|arm64    # override architecture detection
#
# Environment (for private repositories):
#   GH_TOKEN=<personal access token> ./install.sh
#   (the token is used only for the download, never embedded anywhere)
#
set -euo pipefail

REPO="${ONETYPE_REPO:-aungpwint/onetype}"
VERSION=""
ARCH=""
TOKEN="${GH_TOKEN:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:?--version requires a value}"; shift 2 ;;
    --repo) REPO="${2:?--repo requires a value}"; shift 2 ;;
    --arch) ARCH="${2:?--arch requires a value}"; shift 2 ;;
    -h|--help)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

API_HEADER=()
if [[ -n "$TOKEN" ]]; then API_HEADER=(-H "Authorization: Bearer $TOKEN"); fi

info()  { printf '\033[1;34m[install.sh]\033[0m %s\n' "$*"; }
error() { printf '\033[1;31m[install.sh] ERROR:\033[0m %s\n' "$*" >&2; }

# --- Architecture ----------------------------------------------------------
if [[ -z "$ARCH" ]]; then
  case "$(uname -m)" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
      error "Unsupported architecture: $(uname -m). Supported: amd64, arm64."
      exit 1
      ;;
  esac
fi
case "$ARCH" in
  amd64|arm64) ;;
  *) error "Unsupported --arch '$ARCH'. Use amd64 or arm64."; exit 1 ;;
esac

# --- Package manager -------------------------------------------------------
PKG_FLAVOR=""
if command -v apt-get >/dev/null 2>&1; then PKG_FLAVOR="deb"; fi
if [[ -z "$PKG_FLAVOR" && ( -n "$(command -v dnf || true)" || -n "$(command -v yum || true)" ) ]]; then
  PKG_FLAVOR="rpm"
fi
if [[ -z "$PKG_FLAVOR" ]]; then
  error "Could not find a supported package manager (apt/dnf/yum)."
  echo "  OneType also ships an AppImage build you can run without installing:"
  echo "  https://github.com/$REPO/releases/latest"
  exit 1
fi

# --- Resolve release tag ---------------------------------------------------
TAG="$VERSION"
if [[ -z "$TAG" ]]; then
  info "Resolving the latest release of $REPO ..."
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
  API_BODY="$(curl -fsSL --retry 2 "${API_HEADER[@]}" "$API_URL")"
  TAG="$(printf '%s' "$API_BODY" | grep -Eo '"tag_name"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n1 | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)"/\1/' || true)"
  if [[ -z "$TAG" ]]; then
    error "Could not determine the latest release tag from $API_URL."
    exit 1
  fi
fi
if [[ "$TAG" != v* ]]; then TAG="v$TAG"; fi
VER="${TAG#v}"
if ! [[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
  error "Unrecognised release version '$TAG'."
  exit 1
fi

if [[ "$PKG_FLAVOR" == "deb" ]]; then
  ASSET="onetype_${VER}_${ARCH}.deb"
else
  ASSET="onetype-${VER}-1.${ARCH}.rpm"
fi

BASE="https://github.com/$REPO/releases/download/$TAG"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

info "Downloading $ASSET ($TAG) ..."
curl -fsSL --retry 3 "${API_HEADER[@]}" -o "$WORK/$ASSET" "$BASE/$ASSET"
if [[ ! -s "$WORK/$ASSET" ]]; then
  error "Downloaded artifact is empty: $BASE/$ASSET"
  exit 1
fi

# --- Checksum verification -------------------------------------------------
info "Verifying SHA256 against checksums.txt ..."
if curl -fsSL --retry 3 "${API_HEADER[@]}" -o "$WORK/checksums.txt" "$BASE/checksums.txt"; then
  EXPECTED="$(awk -v name="$ASSET" '$2 == name { print $1 }' "$WORK/checksums.txt" | head -n1)"
  if [[ -z "$EXPECTED" ]]; then
    error "No checksum entry for '$ASSET' in the release checksums.txt — refusing to install."
    exit 1
  fi
  ACTUAL="$(sha256sum "$WORK/$ASSET" | awk '{ print $1 }')"
  if [[ "$ACTUAL" != "$EXPECTED" ]]; then
    error "Checksum mismatch for $ASSET — refusing to install."
    error "  expected $EXPECTED"
    error "  actual   $ACTUAL"
    exit 1
  fi
  info "Checksum verified: ${EXPECTED:0:16}…"
else
  error "Could not download checksums.txt — refusing to install an unverified package."
  exit 1
fi

# --- Run as root / sudo ----------------------------------------------------
if [[ "$(id -u)" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO=(sudo)
  else
    error "Root privileges required (sudo not found). Run as root or re-run with sudo."
    exit 1
  fi
else
  SUDO=()
fi

# --- Install ---------------------------------------------------------------
info "Installing $ASSET ..."
if [[ "$PKG_FLAVOR" == "deb" ]]; then
  if [[ "${ONETYPE_DISABLE_APT_FIX:-}" != "1" ]]; then
    "${SUDO[@]}" apt-get update -y
  fi
  "${SUDO[@]}" apt-get install -y "$WORK/$ASSET"
else
  if [[ -n "$(command -v dnf || true)" ]]; then
    "${SUDO[@]}" dnf install -y "$WORK/$ASSET"
  elif [[ -n "$(command -v yum || true)" ]]; then
    "${SUDO[@]}" yum install -y "$WORK/$ASSET"
  else
    "${SUDO[@]}" rpm -Uvh "$WORK/$ASSET"
  fi
fi

info "OneType $VER installed. Launch it from your application menu or with:"
echo "  onetype"