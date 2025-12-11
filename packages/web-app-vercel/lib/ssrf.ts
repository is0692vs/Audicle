import dns from 'dns';
import ipaddr from 'ipaddr.js';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

/**
 * Validates if a URL is safe to fetch (SSRF protection).
 * Rejects private IPs, loopback, link-local, and non-http/https protocols.
 */
export async function isSafeUrl(urlString: string): Promise<boolean> {
    try {
        const url = new URL(urlString);

        // Only allow http and https
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false;
        }

        const hostname = url.hostname;

        // Block localhost explicitly to save a DNS lookup
        if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
            return false;
        }

        // Resolve hostname to IP
        // options: { all: true } could be used to check all resolved IPs,
        // but fetch() usually uses the first one. For strict security,
        // we should check the IP we actually connect to, but in Node fetch
        // we can't easily control that without a custom agent.
        // Checking the resolved IP is a good first line of defense.
        const { address, family } = await lookup(hostname);

        if (!address) {
            return false;
        }

        const ip = ipaddr.parse(address);

        // Check for private ranges
        if (ip.range() === 'private' ||
            ip.range() === 'loopback' ||
            ip.range() === 'linkLocal' ||
            ip.range() === 'uniqueLocal' || // IPv6 private
            ip.range() === 'broadcast' ||
            ip.range() === 'carrierGradeNat' // 100.64.0.0/10
           ) {
            return false;
        }

        // Explicitly block AWS/Cloud metadata service if not caught by linkLocal
        if (address === '169.254.169.254') {
            return false;
        }

        return true;
    } catch (error) {
        console.error('SSRF Check Error:', error);
        return false;
    }
}
