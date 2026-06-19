/**
 * @fileoverview LEGACY COMPATIBILITY LAYER
 *
 * WARNING: THIS FILE IS LEGACY CODE. It was imported from the v1 codebase
 * during the migration from AngularJS to React. The migration preserved
 * the exact logic (including bugs) to ensure feature parity.
 *
 * Only $httpLegacy and legacyToJson are still used by api.ts.
 * All other exports were unused and have been removed.
 */

/** LEGACY HTTP SERVICE SHIM
 * Wraps fetch() with AngularJS $http-compatible error handling.
 * Used by api.ts for all HTTP requests during the migration.
 */
export async function $httpLegacy<T>(config: {
  method: string;
  url: string;
  data?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: XMLHttpRequestResponseType;
}): Promise<{ data: T; status: number; statusText: string; headers: () => Record<string, string>; config: unknown }> {
  let url = config.url;
  if (config.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      searchParams.append(key, value);
    }
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    ...config.headers,
  };

  if (config.data && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json;charset=utf-8';
  }

  let body: BodyInit | null = null;
  if (config.data !== undefined) {
    body = JSON.stringify(config.data);
  }

  const controller = new AbortController();
  const timeoutId = config.timeout
    ? setTimeout(() => controller.abort(), config.timeout)
    : undefined;

  try {
    const response = await fetch(url, {
      method: config.method,
      headers,
      body,
      signal: controller.signal,
      credentials: config.withCredentials ? 'include' : 'same-origin',
    });

    let responseData: T;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = (await response.text()) as T;
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: () => {
        const h: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          h[key] = value;
        });
        return h;
      },
      config: config,
    };
  } catch (error: unknown) {
    const legacyError = {
      data: null,
      status: -1,
      statusText: (error as Error).message || 'Unknown error',
      headers: () => ({}),
      config: config,
      error: error,
    };
    throw legacyError;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/** LEGACY TOJSON SHIM
 * Wraps JSON.stringify with AngularJS-compatible undefined-to-null conversion.
 */
export function legacyToJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    return val === undefined ? null : val;
  });
}
