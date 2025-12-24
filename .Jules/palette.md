# Palette's Journal

## 2025-05-21 - [Semantic Navigation]
**Learning:** The "simple" web app was using `div` with `onClick` for main navigation, making it inaccessible to keyboard users and screen readers.
**Action:** Always check `onClick` handlers on non-interactive elements. Replace with `Link` or `<button>` as appropriate to ensure built-in accessibility.
