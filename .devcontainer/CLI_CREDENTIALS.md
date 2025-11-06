# CLI Credentials & Token Setup for Audicle Dev Container

This guide explains how to set up credentials for GitHub, Vercel, Google Gemini, and other CLI tools in the dev container to avoid repeated login prompts on each container rebuild.

## Option 1: Environment Variables (Recommended for CI/CD)

Set these environment variables on your **host machine** before starting the dev container:

```bash
export GITHUB_TOKEN=<your-github-pat>
export VERCEL_TOKEN=<your-vercel-token>
export GEMINI_API_KEY=<your-google-gemini-api-key>
export GH_TOKEN=<your-github-token>  # for 'gh' CLI
export GITMOJI_TOKEN=<optional>      # if needed
```

Then in VS Code, the `.devcontainer/devcontainer.json` will automatically pass these via `remoteEnv` into the container.

## Option 2: VS Code Secrets (Recommended for Local Development)

1. Open the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: `Dev Containers: Add Dev Container Configuration Files`
3. Or manually edit `.devcontainer/devcontainer.json` and add secrets:

```json
{
  "remoteEnv": {
    "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}",
    "VERCEL_TOKEN": "${localEnv:VERCEL_TOKEN}",
    "GEMINI_API_KEY": "${localEnv:GEMINI_API_KEY}"
  }
}
```

Then store these as **VS Code Workspace Secrets**:

- Press `Ctrl+Shift+P` → "Open User Settings (JSON)"
- Or use the **Settings Sync** feature in VS Code Settings

## Option 3: Manual Login on Container Start

After the container starts, run:

```bash
# GitHub
gh auth login

# Vercel
vercel login

# GitKraken CLI
gk auth login

# Google Gemini CLI
gcloud auth login
```

Credentials are stored in the container's home directory (`/home/vscode/.config/`, `~/.vercel/`, `~/.ssh/`, etc.) and **persisted** across container rebuilds as long as you don't delete the container volume.

## Persistence Details

- **GitHub**: `~/.config/gh/` (persisted in Docker volume)
- **Vercel**: `~/.vercel/` (persisted in Docker volume)
- **GitKraken**: `~/.config/gk/` (persisted in Docker volume)
- **Google**: `~/.config/gcloud/` (persisted in Docker volume)
- **SSH Keys**: `~/.ssh/` (persisted in Docker volume)

## Recommended Setup for This Project

1. **First time only**: Run the commands above (Option 2 or 3)
2. **Subsequent times**: Credentials are automatically loaded from the persistent volume
3. **To reset**: Run `vercel logout`, `gh auth logout`, etc., then re-login

## Environment Variables Currently Supported

In `.devcontainer/devcontainer.json`:

```json
"remoteEnv": {
  "GEMINI_API_KEY": "${localEnv:GEMINI_API_KEY}",
  "PATH": "${containerEnv:PATH}:/home/vscode/.local/bin"
}
```

Add more as needed based on your workflow:

```json
"remoteEnv": {
  "GEMINI_API_KEY": "${localEnv:GEMINI_API_KEY}",
  "GITHUB_TOKEN": "${localEnv:GITHUB_TOKEN}",
  "VERCEL_TOKEN": "${localEnv:VERCEL_TOKEN}",
  "GH_TOKEN": "${localEnv:GH_TOKEN}",
  "PATH": "${containerEnv:PATH}:/home/vscode/.local/bin"
}
```

## Testing

After starting the container, verify credentials are available:

```bash
# Check GitHub
gh auth status

# Check Vercel
vercel whoami

# Check GitKraken
gk auth status

# Check uv and uvx
which uv
which uvx
uvx --version
```

## Troubleshooting

**"uvx: command not found"**

- Ensure `PATH` includes `/home/vscode/.local/bin`
- Run: `export PATH="$PATH:/home/vscode/.local/bin"`
- Or check that uv installed successfully: `ls -la ~/.local/bin/`

**"gk: command not found"**

- Ensure `/usr/local/bin/gk` exists: `which gk`
- Run: `sudo chmod +x /usr/local/bin/gk`

**"vercel: command not found"**

- Reinstall: `sudo npm install -g vercel`

**Repeated login prompts**

- Check that credential directories are persisted in the Docker volume
- Verify `remoteEnv` variables are set in `.devcontainer/devcontainer.json`
- Use Docker volume inspection to confirm storage: `docker inspect <container_id> | grep Mounts`
