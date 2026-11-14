// Runtime configuration. Nothing else in the app reads import.meta.env directly.

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Backend base URL, without a trailing slash. Set VITE_API_BASE_URL to point elsewhere.
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

// Optional reference time for reproducible demos (contract section 0). Empty means the server's current time.
export const AS_OF: string | undefined = import.meta.env.VITE_AS_OF || undefined;
