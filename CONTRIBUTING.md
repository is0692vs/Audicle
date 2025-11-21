# Contribution Guidelines

Thank you for your interest in contributing to the Audicle project!

This document explains how to contribute to Audicle.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Environment Setup](#development-environment-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Conventions](#coding-conventions)
- [Commit Message Conventions](#commit-message-conventions)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

## 🤝 Code of Conduct

We expect all contributors to cooperate with respect in this project.

- Provide constructive feedback
- Respect different perspectives and experiences
- Do not engage in inappropriate behavior or harassment

## 🎯 How to Contribute

You can contribute in the following ways:

### 1. Bug Reports

If you find a bug, please create an [Issue](https://github.com/is0692vs/Audicle/issues).

### 2. Feature Requests

If you have an idea for a new feature, please create an Issue as well.

### 3. Documentation Improvements

Fixing typos or clarifying READMEs, comments, and documents.

### 4. Code Contributions

Fixing bugs or implementing new features.

### 5. Adding Tests

Improving test coverage.

### 6. Translation

Translating documents into English, etc.

## 🛠️ Development Environment Setup

### Prerequisites

- Node.js 18 or higher
- Docker & Docker Compose
- Git
- Google Chrome or a Chromium-based browser

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/is0692vs/Audicle.git
cd Audicle

# Install Chrome extension dependencies
cd packages/chrome-extension
npm install

# Install web app dependencies
cd ../web-app
npm install

# Start the API server
cd ../api-server
docker-compose up -d
```

### Development with Dev Container (Recommended)

Using the Dev Containers extension in VS Code makes it easy to build a consistent development environment.

1. Install VS Code
2. Install the Dev Containers extension
3. Open the project
4. `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"

## 🔄 Pull Request Process

### Communication Language

All communication, including Pull Request descriptions, comments, and commit messages, must be in **Japanese**. This is to ensure smooth communication within the development community of this project.

### 1. Fork and Clone

```bash
# Clone your forked repository
git clone https://github.com/YOUR_USERNAME/Audicle.git
cd Audicle

# Add the original repository as upstream
git remote add upstream https://github.com/is0692vs/Audicle.git
```

### 2. Create a Branch

```bash
# Get the latest main branch
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/feature-name` - New feature
- `fix/issue-description` - Bug fix
- `docs/subject` - Documentation update
- `refactor/subject` - Refactoring
- `test/subject` - Adding tests

### 3. Implement Changes

Please implement according to the coding conventions.

### 4. Run Tests

```bash
# Test the Chrome extension
# Reload the extension at chrome://extensions/, then open test.html
open packages/chrome-extension/test/test.html

# Test the web app
cd packages/web-app
npm run dev
# Test at http://localhost:3000
```

### 5. Commit

```bash
git add .
git commit -m "feat: Add new feature"
```

### 6. Push

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

Please create a pull request on GitHub.

**Pull Request Template:**

````markdown
## Overview

Briefly describe what was changed in this PR.

## Changes

- Change 1
- Change 2

## How to Test

1. Step 1
2. Step 2

## Screenshots (if applicable)

[Attach images]

## Checklist

- [ ] I have run the tests and they all passed.
- [ ] I have updated the documentation (if applicable).
- [ ] I have followed the coding conventions.
- [ ] The commit message is appropriate.

## 🧭 CI / GitHub Actions

Audicle uses GitHub Actions to run automated tests. The workflows in the repository are as follows:

- `ci.yml` — Full CI pipeline (runs on push)
- `ci-pr.yml` — Simplified CI for PRs (runs on PRs, E2E runs with a reduced matrix)

By default, `ci-pr.yml` runs for Pull Requests (PRs) and executes E2E tests only with `chromium` to save time/cost.
`ci.yml` runs the full matrix (multiple browsers, sharded) on push. If you want to try the full matrix for a PR, you can use `ci.yml` (run it manually or check after merging).

### Local CI Execution Commands

Here are example commands to run CI-equivalent tasks locally. You need Playwright's browsers to run E2E tests.

```bash
# Unit tests (Jest)
cd packages/web-app-vercel
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Chromium, generate StorageState)
npx playwright test --project=setup # Create authentication state once
npx playwright test --project=chromium
```
````

### Tips for Reducing the Matrix

- Use `ci-pr.yml` for PRs (`chromium` only, 1 shard). This reduces the number of GitHub Actions workers and costs.
- If you want to reduce the matrix further, adjust the number of `matrix.browser` and `matrix.shard` in `/.github/workflows/ci.yml`.

### About Parallelization and Sharding

- `ci.yml` runs E2E tests in parallel with a combination of `shard` and `browser`. This speeds up the tests but increases the number of GitHub Actions runs. Rules:
  - Low cost, few workers: `matrix.browser: [chromium]`, `matrix.shard: [1]`
  - Fast, multiple workers: `matrix.browser: [chromium, firefox]`, `matrix.shard: [1,2,3]`

### GitHub Secrets Setup (for E2E)

`ci.yml` refers to the following Secrets. If you run E2E in a PR, please set up the Secrets.

- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — Test account for E2E authentication
- `NEXTAUTH_SECRET` — For Next.js authentication
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase test environment information

See `.github/workflows/ci.yml` for details.

````

## 📝 Coding Conventions

### JavaScript/TypeScript

- **Indentation**: 2 spaces
- **Quotes**: Use single quotes `'`
- **Semicolons**: Do not omit
- **Naming Conventions**:
  - Variables/Functions: `camelCase`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

### File Structure

- Split files by feature
- Aim for under 500 lines per file
- Place related files in the same directory

### Comments

- Add explanations for complex logic
- Describe functions in JSDoc format

```javascript
/**
 * Synthesizes text to speech.
 * @param {string} text - The text to synthesize.
 * @param {Object} options - The option settings.
 * @returns {Promise<Blob>} The audio data.
 */
async function synthesize(text, options) {
  // Implementation
}
````

## 💬 Commit Message Conventions

We recommend the [Conventional Commits](https://www.conventionalcommits.org/) format.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Example

```
feat(chrome-extension): Add 2x playback speed feature

Implemented 2x playback speed using the Google TTS API.
Can be enabled in config.json.

Closes #123
```

## 🐛 Bug Reports

If you find a bug, please create an Issue with the following information:

### Template

```markdown
## Description of the Bug

Briefly describe the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

Describe what you expected to happen.

## Actual Behavior

Describe what actually happened.

## Screenshots

Add screenshots if applicable.

## Environment

- OS: [e.g., Windows 10, macOS 13.0, Ubuntu 22.04]
- Browser: [e.g., Chrome 120.0]
- Audicle Version: [e.g., 1.0.0]
- TTS Engine in use: [e.g., Google TTS, Edge TTS]

## Additional Information

Add any other relevant information.
```

## 💡 Feature Requests

If you have an idea for a new feature, please create an Issue with the following information:

### Template

```markdown
## Description of the Feature

Briefly describe the proposed feature.

## Motivation

Why is this feature needed? What problem does it solve?

## Proposed Implementation

If possible, describe ideas for implementation.

## Alternatives

Describe any alternative solutions or features you've considered.

## Additional Information

Add any other relevant information.
```

## 🎓 Learning Resources

Resources to help with Audicle development:

### Web Technologies

- [MDN Web Docs](https://developer.mozilla.org/)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)

### APIs/Libraries

- [Mozilla Readability.js](https://github.com/mozilla/readability)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Edge TTS](https://github.com/rany2/edge-tts)

### Frameworks

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## ❓ Questions and Support

If you have questions, please contact us in the following ways:

1. **GitHub Discussions**: For general questions and discussions
2. **GitHub Issues**: For bug reports and feature requests
3. **Pull Request**: For code review requests

## 📜 License

Audicle is released under the MIT License. By contributing, you agree that your code will be released under the same license.

---

Thank you for contributing! Your contributions make Audicle a better project.
