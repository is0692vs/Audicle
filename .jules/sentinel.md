# Sentinel's Journal

## 2025-05-15 - SSRF in Node.js Subprocess

**Vulnerability:**
The `api-server` (FastAPI) invoked a Node.js script (`readability_script.js`) to fetch URLs. This script used `node-fetch` without any SSRF protection, allowing attackers to access internal network resources (localhost, private IPs) by passing a malicious URL to the `/extract` endpoint.

**Learning:**
Even if the main application (Python) is secure or isolated, subprocesses or helper scripts often lack the same security controls. In this case, `node-fetch` follows redirects by default, making simple initial URL checks insufficient. The fix required manual redirect handling and validation at every hop.

**Prevention:**
- Always validate inputs passed to subprocesses.
- When fetching URLs based on user input, implement robust SSRF protection that includes:
    - DNS resolution to check the actual IP.
    - Blocking private/reserved IP ranges.
    - Disabling automatic redirects and manually validating each redirect location.
- Use libraries like `ipaddr.js` to reliably check IP ranges (including IPv6 and mapped addresses).
