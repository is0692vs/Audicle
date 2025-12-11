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

        // Resolve hostname to all IPs and check each resolved address
        const addresses = await lookup(hostname, { all: true }) as Array<{ address: string; family: number }>;

        if (!addresses || addresses.length === 0) {
            return false;
        }

        // Use allowlist policy: only unicast addresses are allowed
        for (const { address } of addresses) {
            const ip = ipaddr.parse(address);
            if (ip.range() !== 'unicast') {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('SSRF Check Error:', error);
        return false;
    }
}
