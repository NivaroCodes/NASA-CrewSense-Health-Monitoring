import { API_BASE_URL } from '../../config';
import type { ErrorDetail, ErrorResponse } from '../../types/api';

// The one place that talks HTTP to the backend (Frontend Spec, Section 12).
// Status 0 means no response at all: the request never reached the server, or timed out.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // True when the request got no answer. Such a scan can be queued locally instead of lost.
  get isNetworkFailure(): boolean {
    return this.status === 0;
  }
}

const TIMEOUT_MS = 10_000;

export type QueryValue = string | number | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponse;
    if (body.error) {
      return new ApiError(response.status, body.error.code, body.error.message, body.error.details ?? []);
    }
  } catch {
    // Not an error envelope (for example a proxy page). Fall through to a generic message.
  }
  return new ApiError(response.status, 'http_error', `The server responded with status ${response.status}.`);
}

export async function apiRequest<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; query?: Record<string, QueryValue>; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const hasBody = options.body !== undefined;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: hasBody ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError';
    throw timedOut
      ? new ApiError(0, 'timeout', 'The server did not respond in time.')
      : new ApiError(0, 'network', 'The server could not be reached.');
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}
