// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-switch");
  const pauseResumeBtn = document.getElementById("pause-resume-btn");

  // 現在のタブのURLを取得して、そのURLの状態を読み込む
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const url = tabs[0].url;
    const hostname = getHostnameFromUrl(url);

    // 無効なホスト名（空文字や'undefined'）は保存対象外として扱う
    const isValidHostname = (h) =>
      typeof h === "string" && h.trim() !== "" && h !== "undefined";

    // URLごとの状態を読み込む
    chrome.storage.local.get(["urlStates", "enabled"], (result) => {
      const urlStates = result.urlStates || {};
      // ホスト名が無効な場合はグローバルのenabledのみ使用
      const isEnabled = isValidHostname(hostname)
        ? hostname in urlStates
          ? urlStates[hostname]
          : !!result.enabled
        : !!result.enabled;
      toggleSwitch.checked = isEnabled;
    });

    // スイッチが操作されたら、そのURLの状態を保存
    toggleSwitch.addEventListener("change", () => {
      const isEnabled = toggleSwitch.checked;

      // 無効なホスト名の場合は保存しない（誤って"undefined"キー等が作られるのを防ぐ）
      if (!isValidHostname(hostname)) {
        console.warn("popup: invalid hostname, skipping save:", hostname);
        return;
      }

      chrome.storage.local.get(["urlStates"], (result) => {
        const urlStates = result.urlStates || {};
        urlStates[hostname] = isEnabled;
        chrome.storage.local.set({ urlStates });
      });
    });
  });

  // 一時停止/再開ボタン
  pauseResumeBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { command: "togglePauseResume" },
          (response) => {
            if (response && response.isPlaying !== undefined) {
              pauseResumeBtn.textContent = response.isPlaying
                ? "一時停止"
                : "再開";
            }
          }
        );
      }
    });
  });
});

// URLからホスト名を取得するヘルパー関数
function getHostnameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    // 不正な URL の場合は空文字を返し、保存処理やキー作成を防ぐ
    return "";
  }
}
