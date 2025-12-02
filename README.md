[日本語版はこちら](./README.ja.md)

# Audicle

Audicle (Article + Audio) is a platform that reads article content on web pages aloud.

It provides a comfortable "reading while doing something else" experience.

## Product Lineup

Audicle is offered in three forms to suit your usage style.

### 1. Vercel-Hosted Version (Invitation-Only)

The easiest way to get started, this is the cloud version of the web application.

- **Features**:
  - No need to create an account or configure a server
  - The latest features are immediately available
  - Provides high-quality, stable audio (Supabase + Vercel Storage)
- **Access**:
  - Currently operating on an invitation-only basis. Please contact us if you wish to use it.

### 2. Self-Hosted Web Application

This version is for those who want to run Audicle in their own server environment.

- **Features**:
  - Lightweight and simple
  - Less dependence on external services
  - Easy to deploy
- **Setup**:
  - See `packages/web-app`.

### 3. Chrome Extension

An extension to install directly into your browser to read the article you are currently viewing on the spot.

- **Features**:
  - Start reading with a single click without leaving the website
  - Simple and intuitive operation
  - Can use Google TTS (default) or connect to your self-hosted `api-server`
- **Installation**:
  - See `packages/chrome-extension` and load it in developer mode.

## Main Features

- **One-Click Playback**: Playback starts just by clicking the paragraph you want to read
- **Intelligent Content Extraction**: Removes ads and extracts only the main text
- **Playback Highlighting**: You can see at a glance where it's being read
- **Multiple TTS Engine Support**: You can select a text-to-speech engine according to your needs

## Tech Stack

This project is built with the following tech stack.

- **`web-app-vercel` (Full-Featured Frontend)**
  - **Framework**: Next.js 16, React 19
  - **Language**: TypeScript
  - **UI**: Tailwind CSS
  - **Testing**: Jest, Playwright
  - **Database**: Supabase, Vercel Storage
  - **Authentication**: NextAuth.js

- **`web-app` (Simple Frontend)**
  - **Framework**: Next.js 15, React 19
  - **Language**: TypeScript
  - **UI**: Tailwind CSS

- **`api-server` (Backend)**
  - **Framework**: FastAPI (Python)
  - **TTS Engine**: Google Cloud Text-to-Speech
  - **Deployment**: Docker

- **`chrome-extension` (Browser Extension)**
  - **Language**: JavaScript
  - **Library**: Mozilla Readability.js

## Architecture Overview

Audicle consists of multiple packages in a monorepo configuration.

```
/packages
├── api-server/        # API server for text-to-speech (Python/FastAPI)
├── chrome-extension/  # Browser extension
├── db/                # Database schema management
├── web-app/           # Simple self-hosted web app
└── web-app-vercel/    # Full-featured Vercel-hosted web app
```

- **`chrome-extension`** extracts the body of the currently viewed page. It can perform TTS directly or send text to **`api-server`**.
- **`web-app`** is a lightweight viewer that fetches articles and performs text-to-speech.
- **`web-app-vercel`** is the full-featured version optimized for Vercel, including user authentication, database integration, and advanced playback features.
- **`api-server`** provides a robust TTS API using Google Cloud Text-to-Speech, used by the Chrome extension or self-hosted setups.

## API Endpoint Example

The self-hosted `api-server` provides the following endpoint.

### Synthesize text to speech

```bash
curl -X POST "http://localhost:8000/synthesize" \
-H "Content-Type: application/json" \
-d '{"text": "This is a test"}' \
--output test.mp3
```

On success, the audio data is saved with the filename `test.mp3`.

## Troubleshooting

### `api-server` fails to start

- **Problem**: The container does not start normally even after running `docker-compose up`.
- **Solution**:
  - Check if the Google Cloud credential file (`credentials.json`) is correctly placed in the `packages/api-server/credentials` directory.
  - Check if Docker is running correctly.

### Chrome extension does not work

- **Problem**: There is no response when clicking the extension icon, or reading does not start.
- **Solution**:
  - Check if the `api-server` is running correctly (if using `api_server` mode).
  - Check if the API server URL is set correctly in the extension settings (`http://localhost:8000`).
  - Check if any error messages are displayed in the developer tools console.

## Contributing

Contributions are welcome! Please see the [Contribution Guidelines (English)](CONTRIBUTING.md) or [Contribution Guidelines (Japanese)](CONTRIBUTING.ja.md) for details.

## License

This project is under the MIT License. See the [LICENSE](LICENSE) file for details.
