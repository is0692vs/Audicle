# Visual Feedback Feature

## Overview
The extension provides visual feedback by changing the toolbar icon when audio is playing, allowing users to see the extension's playback status without opening the popup.

## Visual States

### Default State (Not Playing)
- Standard Audicle icon displayed in the toolbar
- Indicates the extension is idle or ready

### Active State (Playing)
- Audicle icon with a green indicator dot in the bottom-right corner
- Indicates audio is currently playing
- Available in all sizes: 16x16, 48x48, and 128x128 pixels

## Implementation

### Icon Assets
- `images/icon16.png`, `icon48.png`, `icon128.png` - Default state icons
- `images/icon-active16.png`, `icon-active48.png`, `icon-active128.png` - Active state icons

### Architecture
The feature uses Chrome Extension's message passing between content scripts and the service worker:

1. **content.js** monitors playback state changes
2. **content.js** sends messages to **background.js** when state changes
3. **background.js** updates the icon using `chrome.action.setIcon()`

### State Transitions

#### Icon becomes active when:
- Audio playback starts (from network or cache)
- User clicks a paragraph to begin playback

#### Icon returns to default when:
- Audio playback completes successfully
- User pauses playback
- Audio playback encounters an error
- Extension is disabled
- Maximum retry attempts are reached

## API Reference

### background.js

#### `setActiveIcon()`
Changes the toolbar icon to the active state (with green indicator).

```javascript
function setActiveIcon() {
  chrome.action.setIcon({
    path: {
      16: "images/icon-active16.png",
      48: "images/icon-active48.png",
      128: "images/icon-active128.png",
    },
  });
}
```

#### `setDefaultIcon()`
Resets the toolbar icon to the default state.

```javascript
function setDefaultIcon() {
  chrome.action.setIcon({
    path: {
      16: "images/icon16.png",
      48: "images/icon48.png",
      128: "images/icon128.png",
    },
  });
}
```

### content.js

#### `notifyPlaybackStarted()`
Sends a message to background.js to set the icon to active state.

```javascript
function notifyPlaybackStarted() {
  chrome.runtime.sendMessage({ command: "playbackStarted" });
}
```

#### `notifyPlaybackStopped()`
Sends a message to background.js to reset the icon to default state.

```javascript
function notifyPlaybackStopped() {
  chrome.runtime.sendMessage({ command: "playbackStopped" });
}
```

## Message Protocol

### `playbackStarted`
Sent from content.js to background.js when audio playback begins.

**Message Format:**
```javascript
{ command: "playbackStarted" }
```

**Handler:** Updates icon to active state

### `playbackStopped`
Sent from content.js to background.js when audio playback stops.

**Message Format:**
```javascript
{ command: "playbackStopped" }
```

**Handler:** Resets icon to default state

## Testing

### Manual Testing Steps

1. **Start Playback**
   - Navigate to an article
   - Click on a paragraph
   - Verify icon changes to active state (green indicator visible)

2. **Complete Playback**
   - Let the audio finish playing
   - Verify icon returns to default state

3. **Pause Playback**
   - Start playback
   - Open popup and click pause
   - Verify icon returns to default state

4. **Disable Extension**
   - Start playback
   - Disable extension via popup
   - Verify icon returns to default state

### Expected Behavior

| User Action | Icon State |
|------------|-----------|
| Extension installed | Default |
| Playback starts | Active (green indicator) |
| Audio playing | Active (green indicator) |
| Playback pauses | Default |
| Playback completes | Default |
| Audio error occurs | Default |
| Extension disabled | Default |

## Limitations

- Icon state is browser-wide, not per-tab
- If multiple tabs have playback active, the icon reflects the most recent state change
- Icon changes are immediate but may have slight delay (< 100ms) depending on browser performance

## Troubleshooting

### Icon doesn't change
1. Check browser console for errors
2. Verify icon files exist in `images/` directory
3. Ensure content.js is properly loaded on the page
4. Check that background service worker is active

### Icon stuck in active state
1. Disable and re-enable the extension
2. Check for JavaScript errors in content.js
3. Verify all `notifyPlaybackStopped()` calls are reached

## Future Enhancements

Potential improvements for this feature:
- Badge text showing queue position (e.g., "3/10")
- Different colors for different states (yellow for paused, red for error)
- Animation during loading/buffering
- Per-tab icon state (requires Manifest V3 API enhancement)
