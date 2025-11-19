# Use the official dev container base image which includes Python, Git, and essential tools
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install Node.js via NodeSource repository (more reliable than nvm in containers)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Docker CLI for Docker-in-Docker functionality
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli pass && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Ensure vscode user has proper permissions and set up credential storage for CLI tools
USER vscode
WORKDIR /workspaces

# Initialize GPG and pass for credential storage (needed for gh, gk, vercel CLIs to cache credentials)
RUN mkdir -p ~/.gnupg ~/.password-store && \
    gpg --generate-key --batch --no-tty <<EOF 2>/dev/null || true
%echo Generating a basic OpenPGP key
Key-Type: default
Key-Length: 2048
Name-Real: vscode
Name-Email: vscode@audicle.local
Passphrase: 
%no-protection
%commit
%echo done
EOF
RUN echo "machine github.com" > ~/.netrc 2>/dev/null || true && \
    chmod 600 ~/.netrc 2>/dev/null || true