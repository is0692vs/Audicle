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
  - Provides high-quality, stable audio
- **Access**:
  - Currently operating on an invitation-only basis. Please contact us if you wish to use it.

### 2. Self-Hosted Web Application

This version is for those who want to run Audicle in their own server environment.

- **Features**:
  - All features are freely customizable
  - Less dependence on external services
  - Easy to deploy with Docker Compose
- **Setup**:
  - See `packages/web-app` and `packages/api-server`.

### 3. Chrome Extension

An extension to install directly into your browser to read the article you are currently viewing on the spot.

- **Features**:
  - Start reading with a single click without leaving the website
  - Simple and intuitive operation
- **Installation**:
  - See `packages/chrome-extension` and load it in developer mode.

## Main Features

- **One-Click Playback**: Playback starts just by clicking the paragraph you want to read
- **Intelligent Content Extraction**: Removes ads and extracts only the main text
- **Playback Highlighting**: You can see at a glance where it's being read
- **Multiple TTS Engine Support**: You can select a text-to-speech engine according to your needs

## Tech Stack

This project is built with the following tech stack.

- **`api-server` (Backend)**
  - **Framework**: FastAPI (Python)
  - **TTS Engine**: Google Cloud Text-to-Speech
  - **Deployment**: Docker

- **`web-app` / `web-app-vercel` (Frontend)**
  - **Framework**: Next.js, React
  - **Language**: TypeScript
  - **UI**: Tailwind CSS
  - **Testing**: Jest, Playwright
  - **Database**: Supabase (Vercel version)

- **`chrome-extension` (Browser Extension)**
  - **Language**: JavaScript
  - **Library**: Mozilla Readability.js

## Architecture Overview

Audicle consists of multiple packages in a monorepo configuration.

```
/packages
├── api-server/        # API server for text-to-speech
├── chrome-extension/  # Browser extension
├── db/                # Database schema
└── web-app/           # Self-hosted web app
└── web-app-vercel/    # Vercel-hosted web app
```

- **`chrome-extension`** extracts the body of the currently viewed page and sends it to the **`api-server`** to receive the audio data.
- **`web-app`** fetches and parses the article at the specified URL on the server side and performs text-to-speech synthesis. The self-hosted version uses this.
- **`web-app-vercel`** is optimized for hosting on Vercel, with added user authentication and database integration features.

## API Endpoint Example

The self-hosted `api-server` provides the following endpoint.

### Synthesize text to speech

```bash
curl -X POST "http://localhost:8001/synthesize/simple" \
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
  - Check if the `api-server` is running correctly.
  - Check if the API server URL is set correctly in the extension settings (`http://localhost:8001`).
  - Check if any error messages are displayed in the developer tools console.

## Contributing

Contributions are welcome! Please see the [Contribution Guidelines (English)](CONTRIBUTING.md) or [Contribution Guidelines (Japanese)](CONTRIBUTING.ja.md) for details.

Please note that all project-related communication must be in Japanese.

## License

This project is under the MIT License. See the [LICENSE](LICENSE) file for details.
