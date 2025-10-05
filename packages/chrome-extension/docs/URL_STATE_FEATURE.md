# URL固有の状態保持機能 (URL-Specific State Persistence)

## 概要

このPRでは、Chrome拡張機能AudicleにURL（ホスト名）ごとにON/OFF状態を保持する機能を実装しました。

従来は全てのページで共通の状態（ON/OFF）が適用されていましたが、この機能により各ウェブサイト（ドメイン）ごとに独立した状態を保存できるようになりました。

## 機能説明

### 動作例

1. **example.com でAudicle をON にする**
   - example.com では読み上げモードが有効
   
2. **github.com に移動してAudicle を確認**
   - github.com ではデフォルト状態（OFF）が表示される
   
3. **github.com でもON にする**
   - github.com では読み上げモードが有効
   
4. **example.com に戻る**
   - example.com では引き続きON状態が保持されている

### 保存形式

```javascript
// Chrome Storage Local に以下の形式で保存
{
  "urlStates": {
    "example.com": true,
    "github.com": false,
    "qiita.com": true,
    // ...
  }
}
```

## 技術的詳細

### 変更ファイル

1. **popup.js**
   - 現在のタブのURLを取得
   - ホスト名ベースで状態を読み込み・保存
   - `getHostnameFromUrl()` ヘルパー関数を追加

2. **content.js**
   - ページ読み込み時に現在のURLの状態を確認
   - `getCurrentHostname()` と `loadCurrentUrlState()` を追加
   - ストレージ変更の監視をURL固有の状態に対応

### 後方互換性

既存の `enabled` グローバル状態との互換性を保持しています：

```javascript
// URLごとの状態が存在すればそれを使用、なければenabledをフォールバック
const isEnabled = hostname in urlStates ? urlStates[hostname] : !!result.enabled;
```

## テスト方法

### 基本テスト

1. `test/url-state-test.html` を開く
2. Audicle拡張機能を開いて読み上げモードをON
3. `test/qiitasample.html` など別のページに移動
4. Audicle拡張機能を開いて状態を確認（OFFのはず）
5. 元のページに戻って状態を確認（ONが保持されているはず）

### DevTools での確認

Chrome DevTools のConsoleで以下を実行して状態を確認できます：

```javascript
// 保存されている全ての状態を表示
chrome.storage.local.get(['urlStates'], (result) => {
  console.log('URL States:', result.urlStates);
});

// 現在のURLの状態を確認
chrome.storage.local.get(['urlStates'], (result) => {
  const hostname = window.location.hostname;
  console.log(`State for ${hostname}:`, result.urlStates?.[hostname]);
});

// 特定のURLの状態をリセット
chrome.storage.local.get(['urlStates'], (result) => {
  const urlStates = result.urlStates || {};
  delete urlStates['example.com'];
  chrome.storage.local.set({ urlStates });
});
```

## 実装の詳細

### popup.js の主な変更

```javascript
// URLを取得して状態をロード
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const hostname = getHostnameFromUrl(tabs[0].url);
  chrome.storage.local.get(["urlStates", "enabled"], (result) => {
    const urlStates = result.urlStates || {};
    const isEnabled = hostname in urlStates ? urlStates[hostname] : !!result.enabled;
    toggleSwitch.checked = isEnabled;
  });
});
```

### content.js の主な変更

```javascript
// URL固有の状態をロード
function loadCurrentUrlState(callback) {
  const hostname = getCurrentHostname();
  chrome.storage.local.get(["urlStates", "enabled"], (result) => {
    const urlStates = result.urlStates || {};
    const isEnabled = hostname in urlStates ? urlStates[hostname] : !!result.enabled;
    callback(isEnabled);
  });
}
```

## 利点

1. **ユーザーエクスペリエンス向上**: 各サイトで個別に設定できるため、使いやすい
2. **柔軟性**: 読み上げが必要なサイトとそうでないサイトを区別できる
3. **後方互換性**: 既存のグローバル設定との互換性を保持
4. **最小限の変更**: 既存のコードへの影響を最小限に抑えた実装

## 制限事項

- 同じホスト名（ドメイン）内では、すべてのページで同じ状態が適用されます
- サブドメイン単位での状態管理（例: `sub1.example.com` と `sub2.example.com` で別々）
- パス単位での状態管理（例: `/page1` と `/page2` で別々）

将来的にこれらの機能が必要な場合は、`hostname` の代わりに `hostname + pathname` などを使用することで実装できます。

## まとめ

この機能により、Audicle拡張機能はより柔軟で使いやすくなりました。ユーザーは各ウェブサイトごとに読み上げモードのON/OFFを個別に設定・保持できます。
