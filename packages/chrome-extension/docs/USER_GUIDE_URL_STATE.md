# URL State Feature User Guide

## What's New? 🎉

Audicle now remembers your on/off settings for each website independently!

### Before This Update:
- Turning ON Audicle affected ALL websites
- No way to have different settings for different sites
- Had to manually toggle every time you visited a new site

### After This Update:
- Each website remembers its own on/off setting
- Set it once per site, and it stays that way
- More convenient and flexible

## How to Use

### Basic Usage

1. **Visit a website** (e.g., example.com)
2. **Click the Audicle extension icon** in your browser toolbar
3. **Toggle the reading mode switch** ON or OFF
4. **Done!** Your setting is saved for example.com

When you return to example.com later, Audicle will remember your setting.

### Example Scenario

Let's say you like to use Audicle on news sites but not on social media:

```
1. Visit news.example.com
   → Turn Audicle ON
   → Reading mode enabled

2. Visit social.example.com  
   → Extension shows OFF (default)
   → Leave it OFF

3. Return to news.example.com
   → Audicle is still ON
   → Reading mode automatically enabled
```

## Understanding URL States

### What Gets Saved?

Audicle saves the on/off state based on the **hostname** (domain name):

| URL | Saved As | Notes |
|-----|----------|-------|
| `https://example.com/page1` | `example.com` | Path ignored |
| `https://example.com/page2` | `example.com` | Same state as page1 |
| `https://github.com/user/repo` | `github.com` | Different from example.com |
| `http://localhost:8080/test` | `localhost` | Local development |

### Key Points:

- ✅ **Per-domain**: All pages on same domain share the setting
- ✅ **Persistent**: Settings survive browser restarts
- ✅ **Independent**: Each domain has its own setting
- ✅ **Automatic**: No manual sync needed

## Managing Your Settings

### View All Saved States

Open Chrome DevTools (F12) and run in Console:

```javascript
chrome.storage.local.get(['urlStates'], (result) => {
  console.log('Your saved states:', result.urlStates);
});
```

Example output:
```javascript
{
  "qiita.com": true,
  "github.com": false,
  "example.com": true
}
```

### Reset a Specific Site

To reset settings for a specific domain:

```javascript
chrome.storage.local.get(['urlStates'], (result) => {
  const urlStates = result.urlStates || {};
  delete urlStates['example.com'];  // Replace with your domain
  chrome.storage.local.set({ urlStates });
  console.log('Reset complete!');
});
```

### Reset All States

To clear all saved settings:

```javascript
chrome.storage.local.set({ urlStates: {} }, () => {
  console.log('All URL states cleared!');
});
```

## Default Behavior

### First Visit to a Site

When you visit a site for the first time (or after clearing data):
- Audicle starts in **OFF** mode by default
- You can turn it ON for that specific site
- Your choice is remembered

### Backward Compatibility

If you were using Audicle before this update:
- Your old global `enabled` setting is used as the default
- New sites will use this setting until you change it
- Your existing behavior is preserved

## Tips & Tricks

### Recommended Setup

For best experience:

1. **News & Articles Sites**: Turn ON
   - Better for long-form reading
   - e.g., news sites, blogs, documentation

2. **Interactive Sites**: Keep OFF
   - Social media, web apps, dashboards
   - Where you click frequently

3. **Testing/Development**: Customize as needed
   - localhost can be ON for testing
   - Production sites based on preference

### Quick Toggle

The fastest way to toggle:
1. Click extension icon (or use keyboard shortcut)
2. Flip the switch
3. Close popup (auto-saves)

No need to click "Save" or "Apply" - changes are instant!

## Troubleshooting

### Setting Not Saving?

If your setting doesn't persist:

1. **Check Chrome storage permissions**
   - Extension should have "storage" permission
   - Check in `chrome://extensions`

2. **Clear and re-set**
   ```javascript
   chrome.storage.local.get(['urlStates'], (result) => {
     console.log('Current states:', result.urlStates);
   });
   ```

3. **Reload the extension**
   - Go to `chrome://extensions`
   - Click the reload icon for Audicle

### Extension Not Activating?

If the extension doesn't activate after turning ON:

1. **Refresh the page** (F5)
   - Settings apply to page loads
   - Current page needs refresh

2. **Check the console**
   - F12 → Console tab
   - Look for any error messages

3. **Verify current state**
   ```javascript
   chrome.storage.local.get(['urlStates'], (result) => {
     const hostname = window.location.hostname;
     console.log(`State for ${hostname}:`, result.urlStates?.[hostname]);
   });
   ```

## Privacy Note

All settings are stored **locally** in your browser:
- Nothing is sent to external servers
- Data stays on your computer
- Cleared when you clear browser data

## Feedback

Found an issue or have suggestions?
- Open an issue on GitHub
- Include steps to reproduce
- Mention your browser and OS version

---

**Enjoy your personalized Audicle experience!** 🎉
