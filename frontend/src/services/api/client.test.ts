import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('returns parsed JSON and builds the query string from the configured base URL', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ ok: boolean }>('/dashboard', {
      query: { as_of: '2026-11-13T07:30:00Z', astronaut_id: 1, metric_key: undefined },
    });

    expect(result).toEqual({ ok: true });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe('http://127.0.0.1:8000/api/v1/dashboard?as_of=2026-11-13T07%3A30%3A00Z&astronaut_id=1');
  });

  it('turns the backend error envelope into an ApiError carrying field details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            error: {
              code: 'validation_error',
              message: 'One or more fields are invalid.',
              details: [{ field: 'new_measurements[1].value', message: 'Accepted range is 60 to 220 mmHg.' }],
            },
          }),
          { status: 422 },
        ),
      ),
    );

    let caught: unknown;
    try {
      await apiRequest('/scans', { method: 'POST', body: {} });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.status).toBe(422);
    expect(err.code).toBe('validation_error');
    expect(err.details[0].field).toBe('new_measurements[1].value');
    expect(err.isNetworkFailure).toBe(false);
  });

  it('reports a request that got no answer as a network failure with status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
        throw new TypeError('Failed to fetch');
      }),
    );

    let caught: unknown;
    try {
      await apiRequest('/health');
    } catch (e) {
      caught = e;
    }

    const err = caught as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('network');
    expect(err.isNetworkFailure).toBe(true);
  });

  it('falls back to a generic error when the body is not an error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response('<html>Bad gateway</html>', { status: 502 })),
    );

    let caught: unknown;
    try {
      await apiRequest('/health');
    } catch (e) {
      caught = e;
    }

    const err = caught as ApiError;
    expect(err.status).toBe(502);
    expect(err.code).toBe('http_error');
  });
});
