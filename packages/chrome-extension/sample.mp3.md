# sample.mp3 について

このファイル（sample.mp3）は、音声合成手法切り替えのテスト用です。

## 配置方法

1. お好みの MP3 音声ファイルを用意(本リポジトリでは[このサイト](https://pro-video.jp/voice/announce/)の`G-22`を使用しています)
2. `packages/chrome-extension/audicle/sample.mp3` として配置
3. `packages/chrome-extension/audicle/config.json` で `"synthesizerType": "test"` に設定
4. Chrome 拡張機能をリロード

## 動作

- テキストに関係なく、１リクエストごとに sample.mp3 の音声が再生されます
- 音声合成手法切り替えの動作確認に使用できます
- Google TTS との比較テストが可能です

## 設定切り替えテスト

```json
// Google TTS使用
{"synthesizerType": "google_tts"}

// テスト音声使用
{"synthesizerType": "test"}
```
