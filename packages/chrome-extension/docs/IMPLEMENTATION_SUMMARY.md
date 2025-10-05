# Implementation Summary: URL-Specific State Persistence

## Issue
**Title:** URLごとオンオフ保持 (Maintain on/off state per URL)

## Solution Overview
Implemented per-URL state management that allows the Audicle Chrome extension to remember on/off settings independently for each website (hostname).

## Code Changes

### 1. popup.js Changes

#### Before:
```javascript
// Global state for all pages
chrome.storage.local.get(["enabled"], (result) => {
  toggleSwitch.checked = !!result.enabled;
});

toggleSwitch.addEventListener("change", () => {
  const isEnabled = toggleSwitch.checked;
  chrome.storage.local.set({ enabled: isEnabled });
});
```

#### After:
```javascript
// URL-specific state
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const hostname = getHostnameFromUrl(tabs[0].url);
  
  chrome.storage.local.get(["urlStates", "enabled"], (result) => {
    const urlStates = result.urlStates || {};
    const isEnabled = hostname in urlStates ? urlStates[hostname] : !!result.enabled;
    toggleSwitch.checked = isEnabled;
  });
  
  toggleSwitch.addEventListener("change", () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.get(["urlStates"], (result) => {
      const urlStates = result.urlStates || {};
      urlStates[hostname] = isEnabled;
      chrome.storage.local.set({ urlStates });
    });
  });
});

// Helper function
function getHostnameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error("Invalid URL:", url, e);
    return url;
  }
}
```

### 2. content.js Changes

#### Before:
```javascript
// Global state check
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) {
    isEnabled = !!changes.enabled.newValue;
    updatePageState(isEnabled);
  }
});

chrome.storage.local.get(["enabled"], (result) => {
  isEnabled = !!result.enabled;
  updatePageState(isEnabled);
});
```

#### After:
```javascript
// URL-specific state check
function getCurrentHostname() {
  try {
    return window.location.hostname;
  } catch (e) {
    console.error("Failed to get hostname:", e);
    return "";
  }
}

function loadCurrentUrlState(callback) {
  const hostname = getCurrentHostname();
  chrome.storage.local.get(["urlStates", "enabled"], (result) => {
    const urlStates = result.urlStates || {};
    const isEnabled = hostname in urlStates ? urlStates[hostname] : !!result.enabled;
    callback(isEnabled);
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.urlStates !== undefined || changes.enabled !== undefined) {
    loadCurrentUrlState((enabled) => {
      isEnabled = enabled;
      updatePageState(isEnabled);
    });
  }
});

loadCurrentUrlState((enabled) => {
  isEnabled = enabled;
  updatePageState(isEnabled);
});
```

## Storage Schema

### Before:
```javascript
{
  "enabled": true  // Single global state
}
```

### After:
```javascript
{
  "enabled": false,        // Fallback/default (backward compatibility)
  "urlStates": {
    "example.com": true,   // Individual states per hostname
    "github.com": false,
    "qiita.com": true
  }
}
```

## Key Features

1. **URL-Specific States**: Each hostname maintains its own on/off state
2. **Backward Compatibility**: Falls back to global `enabled` if no URL-specific state exists
3. **Automatic Sync**: Content scripts automatically update when popup changes state
4. **Hostname-Based**: Uses hostname for consistency (strips path, query, hash)

## Testing

### Test Cases Covered:

1. **URL-Specific State Saving**
   - Enable on page A
   - Navigate to page B
   - Verify page B shows default state (OFF)

2. **State Independence**
   - Enable on page A
   - Disable on page B
   - Return to page A
   - Verify page A still shows enabled

3. **Backward Compatibility**
   - Set global `enabled: true`
   - Visit new URL with no specific state
   - Verify it uses global state as fallback

### Test Files:
- `test/url-state-test.html` - Interactive test page with scenarios
- `/tmp/test-url-state.js` - Unit tests for hostname extraction

## Benefits

✅ **User Experience**: Users can customize per-site behavior  
✅ **Flexibility**: Different settings for different websites  
✅ **No Breaking Changes**: Existing installations continue to work  
✅ **Minimal Code Impact**: Only 2 files modified (popup.js, content.js)  
✅ **Clean Design**: Simple hostname-based key system  

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `popup.js` | +32, -11 | URL-based state loading/saving |
| `content.js` | +35, -3 | URL-based state checking |
| `test/url-state-test.html` | +114 | Test page with scenarios |
| `docs/URL_STATE_FEATURE.md` | +3167 | Feature documentation |
| `docs/URL_STATE_FLOW.md` | +6890 | Flow diagrams |

## Usage Example

```javascript
// User workflow:
1. Visit https://example.com
2. Click extension icon
3. Toggle reading mode ON
4. Visit https://github.com
5. Extension shows OFF (default)
6. Return to https://example.com
7. Extension shows ON (preserved)
```

## Edge Cases Handled

- Invalid URLs (fallback to url string)
- Missing storage data (fallback to global `enabled`)
- First-time visits (use global default)
- Storage structure migration (backward compatible)

## Future Enhancements

Possible future improvements:
- Path-based state (e.g., `/page1` vs `/page2`)
- Subdomain-based state (e.g., `sub1.example.com` vs `sub2.example.com`)
- UI to manage all saved states
- Export/import state settings

## Conclusion

This implementation successfully addresses the issue "URLごとオンオフ保持" by providing URL-specific state management while maintaining backward compatibility and requiring minimal code changes.
