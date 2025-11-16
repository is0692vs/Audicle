# 貢献ガイドライン

Audicle プロジェクトへの貢献に興味を持っていただき、ありがとうございます！

このドキュメントでは、Audicle に貢献する方法を説明します。

## 📋 目次

- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [プルリクエストの手順](#プルリクエストの手順)
- [コーディング規約](#コーディング規約)
- [コミットメッセージ規約](#コミットメッセージ規約)
- [バグ報告](#バグ報告)
- [機能要望](#機能要望)

## 🤝 行動規範

このプロジェクトでは、すべての貢献者が敬意を持って協力し合うことを期待しています。

- 建設的なフィードバックを提供する
- 異なる視点や経験を尊重する
- 不適切な言動や嫌がらせを行わない

## 🎯 貢献の方法

以下の方法で貢献できます：

### 1. バグ報告

不具合を発見した場合は、[Issue](https://github.com/is0692vs/Audicle/issues) を作成してください。

### 2. 機能要望

新しい機能のアイデアがある場合も、Issue を作成してください。

### 3. ドキュメントの改善

README、コメント、ドキュメントの誤字修正や明確化。

### 4. コードの貢献

バグ修正や新機能の実装。

### 5. テストの追加

テストカバレッジの向上。

### 6. 翻訳

ドキュメントの英語翻訳など。

## 🛠️ 開発環境のセットアップ

### 前提条件

- Node.js 18 以上
- Docker & Docker Compose
- Git
- Google Chrome または Chromium ベースブラウザ

### クローンとセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/is0692vs/Audicle.git
cd Audicle

# Chrome 拡張機能の依存関係をインストール
cd packages/chrome-extension
npm install

# Web アプリの依存関係をインストール
cd ../web-app
npm install

# API サーバーを起動
cd ../api-server
docker-compose up -d
```

### Dev Container での開発（推奨）

VS Code の Dev Containers 拡張機能を使用すると、一貫した開発環境を簡単に構築できます。

1. VS Code をインストール
2. Dev Containers 拡張機能をインストール
3. プロジェクトを開く
4. `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"

## 🔄 プルリクエストの手順

### 1. フォークとクローン

```bash
# フォークしたリポジトリをクローン
git clone https://github.com/YOUR_USERNAME/Audicle.git
cd Audicle

# オリジナルのリポジトリを upstream として追加
git remote add upstream https://github.com/is0692vs/Audicle.git
```

### 2. ブランチを作成

```bash
# 最新の main ブランチを取得
git checkout main
git pull upstream main

# 新しいブランチを作成
git checkout -b feature/your-feature-name
```

ブランチ名の規則：

- `feature/機能名` - 新機能
- `fix/修正内容` - バグ修正
- `docs/対象` - ドキュメント更新
- `refactor/対象` - リファクタリング
- `test/対象` - テスト追加

### 3. 変更を実装

コーディング規約に従って実装してください。

### 4. テストを実行

```bash
# Chrome 拡張機能のテスト
# chrome://extensions/ で拡張機能をリロード後、test.html を開く
open packages/chrome-extension/test/test.html

# Web アプリのテスト
cd packages/web-app
npm run dev
# http://localhost:3000 でテスト
```

### 5. コミット

```bash
git add .
git commit -m "feat: 新機能の追加"
```

### 6. プッシュ

```bash
git push origin feature/your-feature-name
```

### 7. プルリクエストを作成

GitHub でプルリクエストを作成してください。

**プルリクエストのテンプレート:**

````markdown
## 概要

この PR で何を変更したか簡潔に説明

## 変更内容

- 変更点 1
- 変更点 2

## テスト方法

1. 手順 1
2. 手順 2

## スクリーンショット（該当する場合）

[画像を添付]

## チェックリスト

- [ ] テストを実行し、すべて成功した
- [ ] ドキュメントを更新した（該当する場合）
- [ ] コーディング規約に従っている
- [ ] コミットメッセージが適切である

## 🧭 CI / GitHub Actions

Audicle は GitHub Actions を使って自動テストを実行しています。リポジトリ内のワークフローは以下の通りです。

- `ci.yml` — フル CI パイプライン（push に反応）
- `ci-pr.yml` — PR 向けの簡易 CI（PR に反応、E2E は縮小されたマトリクスで実行）

デフォルトでは、PR (Pull Request) では `ci-pr.yml` が実行され、時間/コストを抑えるために `chromium` のみで E2E を実行します。
`ci.yml` は push でフルマトリクス（複数ブラウザ、分割シャード）を実行します。PR 時にフルマトリクスを試したい場合は `ci.yml` を使う（手動での実行やマージ後の確認）ことができます。

### CI 実行コマンド（ローカル）

以下は CI 相当のタスクをローカルで実行するコマンド例です。E2E を実行するには Playwright のブラウザが必要です。

```bash
# 単体テスト（Jest）
cd packages/web-app-vercel
npm run test:unit

# 統合テスト
npm run test:integration

# E2E テスト（Chromium, StorageState 生成）
npx playwright test --project=setup # 一度だけ認証状態を作る
npx playwright test --project=chromium
```
````

### マトリクスの小さくするためのヒント

- PR では `ci-pr.yml` を利用してください（`chromium` のみ、シャード 1）。これで GitHub Actions のワーカー数とコストを削減できます。
- もしマトリクスをさらに縮小したい場合は、`/.github/workflows/ci.yml` 内で `matrix.browser` と `matrix.shard` の数を調整してください。

### 並列化とシャーディングについて

- `ci.yml` は E2E テストを `shard` と `browser` の組み合わせで並列実行します。これにより、テストを高速化できますが、GitHub Actions の実行数は増えます。ルール：
  - 低コスト、少ないワーカー: `matrix.browser: [chromium]`, `matrix.shard: [1]`
  - 高速、複数ワーカー: `matrix.browser: [chromium, firefox]`, `matrix.shard: [1,2,3]`

### GitHub Secrets のセットアップ（E2E 用）

`ci.yml` は以下の Secrets を参照します。PR で E2E を実行する場合は、Secrets を設定してください。

- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` — E2E 認証用テストアカウント
- `NEXTAUTH_SECRET` — Next.js 認証のため
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase のテスト環境情報

詳細は `.github/workflows/ci.yml` を参照してください。

````

## 📝 コーディング規約

### JavaScript/TypeScript

- **インデント**: 2 スペース
- **引用符**: シングルクォート `'` を使用
- **セミコロン**: 省略しない
- **命名規則**:
  - 変数・関数: `camelCase`
  - クラス: `PascalCase`
  - 定数: `UPPER_SNAKE_CASE`

### ファイル構成

- 機能ごとにファイルを分割
- 1ファイル 500行以内を目安に
- 関連するファイルは同じディレクトリに配置

### コメント

- 複雑なロジックには説明を追加
- JSDoc 形式で関数の説明を記述

```javascript
/**
 * テキストを音声合成する
 * @param {string} text - 合成するテキスト
 * @param {Object} options - オプション設定
 * @returns {Promise<Blob>} 音声データ
 */
async function synthesize(text, options) {
  // 実装
}
````

## 💬 コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/) 形式を推奨します。

### 形式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor`: バグ修正や機能追加ではないコードの変更
- `perf`: パフォーマンス改善
- `test`: テストの追加や修正
- `chore`: ビルドプロセスやツールの変更

### 例

```
feat(chrome-extension): 2倍速再生機能を追加

Google TTS API を使用した2倍速再生を実装。
config.json で有効化できる。

Closes #123
```

## 🐛 バグ報告

バグを発見した場合は、以下の情報を含めて Issue を作成してください：

### テンプレート

```markdown
## バグの説明

バグの内容を簡潔に説明

## 再現手順

1. '...' に移動
2. '...' をクリック
3. '...' まで下にスクロール
4. エラーを確認

## 期待される動作

期待される動作を説明

## 実際の動作

実際に何が起こったか説明

## スクリーンショット

該当する場合、スクリーンショットを追加

## 環境

- OS: [例: Windows 10, macOS 13.0, Ubuntu 22.04]
- ブラウザ: [例: Chrome 120.0]
- Audicle バージョン: [例: 1.0.0]
- 使用している TTS エンジン: [例: Google TTS, Edge TTS]

## 追加情報

その他、関連する情報があれば記載
```

## 💡 機能要望

新機能のアイデアがある場合は、以下の情報を含めて Issue を作成してください：

### テンプレート

```markdown
## 機能の説明

提案する機能を簡潔に説明

## 動機

なぜこの機能が必要か、どんな問題を解決するか

## 提案する実装方法

可能であれば、実装方法のアイデアを記載

## 代替案

検討した代替案があれば記載

## 追加情報

その他、関連する情報があれば記載
```

## 🎓 学習リソース

Audicle の開発に役立つリソース：

### Web 技術

- [MDN Web Docs](https://developer.mozilla.org/)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)

### API・ライブラリ

- [Mozilla Readability.js](https://github.com/mozilla/readability)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Edge TTS](https://github.com/rany2/edge-tts)

### フレームワーク

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## ❓ 質問やサポート

質問がある場合は、以下の方法でお問い合わせください：

1. **GitHub Discussions**: 一般的な質問や議論
2. **GitHub Issues**: バグ報告や機能要望
3. **Pull Request**: コードレビューのリクエスト

## 📜 ライセンス

Audicle は MIT License の下で公開されています。貢献したコードは、同じライセンスの下で公開されることに同意したものとみなされます。

---

貢献いただき、ありがとうございます！あなたの貢献が Audicle をより良いプロジェクトにします。
