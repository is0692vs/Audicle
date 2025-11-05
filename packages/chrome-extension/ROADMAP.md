# プロジェクト Audicle: 開発 Issue リスト（最終版）

<aside>
ℹ️

本ドキュメントではプロダクト名を「Audicle」に統一しています。コード上の識別子（例: `audicle/`, `.audicle-clickable`, `data-audicle-id`）は互換性維持のため現状のまま表記・運用している箇所があります。

</aside>

---

### マイルストーン 1: プロジェクト基盤と基本操作の構築

### Issue #1: [Chore] 拡張機能プロジェクトの初期設定

- GitHub: [#1](https://github.com/is0692vs/Auticle/issues/1)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: 開発を開始するための土台となる、最低限のファイル構成と設定を準備する。
- 実装方針
  1. `audicle/` フォルダを作成。
  2. `manifest.json` を作成し、Manifest V3 仕様に準拠した設定を記述（`name`, `version`, `permissions`: `"storage"`, `"activeTab"`, `"scripting"` など）。
  3. `popup.html`, `popup.js`, `content.js`, `background.js`, `icon.png` を空または動作確認用コードを記述した状態で作成。
- [x] 完了条件
  - [x] Chrome の `chrome://extensions` からエラーなく本プロジェクトを読み込めること。
  - [x] ツールバーにアイコンが表示され、クリックすると空の `popup.html` が表示されること。

---

### Issue #2: [Feature] Popup UI の作成と状態の永続化

- GitHub: [#2](https://github.com/is0692vs/Auticle/issues/2)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: ユーザーが拡張機能の有効/無効を切り替える UI を提供し、その設定を永続化させる。
- 実装方針
  1. `popup.html`: `<input type="checkbox">` を使ったトグルスイッチ UI を実装（ID: `toggle-switch`）。
  2. `popup.css`: 上記チェックボックスをモダンなトグルスイッチに見せる CSS を記述。
  3. `popup.js`:
     - `DOMContentLoaded` 時に [`chrome.storage`](http://chrome.storage)`.local.get` で保存された状態を取得し、スイッチに反映（デフォルト `false`）。
     - スイッチの `change` イベントを監視し、[`chrome.storage`](http://chrome.storage)`.local.set` で状態を保存する。
- [x] 完了条件
  - [x] Popup を開くと、トグルスイッチが最後に設定した状態で表示されること。
  - [x] スイッチを切り替えると、その状態が [`chrome.storage`](http://chrome.storage)`.local` に保存されること。

---

### Issue #3: [Chore] 拡張機能各コンポーネント間の通信確立

- GitHub: [#3](https://github.com/is0692vs/Auticle/issues/3)
- 担当者: [Developer Name]
- マイルストーン: 1. プロジェクト基盤と基本操作の構築
- 背景: Popup での UI 操作を、実際にページ上で動作する `content.js` に伝えるための通信経路を確立する。
- 実装方針
  1. `popup.js`:
     - トグルスイッチの `change` イベント内で、`chrome.tabs.query` でアクティブなタブを取得。
     - `chrome.tabs.sendMessage` を使い、`content.js` に `{ command: 'stateChange', enabled: (boolean) }` を送信。
  2. `content.js`:
     - `chrome.runtime.onMessage.addListener` でメッセージを待ち受け、`console.log` で受信内容を出力して疎通確認。
- [x] 完了条件
  - [x] Popup でスイッチを操作すると、アクティブなページのコンソールに現在の有効状態 (`true`/`false`) がログ出力されること。

---

### マイルストーン 2: 中核となる読み上げ機能の実装

### Issue #4: [Feature] 読み上げモード ON 時の DOM 操作

- GitHub: [#4](https://github.com/is0692vs/Auticle/issues/4)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: テキストのクリック検知とハイライト表示を行うため、対象 DOM 要素を事前に特定・加工する。
- 実装方針
  1. `content.js`:
     - `preparePage()` と `cleanupPage()` を定義し、Issue #3 のメッセージに応じて呼び出す。
     - `preparePage()`: 段落要素（`p` など）に `data-audicle-id` 属性と `.audicle-clickable` クラスを付与。
     - `cleanupPage()`: 追加した属性・クラスを削除して原状復帰。
  2. `styles.css`: `.audicle-clickable` に `{ cursor: pointer; }` などを定義し、`preparePage()` 実行時に動的注入。
- [x] 完了条件
  - [x] 拡張機能を ON にすると、対象段落がクリック可能な見た目になること。
  - [x] 拡張機能を OFF にすると、ページが完全に元の状態に戻ること。

---

### Issue #5: [Feature] クリックによる読み上げトリガー

- GitHub: [#5](https://github.com/is0692vs/Auticle/issues/5)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: 加工済み DOM 要素のクリックを検知し、その位置から読み上げるテキストを収集して `background.js` に渡す。
- 実装方針
  1. `content.js`:
     - `preparePage` 内でクリックイベントを登録（イベント委任）。
     - クリック対象が `.audicle-clickable` なら `data-audicle-id` を取得。
     - すべての `.audicle-clickable` を走査し、クリック ID 以降のテキストを収集・結合。
     - `chrome.runtime.sendMessage` で `background.js` に `{ command: 'play', text: 収集テキスト }` を送信。
- [x] 完了条件
  - [x] 加工された段落をクリックすると `background.js` に `play` コマンドが送信されること。
  - [x] 送信メッセージに、クリック段落から記事末尾までのテキストが含まれること。

---

### Issue #6: [Feature] 背景での音声再生機能

- GitHub: [#6](https://github.com/is0692vs/Auticle/issues/6)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: Web Speech API の不安定さを回避するため、Google 翻訳の TTS と `<audio>` 要素を用いた再生方式にアーキテクチャを変更。
- 実装方針（更新後）
  1. `manifest.json`
     - `host_permissions` に Google 翻訳 TTS へのアクセス許可を追加。
     - `permissions` に `activeTab` を追加（`popup.js` ↔ `content.js` の連携用途）。
  2. `background.js`
     - 受信テキストから Google 翻訳 TTS のエンドポイント URL を生成。
     - `fetch` で MP3 を取得し `data:` URL へ変換。
     - 変換した `data:` URL を `content.js` に返す。
  3. `content.js`
     - クリック段落以降（最大 200 文字）を収集し、`background.js` に再生をリクエスト。
     - 受け取った `data:` URL を `<audio>` の `src` に設定し、再生速度 `2.0` で再生。
     - 再生中に新リクエストが来たら直前の再生を停止して差し替え。
  4. UI（`popup.html`, `popup.js`）
     - 速度調整 UI は廃止。読み上げモードの ON/OFF のみに簡素化。
- 達成したこと
  - クリックされた最初の文章の塊（最大 200 文字）を Google 翻訳 TTS で 2.0 倍速再生するコア再生エンジンを実装。
  - Web Speech API 依存を解消し、環境差に強い構成を確立。
- 残された課題（仕様）
  - Google 翻訳 TTS の文字数制限（約 200 文字）により、長文は途中で止まる。これは現時点では仕様であり、Issue #7 で連続再生により補完する。
- [x] 完了条件（更新）
  - [x] クリックした段落から `<audio>` による音声が 2.0 倍速で再生される。
  - [x] 再生中に別段落をクリックすると即停止し、新しい段落から 2.0 倍速で再生される。

<aside>
🛠️

変更履歴: Web Speech API ベースから、Google 翻訳 TTS + `<audio>` 再生方式へ全面移行。安定性向上と一貫した倍速再生のための設計変更です。

</aside>

---

### Issue #7: [Feature] 読み上げ箇所の同期ハイライト ＋ 連続再生

- GitHub: [#7](https://github.com/is0692vs/Auticle/issues/7)
- 担当者: [Developer Name]
- マイルストーン: 2. 中核となる読み上げ機能の実装
- 背景: Issue #6 の仕様（TTS 約 200 文字）を前提に、チャンク連結の連続再生と再生中箇所の同期ハイライトを統合して実装。
- やったことのまとめ（更新）
  - クリックされた段落から記事の最後まで、連続再生を実装。
  - 再生中の箇所（チャンクが属する段落）をリアルタイムにハイライト。
  - 次チャンクの音声データを先読み（プリフェッチ）して途切れを最小化。
- 主な変更点
  - `content.js`
    - 再生キュー導入: クリック位置以降の本文を約 200 文字で分割し、`playbackQueue` に `{ text, paragraphId }` で格納。
    - 連続再生: `<audio>.onended` をトリガーに次チャンク再生を `background.js` に要求。キューが空になるまで繰り返し。
    - 同期ハイライト: `updateHighlight()` を新設。現在チャンクの `paragraphId` に `.audicle-highlight` を付与し、それ以外を解除。
    - プリフェッチ: 次に再生するチャンク（デフォルト 2 つ先まで）を非同期で要求し、`audioCache` に保存。
  - `background.js`
    - プリフェッチ用 `fetch` コマンドを追加。受け取ったテキストから音声 `data:` URL を生成して返却。
    - 既存の `play` コマンドは即時再生用として継続利用。
- メッセージ仕様（参考）
  - 送信: `{ command: 'play' | 'fetch', text, lang?: 'ja', speed: 2.0 }`
  - 受信: `{ command: 'audio', url: 'data:audio/mp3;...' }`
- [x] 完了条件（更新）
  - [x] 200 文字制限を跨いで記事末尾まで自動で連続再生される。
  - [x] 再生中は現在の塊のみがハイライトされ、次塊へ遷移時にハイライトも移動する。
  - [x] 再生中に別段落をクリックすると直ちに新しい箇所の連続再生に切り替わる。
  - [x] モード OFF で再生が停止し、ハイライトが全解除される。

<aside>
🔄

変更履歴: 同期ハイライトに加え、連続再生とプリフェッチを実装して体感の途切れを解消しました。

</aside>

---

### Issue #19: [Feature] 高度な本文抽出と構造認識の実装

- GitHub: [#19](https://github.com/is0692vs/Auticle/issues/19#top)
- 担当者: [Owner 未設定]
- マイルストーン: 2. 中核となる読み上げ機能の実装（本文抽出の高度化）
- 背景: 現在の抽出は単純なタグ収集（例 `p`）のため、サイドバーやフッターまで読み上げる可能性があり、見出しや箇条書きなどの構造情報も失われる。連続再生の価値を最大化するには、人が読むように本文のみを構造を意識して抽出する必要がある。
- 実装方針
  1. Readability.js の導入
     - ライブラリ（Mozilla/Firefox リーダービュー採用）をプロジェクトに追加。
     - `manifest.json` の `web_accessible_resources` に登録。
     - `content.js` から動的ロード可能にする。
  2. 本文コンテナの特定
     - `handleClick` 実行時に Readability でページ全体の DOM を解析。
     - テキスト密度やタグ構造からメインコンテンツ（`<article>` や `#main-content` 等）を自動特定。
  3. 構造化テキストの抽出
     - 特定コンテナから `p`, `h1`–`h3`, `ul`, `li` 等を順序通りに取得。
     - サイドバー等の不要要素は自然に除外。
  4. 再生キュー生成ロジックの更新
     - 取得要素リストから `playbackQueue` を生成。
     - 要素種別に応じて文頭に短い前置きを付加可能。
       - 見出し: 「見出し。」例: 「見出し。結論」
       - 箇条書き: 「箇条書きです。」例: 「箇条書きです。思ってた業務内容と相当乖離があった」
     - ハイライトは要素のユニーク属性（例 `data-sourcepos`）で DOM と紐付け。
- [ ] 完了条件
  - [x] 読み上げ時にサイドバーやフッター等の無関係テキストが再生されない。
  - [x] 見出し（`h1`–`h6`）が本文の正しい順序で読み上げられる。
  - [x] 箇条書き（`li`）が順番通りに読み上げられる。
  - [ ] 任意: 見出しや箇条書きであることが音声で区別できる工夫がされている。

[Read this first — 開発者向けクイックガイド](https://www.notion.so/Read-this-first-273523e17f9181bbb059d8723658099f?pvs=21)

- PR コメント要約（Issue #19）
- 端末ログ: `git diff main..19revenge --name-only` ほか各種 diff コマンドの実行記録あり
- PR タイトル: `feat: Readability.js を導入してテキスト抽出ロジックを刷新し、本文構造を意識した読み上げを実現`

### 概要

Mozilla Readability.js を導入し、メインコンテンツ自動特定と構造化抽出により、サイドバー/フッターの不要文を除外。本文構造（見出し・箇条書き）を保った読み上げへ移行。

### 実装内容

1. Readability.js の導入

- `lib/Readability.js` 追加（約 2796 行）
- `manifest.json`: `web_accessible_resources` に登録、バージョン 1.0.0 → 1.0.1

2. `content.js` の刷新

- カスタムルール: Qiita 用に `#personal-public-article-body .mdContent-inner` 直下の `p, li, h1-h6, blockquote, pre` を優先
- `injectReadabilityLib()` で動的読み込み
- キュー構築: `buildQueueWithCustomRule` / `buildQueueWithReadability` / `buildQueueWithFallback`
- 構造化テキスト: 見出し「見出し。」、箇条書き「箇条書きです。」の前置き（任意）
  - ハイライト: `data-audicle-id` 基点の `updateHighlight()`
- バッチ処理: `BATCH_SIZE=3`、`MAX_RETRIES=2` によるエラー低減

3. `background.js`

- `cleanText()` で URL・特殊文字除去を適用（`play`/`fetch`）
- `batchFetch` 追加で並行バッチ処理

4. その他

- `.gitignore` に `lib/Readability.js` を追加

### テスト

- Chrome で拡張を更新し、Qiita 記事で検証
- 確認観点
  - 本文のみ再生（不要領域は除外）
  - 見出しと箇条書きが順序通りに読み上げられる
  - ハイライトが正しく遷移
  - 失敗時のリトライ動作、バッチ化によるリクエスト削減

### 期待結果

- 構造を意識した本文読み上げに改善
- ログ出力で抽出・エラー再試行の可視化

### 影響範囲・リスク

- 互換性: MV3 準拠、既存のクリック/ハイライトは維持
- 性能: Readability 解析分の遅延が増加する可能性（許容範囲）
- リスク: Google TTS は非公式利用のため、将来は公式 API 検討

### レビューポイント

- Readability.js 採用の妥当性
- Qiita 向けカスタムルールの汎用化余地
- バッチ処理によるエラー低減効果

---

### マイルストーン 3: UI/UX の改善と仕上げ

### Issue #8: [Feature] 読み上げの停止機能

- GitHub: [#8](https://github.com/is0692vs/Auticle/issues/8)
- 担当者: [Developer Name]
- マイルストーン: 3. UI/UX の改善と仕上げ
- コンセプト: 「スイッチ OFF が完全リセット」。OFF で拡張機能の動作を完全終了し、ページをクリーンな状態へ戻す。
- 要件（整理）
- popup.js の責務: トグル OFF 時は [`chrome.storage`](http://chrome.storage) に `enabled: false` を記録するだけ。停止メッセージは送らない。
- content.js の責務: [`chrome.storage`](http://chrome.storage) の変化を監視し、`enabled: false` を検知したらリセット処理を実行。
  - 音声リセット: 再生中の `<audio>` を即停止。
  - ハイライトリセット: `.audicle-highlight` をすべて解除。
  - 再生キューリセット: `playbackQueue = []`、`queueIndex = 0` にし、意図せぬ再開を防止。
- 追加実装（ユーザーフィードバック反映）
- 一時停止機能を追加（電源 OFF とは別軸）。
  - popup.html: トグルの下に「一時停止/再開」ボタンを追加（`#pause-resume-btn`）。
  - popup.js: クリックで `togglePauseResume` を `content.js` に送信。状態に応じてボタン文言を動的変更。
  - content.js:
    - `togglePauseResume` 受信で一時停止または再開。
    - 一時停止: `audioPlayer.pause()`、`isPlaying = false`。ハイライトは維持。
    - 再開: `playQueue()` で続きから再生。
    - `cleanupPage()` を更新し、OFF リセット時は `audioCache.clear()` を実施。一方、一時停止ではキャッシュは保持（`audioCache` は消さない）。
- [x] 完了条件（更新）
  - [x] OFF で音声停止、ハイライト解除、キュー空、キャッシュクリアで完全リセットされる。
  - [x] 一時停止時は音声のみ停止し、ハイライトとキャッシュが保持され、再開で続きから再生できる。
  - [x] popup.js は OFF でストレージ更新のみを行い、停止メッセージを送らない。
- テスト方法

1. 環境準備

- `chrome://extensions/` で拡張を更新。
- Qiita 記事（例: [記事リンク](https://qiita.com/irochi/items/bdba7a02e5394a79f81f%EF%BC%89%E3%82%92%E9%96%8B%E3%81%8F%E3%80%82)）を開く。

2. 基本動作

- トグル ON → 段落をクリックし再生開始。

3. 一時停止機能

- popup の「一時停止」をクリック → 再生停止、ハイライト維持、ボタンは「再開」に。
- 「再開」をクリック → 続きから再生、同じ箇所はキャッシュから再生されフェッチしない。

4. 電源 OFF 機能

- トグル OFF → 再生停止、ハイライト解除、クリックしても再生されない。
- ページをリロード → クリーン状態を確認。

5. 期待ログ

- 一時停止/再開時に `Playback paused` / `Playback resumed` が出力される。

<aside>
⏯️

変更履歴: OFF を完全リセットと定義しつつ、ユーザー要望で一時停止を追加。OFF はキャッシュも含めて全消去、一時停止はキャッシュとハイライトを保持します。

</aside>

---

### Issue #9: [Feature] 視覚的なフィードバック

### Issue #10: [Enhancement/Refactoring] 音声合成方式の切替対応

- GitHub: [リンク](https://github.com/is0692vs/Audicle/issues/28)
- Labels: `enhancement`, `refactoring`
- マイルストーン: 3. UI/UX の改善と仕上げ
- 背景（要約）
- 音声合成が Google 翻訳 TTS に直結しており拡張性が低い
- 将来の Azure TTS / Amazon Polly 等への切替・追加に備える
- Web Speech API は不安定のため採用しない方針
- 既存の Google TTS の体験は維持したい
- 実装方針（決定）
- 責務分離: 「テキスト → 音声データ URL」を返すモジュールに限定
- 設定ベース切替: config.json の synthesizerType で方式を指定（UI での動的切替はしない）
- 反映方法: 設定変更時は拡張機能のリロードで反映
- 連続再生や先読みは呼び出し側（既存ロジック）が担当
- やったこと（実装）
- AudioSynthesizer 抽象化と GoogleTTSSynthesizer 実装
- SynthesizerFactory を追加し config.json に基づきインスタンス生成
- background.js を新構成へ適合（play/fetch ルートの委譲）
- content.js に audio 再生エラーのハンドリングとリトライ・スキップ追加
- manifest.json に config.json を web_accessible_resources 登録
- ドキュメント更新: [ROADMAP.md](http://ROADMAP.md), [README.md](http://README.md), [audio-synthesis-refactor-summary.md](http://audio-synthesis-refactor-summary.md)
- テスト（抜粋）
- 基本: 拡張を更新 → 読み上げ ON → 段落クリック → Google TTS で再生されること
- 設定: config.json の synthesizerType を不正値に変更 → リロード → エラー確認 → 正常値復帰で正常動作
- エラー耐性: ネットワーク遮断で再生 → リトライログ → 最大リトライ後はスキップ
- 疎結合性: background.js のレビューで合成ロジック分離を確認、将来エンジン追加の容易さを確認
- [x] 既存の Google TTS 体験を維持
- [x] 合成モジュールの疎結合化と設定ベース切替
- [x] エラー時のリトライ・スキップ強化

### テストモジュール（TestSynthesizer）

- 目的: 方式切替の実機テストを容易にする固定音源リターン実装
- 実装: `TestSynthesizer` を追加し常に [`sample.mp](http://sample.mp)3` を返却。`SynthesizerFactory`に`test` を追加
- 設定: `config.json` の `{"synthesizerType":"test"}` で有効化。反映は拡張リロード
- マニフェスト: `web_accessible_resources` に [`sample.mp](http://sample.mp)3` を追加
- ドキュメント: [`sample.mp3.md`](http://sample.mp3.md) を追加し設置とテスト手順を説明
- テスト手順（ショート）

1. [`sample.mp](http://sample.mp)3` を配置

2. `config.json` を `test` に変更 → 拡張を更新

3. 段落クリックで [`sample.mp](http://sample.mp)3`が再生され、コンソールに`[TestSynthesizer] ... returning [sample.mp](http://sample.mp)3` が出る

4. `google_tts` に戻して従来動作を確認

- [x] `test` 設定時は常に [`sample.mp](http://sample.mp)3` が再生
- [x] 設定変更は拡張リロードで即時反映
- [x] 既存の連続再生・ハイライト・一時停止が両方式で維持

<aside>
🔎

将来追加手順の想定: `AzureTTSSynthesizer` を実装 → Factory に case を追加 → `{"synthesizerType":"azure_tts"}` で切替。

</aside>

### Issue #20: [Refactoring] 本文抽出ルールをライブラリ化して切り出し

https://github.com/is0692vs/Audicle/issues/26

## 📋 要件・実装・テスト方法まとめ

### 🎯 元の要件

1. Qiita 一般向けルールと Readability.js の扱いがファイル分散しており把握が困難
2. 採用ルールの優先順位管理や URL ごとの特殊処理を分かりやすく運用したい
3. どのページでどのルールが採用されたかを即時判別できる可観測性が必要
4. 将来の新サイト用ルール追加で迷わないよう、配置・命名・手順を統一して開発者体験を改善

### 🔧 実装した内容

| 課題         | 実装内容                      | ファイル                      |
| ------------ | ----------------------------- | ----------------------------- |
| ファイル分散 | rules.js に一元集約           | rules.js                      |
| 優先順位管理 | priority プロパティで数値管理 | 同上                          |
| 可観測性     | 詳細ログ出力・抽出履歴記録    | content.js                    |
| 開発者体験   | 標準化された配置・命名・手順  | [README.md](http://README.md) |

### 1. 新ルール管理システム（rules.js）

```jsx
const SITE_SPECIFIC_RULES = {
  "[qiita.com](http://qiita.com)": {
    id: "qiita-custom",
    name: "Qiita記事抽出",
    type: "site-specific",
    priority: 1000, // 高優先度
    extractStrategy: {
      containerSelectors: ["#personal-public-article-body .mdContent-inner"],
      contentSelectors: ["p", "h1", "h2", "h3", "ul > li", "ol > li"],
      // ...
    },
  },
};

const GENERAL_RULES = {
  readability: {
    id: "readability-fallback",
    priority: 5, // 中優先度
    // ...
  },
  fallback: {
    id: "fallback-extraction",
    priority: 1, // 最低優先度
    // ...
  },
};
```

### 2. 統合 content.js（content.js）

```jsx
// 新旧システム併用・フォールバック機能
try {
  if (window.ExtractionRulesManager) {
    const result = buildQueueWithNewRulesManager();
    queue = result.queue;
    extractionInfo = [result.info](http://result.info);
  } else {
    const result = buildQueueWithLegacySystem();
    // フォールバック処理
  }
} catch (error) {
  // 緊急フォールバック
}

// 可観測性ログ
console.log(`[🎯 Extraction Result] Rule: ${extractionInfo.rule}, Blocks: ${queue.length}`);
console.log(`[📊 Rule Info] Priority: ${extractionInfo.priority}, Type: ${extractionInfo.type}`);
```

### 3. 設定更新（manifest.json）

```json
"content_scripts": [{
  "js": ["content-extract/rules.js", "content.js"], // rules.js を優先ロード
  // ...
}]
```

### 4. 開発者向け手順（[README.md](http://README.md)）

- 新サイト対応ルール追加の詳細手順
- CSS セレクターの特定方法
- 優先度設定のガイドライン
- よく使用されるセレクターパターン
- デバッグのヒント

### 🧪 テスト方法

### 基本テスト手順

1. Chrome 拡張機能の更新（chrome://extensions で Audicle の「更新」）
2. Qiita ページでの動作確認
   - 任意の Qiita 記事を開く
   - 段落をクリックして音声再生・ハイライトを確認
3. 新ルール管理システムのログ確認

```
[ExtractionRules] Found site-specific rule: qiita-custom
[NewRulesManager] Using rule: qiita-custom (site-specific, priority: 1000)
[🎯 Extraction Result] Rule: qiita-custom, Blocks: 72, Domain: [qiita.com](http://qiita.com)
[📊 Rule Info] Priority: 1000, Type: site-specific
```

1. テストページでの動作確認
   - test.html を開いて基本機能をテスト
   - フォールバックルール（汎用セレクター）の動作確認

### 動作確認ポイント

| 機能           | 確認方法         | 期待結果                                  |
| -------------- | ---------------- | ----------------------------------------- |
| ルール採用     | Console ログ     | [🎯 Extraction Result] Rule: qiita-custom |
| 音声再生       | 段落クリック     | 2.0 倍速で読み上げ開始                    |
| ハイライト     | 再生中           | 現在の段落がハイライト表示                |
| 優先順位       | 複数ルール存在時 | 高 priority 順で採用                      |
| フォールバック | ルール失敗時     | レガシー → 緊急の順で代替                 |

### 📊 達成状況

| 要件                | 達成度 | 確認方法                   |
| ------------------- | ------ | -------------------------- |
| ✅ ファイル分散解決 | 100%   | rules.js に一元化完了      |
| ✅ 優先順位管理     | 100%   | priority で数値管理        |
| ✅ 可観測性向上     | 100%   | 詳細ログで採用ルール表示   |
| ✅ 開発者体験改善   | 100%   | 標準化手順を README に記載 |

### 🎉 最終結果

新しいルール管理システムが完全に動作し、すべての要件を満たした堅牢なシステムが完成。

- Qiita 専用ルールが正常に採用される
- 音声再生・ハイライト機能も正常動作
- 将来の新サイト対応も標準化手順で効率的に追加可能
- 可観測性により、採用ルールを即座に把握可能

---

### 新しい作業: Edge TTS 統合（完了レポート）

- GitHub: [リンク](https://github.com/is0692vs/Audicle/issues/33)

### ✅ 完了した課題

1. 新しい音声合成モジュール「edge_tts」の実装
   - Python FastAPI サーバー（edge-tts 利用）
   - Chrome 拡張への EdgeTTSSynthesizer 統合
   - config.json で切替可能
2. venv 自動アクティベーション設定
   - VS Code settings.json でワークスペース入場時に自動切替
3. DOM 順序問題の解決
   - rules.js の組み合わせセレクターで抽出順を厳密化
   - 1, 2, 3, ... の順で確実に再生
4. ハイライト・再生同期の修正
   - updateHighlight の自動スクロール復旧
   - 位置ジャンプ時の同期エラーを解消
5. 段階的読み込みの最適化
   - progressiveFetch でクリック位置優先
   - 残りはバックグラウンドで段階的に読み込み
   - サーバー負荷を 600ms 間隔で分散
6. サーバー責任範囲の明確化（ステートレス）
   - Python サーバー: テキスト入力 →MP3 出力のみ
   - キュー管理や順序制御はクライアント側（拡張）
   - 受信テキストをログ出力（デバッグ）
7. ドキュメント更新
   - [README.md](http://README.md) にサーバー責任を追記
   - [edge-tts-integration-report.md](http://edge-tts-integration-report.md) に全体まとめ

### 🧪 テスト方法

1. サーバー起動

```bash
cd python-tts-server
source venv/bin/activate  # 自動化済だが念のため
python [server.py](http://server.py)
```

2. Chrome 拡張設定

```json
// audicle/config.json
{ "synthesizerType": "edge_tts" }
```

3. 拡張機能をリロード（chrome://extensions → Audicle → 更新）

4. 動作確認

- テスト対象: Qiita 記事（例: https://qiita.com/irochi/items/bdba7a02e5394a79f81f%EF%BC%89%E3%82%92%E9%96%8B%E3%81%8F）
- 拡張を有効化して任意段落をクリック

期待挙動

- 0.5–1.0 秒以内に再生開始
- ハイライト同期と自動スクロールが正しく動作
- DOM 順序通りに再生（1, 2, 3, ...）
- 再生中でも別段落クリックで位置ジャンプ可
- バックグラウンドで段階的読み込み継続

コンソールログ例

```
[NewRulesManager] Processing block 0: p (id: 0) - "テキスト..."
progressiveFetch: Fetching initial batch of 3 items for immediate playbook
🎤 [TTS Request] Text: 'テキスト内容...' (length: 67)
```

### 🎯 アーキテクチャ概要（責務分離）

| コンポーネント | 責任                                                 |
| -------------- | ---------------------------------------------------- |
| Python Server  | テキスト →MP3 変換のみ（完全ステートレス）           |
| rules.js       | DOM 順序でのテキスト抽出                             |
| content.js     | キュー管理、再生制御、ハイライト同期、段階的読み込み |
| background.js  | 音声合成方式の振り分け                               |

データフロー

1. ユーザー段落クリック
2. rules.js で DOM 順序に従いブロック抽出
3. content.js がクリック位置から段階的にキュー構築
4. progressiveFetch が最初の 5 件を優先読み込み
5. Python Server が Edge TTS で MP3 生成（ここだけ）
6. content.js が順序通りに再生し、ハイライト同期
7. 残りをバックグラウンドで段階的に読み込み

### 🎊 最終結果

- 音声品質: Microsoft Edge TTS で高品質
- パフォーマンス: クリック後 0.5–1.0 秒で再生開始
- 拡張性: 疎結合で他 TTS の追加も容易
- 安定性: ステートレスサーバー + 段階的読み込み
- ユーザビリティ: 位置ジャンプ、ハイライト同期、自動スクロール が安定動作

---

### 新しい作業: Docker 版 Edge TTS オプションの追加（完了）

- GitHub: [リンク](https://github.com/is0692vs/Audicle/issues/35)

### 🎯 目的・ゴール

1. LAN 内共有で Audicle の音声合成を複数端末から利用可能にする
2. Docker 化で環境差を排除し安定デプロイを実現
3. 設定の簡素化: config.json はエンジン選択のみに集約
4. 疎結合維持: 既存アーキテクチャを崩さない独立オプション

### 🔧 実装内容

1. Docker 版 Edge TTS サーバー（docker-tts-server）

```
docker-tts-server/
├── Dockerfile               # Python 3.11-slim ベース
├── docker-compose.yml       # サービス定義とネットワーク
├── [server.py](http://server.py)                # FastAPI 音声合成サーバー
├── requirements.txt         # Python 依存
├── .env                     # 環境変数（ポート・ホスト・音声設定）
└── [README.md](http://README.md)                # Docker 版ドキュメント
```

- Microsoft Edge TTS で高品質合成
- 0.0.0.0 バインドで LAN アクセスに対応
- ヘルスチェックとログ出力
- 既存 API 仕様と完全互換
- 起動: `cd docker-tts-server && docker-compose up -d`

2. Chrome 拡張の音声合成モジュール

- 新クラス: `EdgeTTSDockerSynthesizer`
- 固定エンドポイント: [`http://localhost:8001`](http://localhost:8001)
- 設定引数不要、既存 API と互換
- Factory 追加:

```jsx
case "edge_tts_docker":
  return new EdgeTTSDockerSynthesizer();
```

3. 設定管理の簡素化

- config.json（固定）:

```json
{ "synthesizerType": "edge_tts_docker" }
```

- 対話的設定スクリプト（configure\_[audicle.sh](http://audicle.sh)）を削除
- Docker 側の設定は .env に集約

4. 環境変数管理（.env）

```
TTS_HOST_PORT=8001
TTS_HOST_IP=0.0.0.0
DEFAULT_VOICE=ja-JP-NanamiNeural
COMPOSE_PROJECT_NAME=audicle-edge-tts
```

- すべてのサーバー設定は Docker 側で完結
- README を更新し環境変数管理を明記
- AUDIO*SYNTHESIS*[MODULES.md](http://MODULES.md) とメイン README のスクリプト記述を削除

5. ドキュメント更新

- AUDIO*SYNTHESIS*[MODULES.md](http://MODULES.md): Docker 版設定を記載、古い手順を削除
- [README.md](http://README.md): 起動・テスト・運用ガイドを統合

### 🧪 テスト項目

- 基本機能
  1. Docker 起動: `docker-compose up -d`
     - コンテナ起動とヘルスチェック成功
  2. API 動作: `curl` による疎通と MP3 生成確認
     - GET: http://localhost:8001/>
     - POST: http://localhost:8001/synthesize/simple>
  3. 拡張統合: config.json を `edge_tts_docker` に設定しリロード
     - クリックで音声再生が開始
- 設定簡素化
  - config.json に余分なパラメータがない
  - Docker 設定が .env に集約
- LAN アクセス
  - 0.0.0.0 バインドで同一ネットワーク端末からアクセス可能
  - .env のポート変更で動作切替可

### 🎯 設計原則と運用改善

- 責務分離: Docker サーバーは「テキスト → 音声」のみ。拡張側でキュー・ハイライト管理
- 設定の一元化: config.json は方式選択のみ、詳細は .env
- 独立性: 既存 `edge_tts` は残し、`edge_tts_docker` を独立実装
- 起動の標準化: `docker-compose up -d` のみで稼働
- 不要スクリプト削除で保守性向上（configure\_[audicle.sh](http://audicle.sh) 等）

### 🎊 最終結果

- シンプルな導入と運用で高品質 Edge TTS を LAN 共有可能に
- 環境変数ベースの明快な設定で誤設定を削減
- 既存拡張との疎結合を保ち、将来の拡張にも容易に対応

### 📋 修正した問題と解決策（追記）

🚨 発見した問題

1. edge-tts ライブラリのバージョン問題（古い版で pitch が未サポート）
2. 認証エラー（Microsoft Edge TTS 接続で 403）

✅ 実施した修正

1. pitch パラメータの完全削除
   - SynthesizeRequest クラスと `edge_tts.Communicate()` 呼び出しから `pitch` を除去
2. edge-tts ライブラリ更新
   - 6.1.7 → >= 6.1.12 へ更新し最新の認証方式に対応
3. 環境変数の整理
   - .env から `DEFAULT_PITCH` を削除（設定源を一本化）

### 🧪 テスト結果（追記）

- Docker TTS サーバーが正常に 13KB の MP3 を生成
- 「テスト音声です」の入力で MPEG ADTS Layer III 形式の出力を確認
- サーバーログにてリクエスト受信と正常レスポンスを確認

### ▶ 次のステップ（運用手順）

1. Chrome 拡張機能をリロード

- chrome://extensions → Audicle → 更新

2. テストページで動作確認

- Qiita 記事で段落クリック → 音声再生・ハイライト同期を確認

3. Docker サーバーログ確認

- リクエストが到達していること、エラーが出ていないことを確認

---

### 新しい作業: モノレポ構成への移行（完了レポート）

### 🎯 目的

- 将来の拡張性に備え、単一プロジェクトから複数パッケージを統合管理できるモノレポへ移行
- コード再利用性の向上（共通ロジックや型の共有）
- 一貫した開発体験（ビルド、テスト、リンティングの統一）
- 依存関係の俯瞰と管理の簡素化
- 新サービス（API サーバー等）の独立追加を容易に

### 🔧 実施した作業

1. ディレクトリ構造の再編成（git 履歴維持）

- 旧構成（抜粋）

```bash
/ (repo root)
├── audicle/
├── docs/
├── python-tts-server/
└── ...
```

- 新構成（モノレポ）

```bash
/ (repo root)
└── packages/
    ├── chrome-extension/   # Chrome 拡張の全ソース
    │   ├── audicle/
    │   ├── docs/
    │   ├── python-tts-server/
    │   └── ...（既存ファイル一式）
    └── api-server/         # 将来用（空）
```

- 実行コマンド（履歴保持のため git mv を使用）

```bash
mkdir -p packages/chrome-extension packages/api-server
ls -A | grep -v '^\.' | grep -v '^packages$' | xargs -I{} git mv {} packages/chrome-extension/
```

2. ドキュメント更新（packages/chrome-extension/[README.md](http://README.md)）

- 使い方（インストール手順）: 読み込みパスを audicle → packages/chrome-extension に修正
- プロジェクト構造: 旧図を廃止し、モノレポ構成図に差し替え

### 🧪 確認事項（運用観点）

- 拡張機能のロード先が新ディレクトリで問題なく動作
- 既存のビルドやテスト、リンタが新パスで実行可能
- git 履歴が分断されていない（git log で追跡可能）

### 🔭 今後の展望

- API サーバー実装開始（packages/api-server）
- 共通ライブラリ作成（テキスト処理、設定管理等の共有）
- ビルドプロセス導入（lerna / npm workspaces）

<aside>
📦

モノレポ移行により、パッケージ横断の変更や新規サービス追加が容易になります。まずは README と各種スクリプトの参照パスを順次モノレポ構成に追随させます。

</aside>

補足: 各 Issue の GitHub リンクから直接トラッキングできます。必要に応じて担当者名や追加項目を編集してください。

---

### 新しい作業: モノレポ構成への移行（完了レポート）

https://github.com/is0692vs/Audicle/issues/38

### 🎯 目的

- 将来の拡張性に備え、単一プロジェクトから複数パッケージを統合管理できるモノレポへ移行
- コード再利用性の向上（共通ロジックや型の共有）
- 一貫した開発体験（ビルド、テスト、リンティングの統一）
- 依存関係の俯瞰と管理の簡素化
- 新サービス（API サーバー等）の独立追加を容易に

### 🔧 実施した作業

1. ディレクトリ構造の再編成（git 履歴維持）

- 旧構成（抜粋）

```bash
/ (repo root)
├── audicle/
├── docs/
├── python-tts-server/
└── ...
```

- 新構成（モノレポ）

```bash
/ (repo root)
└── packages/
    ├── chrome-extension/   # Chrome 拡張の全ソース
    │   ├── audicle/
    │   ├── docs/
    │   ├── python-tts-server/
    │   └── ...（既存ファイル一式）
    └── api-server/         # 将来用（空）
```

- 実行コマンド（履歴保持のため git mv を使用）

```bash
# モノレポ用のベースディレクトリを作成
mkdir -p packages/chrome-extension packages/api-server
# 隠しファイルと packages 自身を除外して移動
ls -A | grep -v '^\.' | grep -v '^packages$' | xargs -I{} git mv {} packages/chrome-extension/
```

2. ドキュメント更新（packages/chrome-extension/[README.md](http://README.md)）

- 使い方（インストール手順）
  - 拡張の読み込みパスを audicle → packages/chrome-extension に修正
- プロジェクト構造
  - 旧図を廃止し、新しいモノレポ構成図に差し替え

### 🧪 確認事項（運用観点）

- 拡張機能のロード先が新ディレクトリで問題なく動作
- 既存のビルドやテスト、リンタが新パスで実行可能
- git 履歴が分断されていない（git log で追跡可能）

### 🔭 今後の展望

- API サーバー実装の開始（packages/api-server）
- 共通ライブラリの作成（テキスト処理、設定管理等を共有パッケージ化）
- ビルドプロセス導入（lerna や npm workspaces で依存解決とビルド自動化）

<aside>
📦

モノレポ移行により、パッケージ横断の変更や新規サービス追加が容易になります。まずは README と各種スクリプトの参照パスを順次モノレポ構成に追随させます。

</aside>
