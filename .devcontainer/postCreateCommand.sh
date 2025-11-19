#!/bin/bash
# Post-create development environment setup script
# This runs automatically when the dev container is created

set +e  # Don't exit on error, let commands fail gracefully

echo "=== Installing global npm packages ==="
sudo npm install -g @google/gemini-cli @github/copilot vercel 2>/dev/null || true

echo "=== Installing uv (Python package manager) ==="
curl -LsSf https://astral.sh/uv/install.sh | sh || true

echo "=== Installing GitKraken CLI ==="

# アーキテクチャ判定を追加
ARCH="amd64"
if [ "$(uname -m)" = "aarch64" ]; then
  ARCH="arm64"
fi

# 判定したアーキテクチャを使用
# Try multiple asset names in order of preference
for name in gk-linux-$ARCH gk-linux-$ARCH.tar.gz gk; do
  url="https://github.com/gitkraken/gk-cli/releases/latest/download/$name"
  echo "Trying: $url"
  
  if curl -L --fail -o /tmp/gk_asset "$url" 2>/dev/null; then
    echo "✓ Downloaded successfully"
    
    # Check if it's a tarball and extract if needed
    if file /tmp/gk_asset | grep -q "gzip\|compress"; then
      echo "  Extracting tarball..."
      tar -xzf /tmp/gk_asset -C /tmp 2>/dev/null || true
      if [ -f /tmp/gk ]; then
        sudo mv /tmp/gk /usr/local/bin/gk
        sudo chmod +x /usr/local/bin/gk
        echo "  ✓ Installed /usr/local/bin/gk"
        rm -f /tmp/gk_asset
        break
      fi
    else
      echo "  Moving binary to /usr/local/bin/gk..."
      sudo mv /tmp/gk_asset /usr/local/bin/gk
      sudo chmod +x /usr/local/bin/gk
      echo "  ✓ Installed /usr/local/bin/gk"
      break
    fi
  fi
done

# Clean up temporary files
rm -f /tmp/gk_asset /tmp/gk 2>/dev/null || true

echo "=== Installing Python dependencies ==="
# Ensure uv is on PATH for pip install
export PATH="$PATH:/home/vscode/.local/bin"

# Install Python dependencies using uv if available, else use pip
if [ -x "/home/vscode/.local/bin/uv" ]; then
  echo "Using uv for pip install..."
  /home/vscode/.local/bin/uv pip install -r packages/api-server/requirements.txt 2>/dev/null || true
else
  echo "Using system pip for install..."
  pip install -r packages/api-server/requirements.txt 2>/dev/null || true
fi

echo "=== Dev container setup complete ==="
echo ""
echo "Installed tools:"
echo "  - Gemini CLI: $(which gemini 2>/dev/null || echo 'NOT FOUND')"
echo "  - GitHub Copilot: $(which copilot 2>/dev/null || echo 'NOT FOUND')"
echo "  - Vercel CLI: $(which vercel 2>/dev/null || echo 'NOT FOUND')"
echo "  - UV: $(which uv 2>/dev/null || echo 'NOT FOUND')"
echo "  - UVX: $(which uvx 2>/dev/null || echo 'NOT FOUND')"
echo "  - GitKraken CLI: $(which gk 2>/dev/null || echo 'NOT FOUND')"
echo ""
echo "Next steps:"
echo "  1. Authenticate CLI tools (if needed):"
echo "     - gh auth login"
echo "     - vercel login"
echo "     - gk auth login"
echo "  2. See .devcontainer/CLI_CREDENTIALS.md for token setup options"
