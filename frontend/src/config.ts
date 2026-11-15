// Runtime configuration. Nothing else in the app reads import.meta.env directly.

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// A production build must name its backend. Falling back to a local address would silently point a deployed app at nothing.
if (import.meta.env.PROD && !configuredApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is not set. Set it in the hosting environment settings (for example https://your-api.example.com/api/v1) and rebuild.');
}

// Backend base URL, without a trailing slash.
export const API_BASE_URL: string = (configuredApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

// Optional reference time for reproducible demos (contract section 0). Empty means the server's current time.
// Leave it unset in production so the dashboard reflects scans submitted today.
export const AS_OF: string | undefined = import.meta.env.VITE_AS_OF || undefined;
