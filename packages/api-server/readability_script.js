const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const fetch = require("node-fetch");
const dns = require("dns");
const { promisify } = require("util");
const ipaddr = require("ipaddr.js");

const lookup = promisify(dns.lookup);

/**
 * Validates if a URL is safe to fetch (SSRF protection).
 * Rejects private IPs, loopback, link-local, and non-http/https protocols.
 * Throws an error if the URL is unsafe.
 */
async function validateUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    throw new Error("Invalid URL format");
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsafe protocol: ${url.protocol}`);
  }

  const hostname = url.hostname;

  // Block localhost explicitly to save a DNS lookup
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error("Access to localhost is denied");
  }

  // Resolve hostname to all IPs and check each resolved address
  // Use 'verbatim: true' to get the addresses in the order the DNS resolver returns them
  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (!addresses || addresses.length === 0) {
     throw new Error(`Could not resolve hostname: ${hostname}`);
  }

  // Use allowlist policy: only unicast addresses are allowed
  for (const { address } of addresses) {
    if (!ipaddr.isValid(address)) {
        throw new Error(`Invalid IP address: ${address}`);
    }
    const ip = ipaddr.parse(address);
    // range() returns 'unicast', 'loopback', 'private', 'linkLocal', etc.
    // We only want 'unicast' public IPs.
    // Note: 'unicast' includes global unicast addresses.
    // Explicitly check for ranges if needed, but 'range()' covers standard private ranges.
    const range = ip.range();

    // Additional check for unique local (IPv6 private) if not covered by 'private' in ipaddr.js depending on version
    if (range !== 'unicast') {
       throw new Error(`Access to internal/private IP denied: ${address} (${range})`);
    }

    // Explicitly check for IPv4 private ranges just to be sure if 'unicast' is too broad?
    // ipaddr.js 'unicast' means global unicast. 'private' covers 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    // 'loopback' covers 127.0.0.0/8
    // So ensuring it is 'unicast' is generally safe.
  }
}

/**
 * Safe fetch with SSRF protection including redirect handling.
 */
async function safeFetch(initialUrl) {
  let currentUrl = initialUrl;
  const maxRedirects = 5;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // Validate the URL before fetching
    await validateUrl(currentUrl);

    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: 'manual' // Handle redirects manually to validate each hop
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect with no Location header at ${currentUrl}`);
      }

      // Handle relative redirects
      try {
          currentUrl = new URL(location, currentUrl).toString();
      } catch (e) {
          throw new Error(`Invalid redirect location: ${location}`);
      }

      redirectCount++;
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (max: ${maxRedirects})`);
}

async function extractContent(url) {
  try {
    // Use safeFetch instead of direct fetch
    const response = await safeFetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // JSDOMでHTMLをパース
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Readabilityで本文抽出
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to extract content");
    }

    // テキストを段落ごとに分割（簡易版）
    const chunks = article.textContent
      .split(/\n\s*\n/) // 空行で分割
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 10) // 短すぎるチャンクを除外
      .slice(0, 50); // 最大50チャンクに制限

    const result = {
      title: article.title || "",
      chunks: chunks,
    };

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

// コマンドライン引数からURLを取得
const url = process.argv[2];
if (!url) {
  console.error(JSON.stringify({ error: "URL is required" }));
  process.exit(1);
}

extractContent(url);
