import { describe, it, expect } from 'vitest';
import { validateUrl } from './urlValidation';

describe('urlValidation', () => {
  describe('validateUrl', () => {
    describe('valid URLs', () => {
      it('should accept valid HTTPS URL', () => {
        const result = validateUrl('https://feed.tuvix.app');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://feed.tuvix.app');
        expect(result.error).toBeUndefined();
      });

      it('should accept valid HTTP URL', () => {
        const result = validateUrl('http://localhost:3000');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('http://localhost:3000');
      });

      it('should accept URL with path', () => {
        const result = validateUrl('https://example.com/tuvix/feed');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://example.com/tuvix/feed');
      });

      it('should accept URL with port', () => {
        const result = validateUrl('https://example.com:8080');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://example.com:8080');
      });

      it('should accept URL with subdomain', () => {
        const result = validateUrl('https://feed.example.com');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://feed.example.com');
      });

      it('should accept URL with query parameters', () => {
        const result = validateUrl('https://example.com/feed?instance=main');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://example.com/feed?instance=main');
      });

      it('should accept localhost', () => {
        const result = validateUrl('http://localhost');
        expect(result.valid).toBe(true);
      });

      it('should accept IP address', () => {
        const result = validateUrl('http://192.168.1.1:8080');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('http://192.168.1.1:8080');
      });
    });

    describe('URL normalization', () => {
      it('should remove trailing slash', () => {
        const result = validateUrl('https://example.com/');
        expect(result.normalized).toBe('https://example.com');
      });

      it('should remove trailing slash from path', () => {
        const result = validateUrl('https://example.com/feed/');
        expect(result.normalized).toBe('https://example.com/feed');
      });

      it('should remove multiple trailing slashes', () => {
        const result = validateUrl('https://example.com///');
        expect(result.normalized).toBe('https://example.com');
      });

      it('should trim whitespace', () => {
        const result = validateUrl('  https://example.com  ');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://example.com');
      });

      it('should preserve query parameters after removing trailing slash', () => {
        const result = validateUrl('https://example.com/feed/?param=value');
        expect(result.normalized).toBe('https://example.com/feed?param=value');
      });

      it('should normalize but preserve path', () => {
        const result = validateUrl('https://example.com/path/to/feed/');
        expect(result.normalized).toBe('https://example.com/path/to/feed');
      });
    });

    describe('invalid URLs', () => {
      it('should reject empty string', () => {
        const result = validateUrl('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL cannot be empty');
        expect(result.normalized).toBeUndefined();
      });

      it('should reject whitespace-only string', () => {
        const result = validateUrl('   ');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL cannot be empty');
      });

      it('should reject URL without protocol', () => {
        const result = validateUrl('example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL must start with http:// or https://');
      });

      it('should reject URL with wrong protocol', () => {
        const result = validateUrl('ftp://example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL must start with http:// or https://');
      });

      it('should reject URL with custom protocol', () => {
        const result = validateUrl('feed://example.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL must start with http:// or https://');
      });

      it('should reject malformed URL', () => {
        const result = validateUrl('https://');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('should reject URL with invalid characters', () => {
        const result = validateUrl('https://exam ple.com');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('should reject plain text', () => {
        const result = validateUrl('not a url');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL must start with http:// or https://');
      });
    });

    describe('edge cases', () => {
      it('should handle URL with fragment', () => {
        const result = validateUrl('https://example.com/feed#section');
        expect(result.valid).toBe(true);
        // Fragments are preserved by URL object but not in our normalized output
        expect(result.normalized).not.toContain('#');
      });

      it('should handle URL with multiple query parameters', () => {
        const result = validateUrl('https://example.com/feed?a=1&b=2&c=3');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://example.com/feed?a=1&b=2&c=3');
      });

      it('should handle URL with encoded characters', () => {
        const result = validateUrl('https://example.com/feed%20name');
        expect(result.valid).toBe(true);
      });

      it('should handle URL with authentication (username:password)', () => {
        const result = validateUrl('https://user:pass@example.com');
        expect(result.valid).toBe(true);
        expect(result.normalized).toContain('example.com');
      });

      it('should handle very long URLs', () => {
        const longPath = '/a'.repeat(1000);
        const result = validateUrl(`https://example.com${longPath}`);
        expect(result.valid).toBe(true);
        expect(result.normalized).toContain(longPath);
      });

      it('should handle URL with international domain (punycode)', () => {
        const result = validateUrl('https://münchen.de');
        expect(result.valid).toBe(true);
      });

      it('should handle URL with port 80', () => {
        const result = validateUrl('http://example.com:80');
        expect(result.valid).toBe(true);
        // Default ports are removed by URL constructor
        expect(result.normalized).toBe('http://example.com');
      });

      it('should handle URL with port 443', () => {
        const result = validateUrl('https://example.com:443');
        expect(result.valid).toBe(true);
        // Default ports are removed by URL constructor
        expect(result.normalized).toBe('https://example.com');
      });
    });

    describe('common user input scenarios', () => {
      it('should accept default Tuvix cloud URL', () => {
        const result = validateUrl('https://feed.tuvix.app');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://feed.tuvix.app');
      });

      it('should accept self-hosted instance on subdomain', () => {
        const result = validateUrl('https://rss.mycompany.com');
        expect(result.valid).toBe(true);
      });

      it('should accept self-hosted instance on path', () => {
        const result = validateUrl('https://mycompany.com/tuvix');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://mycompany.com/tuvix');
      });

      it('should normalize user input with trailing slash', () => {
        const result = validateUrl('https://feed.tuvix.app/');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('https://feed.tuvix.app');
      });

      it('should handle localhost development setup', () => {
        const result = validateUrl('http://localhost:3000');
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe('http://localhost:3000');
      });

      it('should handle Docker local setup', () => {
        const result = validateUrl('http://127.0.0.1:8080');
        expect(result.valid).toBe(true);
      });

      it('should reject common mistake: missing protocol', () => {
        const result = validateUrl('feed.tuvix.app');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('URL must start with http:// or https://');
      });

      it('should reject common mistake: wrong protocol', () => {
        const result = validateUrl('feed://tuvix.app');
        expect(result.valid).toBe(false);
      });
    });
  });
});
