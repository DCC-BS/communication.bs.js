import type { AfterResponseHook, BeforeRequestHook, OnErrorHook } from "./hooks";
import type { AuthConfig } from "./auth";

/**
 * Configuration options for the fetcher builder.
 * These options are applied to every request made by the fetcher.
 *
 * @example
 * const options: FetcherBuilderOptions = {
 *   headers: { "X-API-Key": "secret" },
 *   baseURL: "https://api.example.com",
 *   timeout: 5000,
 *   retries: 3,
 *   debug: true
 * };
 */
export type FetcherBuilderOptions = {
    /**
     * Custom headers to include in every request.
     * These headers can be overridden on a per-request basis.
     *
     * @example
     * { "X-Custom-Header": "value", "Accept-Language": "en-US" }
     */
    headers: Record<string, string>;

    /**
     * Base URL to prepend to all request URLs.
     * Useful for API endpoints that share the same domain.
     *
     * @example
     * "https://api.example.com/v1"
     */
    baseURL?: string;

    /**
     * Request timeout in milliseconds.
     * Requests exceeding this duration will be automatically aborted.
     *
     * @example
     * 5000 // 5 seconds
     */
    timeout?: number;

    /**
     * Number of retry attempts for failed requests.
     * Only retries on network errors or status codes specified in `retryOn`.
     *
     * @default 0
     * @example
     * 3 // Retry up to 3 times
     */
    retries?: number;

    /**
     * Delay in milliseconds between retry attempts.
     *
     * @default 1000
     * @example
     * 2000 // Wait 2 seconds between retries
     */
    retryDelay?: number;

    /**
     * HTTP status codes that should trigger a retry.
     * Only applies when `retries` is set.
     *
     * @example
     * [408, 429, 500, 502, 503, 504] // Retry on timeout and server errors
     */
    retryOn?: number[];

    /**
     * Hook function that runs before each request.
     * Can be async and can modify the request parameters.
     *
     * @example
     * async (url, options) => {
     *   console.log(`Requesting: ${url}`);
     *   // Add dynamic token
     *   options.headers = { ...options.headers, 'X-Token': await getToken() };
     * }
     */
    beforeRequest?: BeforeRequestHook;

    /**
     * Hook function that runs after receiving a response.
     * Can transform the response or perform logging.
     *
     * @example
     * async (response) => {
     *   console.log(`Response status: ${response.status}`);
     *   return response;
     * }
     */
    afterResponse?: AfterResponseHook;

    /**
     * Hook function that runs when an error occurs.
     * Useful for error logging and monitoring.
     *
     * @example
     * (error) => {
     *   console.error('Fetch error:', error.message);
     *   sendToErrorTracking(error);
     * }
     */
    onError?: OnErrorHook;

    /**
     * Default query parameters to append to every request URL.
     * Can be overridden on a per-request basis.
     *
     * @example
     * { api_key: "abc123", format: "json" }
     */
    queryParams?: Record<string, string | number | boolean>;

    /**
     * Controls whether credentials (cookies, authorization headers) are sent with requests.
     *
     * @default "same-origin"
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
     */
    credentials?: "include" | "omit" | "same-origin";

    /**
     * Controls the CORS mode for requests.
     *
     * @default "cors"
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
     */
    mode?: "cors" | "no-cors" | "same-origin" | "navigate";

    /**
     * Controls how the request interacts with the browser's HTTP cache.
     *
     * @default "default"
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
     */
    cache?:
        | "default"
        | "no-store"
        | "reload"
        | "no-cache"
        | "force-cache"
        | "only-if-cached";

    /**
     * Enable debug logging for all requests and responses.
     * Logs request details, response status, and errors to the console.
     *
     * @default false
     */
    debug?: boolean;

    /**
     * Enable request deduplication to prevent duplicate in-flight requests.
     * If the same request is made while a previous one is pending,
     * the pending request's promise will be reused.
     *
     * @default false
     */
    dedupeRequests?: boolean;

    /**
     * Authentication configuration for the fetcher.
     * Automatically adds Authorization headers to requests.
     *
     * @example
     * { type: "bearer", token: "your-api-token" }
     * @example
     * { type: "basic", username: "user", password: "pass" }
     */
    auth?: AuthConfig;
};
