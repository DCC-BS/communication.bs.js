import type { ApiFetchOptions } from "./types/api_fetch_options";
import type { Fetcher } from "./types/fetcher";
import type { FetcherBuilderOptions } from "./types/fetcher_builder_options";
import type {
    AfterResponseHook,
    BeforeRequestHook,
    OnErrorHook,
} from "./types/hooks";
import { hashFormData, hashString } from "./utils/hash";

/**
 * Creates a builder for configuring and creating a customized fetcher.
 * The builder allows you to chain configuration methods and then build a fetcher
 * with all the specified options applied.
 *
 * @param options - Initial configuration options for the fetcher
 * @returns A builder object with methods to configure the fetcher
 *
 * @example
 * const fetcher = createFetcherBuilder()
 *   .setBaseURL("https://api.example.com")
 *   .addHeader("Authorization", "Bearer token")
 *   .setRequestTimeout(5000)
 *   .enableDebug()
 *   .build();
 *
 * // Use the fetcher
 * const response = await fetcher("/users", { method: "GET" });
 */
export function createFetcherBuilder(
    options: FetcherBuilderOptions = { headers: {} },
) {
    const pendingRequests = new Map<string, Promise<Response>>();

    /**
     * Adds a custom header to all requests.
     *
     * @param key - Header name
     * @param value - Header valueg
     * @returns A new builder instance with the header added
     *
     * @example
     * builder.addHeader("X-API-Key", "secret123")
     */
    function addHeader(key: string, value: string) {
        return createFetcherBuilder({
            ...options,
            headers: { ...options.headers, [key]: value },
        });
    }

    /**
     * Sets the base URL for all requests.
     *
     * @param baseURL - Base URL to prepend to all request URLs
     * @returns A new builder instance with the base URL set
     *
     * @example
     * builder.setBaseURL("https://api.example.com/v1")
     */
    function setBaseURL(baseURL: string) {
        return createFetcherBuilder({ ...options, baseURL });
    }

    /**
     * Sets a timeout for all requests in milliseconds.
     *
     * @param timeout - Timeout duration in milliseconds
     * @returns A new builder instance with the timeout set
     *
     * @example
     * builder.setRequestTimeout(5000) // 5 second timeout
     */
    function setRequestTimeout(timeout: number) {
        return createFetcherBuilder({ ...options, timeout });
    }

    /**
     * Configures retry behavior for failed requests.
     *
     * @param retries - Number of retry attempts
     * @param retryDelay - Delay between retries in milliseconds (default: 1000)
     * @param retryOn - HTTP status codes to retry on (optional)
     * @returns A new builder instance with retry configuration
     *
     * @example
     * builder.setRetries(3, 2000, [500, 502, 503])
     */
    function setRetries(
        retries: number,
        retryDelay = 1000,
        retryOn?: number[],
    ) {
        return createFetcherBuilder({
            ...options,
            retries,
            retryDelay,
            retryOn,
        });
    }

    /**
     * Sets authentication for all requests.
     *
     * @param type - Authentication type ("bearer" or "basic")
     * @param token - Token for bearer auth
     * @param username - Username for basic auth
     * @param password - Password for basic auth
     * @returns A new builder instance with auth configured
     *
     * @example
     * builder.setAuth("bearer", "my-api-token")
     * @example
     * builder.setAuth("basic", undefined, "username", "password")
     */
    function setAuth(
        type: "bearer" | "basic",
        token?: string,
        username?: string,
        password?: string,
    ) {
        return createFetcherBuilder({
            ...options,
            auth: { type, token, username, password },
        });
    }

    /**
     * Sets a hook function to run before each request.
     *
     * @param beforeRequest - Hook function to execute before requests
     * @returns A new builder instance with the hook configured
     *
     * @example
     * builder.setBeforeRequest(async (url, options) => {
     *   console.log(`Fetching: ${url}`);
     * })
     */
    function setBeforeRequest(beforeRequest: BeforeRequestHook) {
        return createFetcherBuilder({ ...options, beforeRequest });
    }

    /**
     * Sets a hook function to run after each response.
     *
     * @param afterResponse - Hook function to execute after responses
     * @returns A new builder instance with the hook configured
     *
     * @example
     * builder.setAfterResponse((response) => {
     *   console.log(`Status: ${response.status}`);
     *   return response;
     * })
     */
    function setAfterResponse(afterResponse: AfterResponseHook) {
        return createFetcherBuilder({ ...options, afterResponse });
    }

    /**
     * Sets a hook function to run when errors occur.
     *
     * @param onError - Hook function to execute on errors
     * @returns A new builder instance with the hook configured
     *
     * @example
     * builder.setOnError((error) => {
     *   console.error('Request failed:', error);
     *   sendToErrorTracking(error);
     * })
     */
    function setOnError(onError: OnErrorHook) {
        return createFetcherBuilder({ ...options, onError });
    }

    /**
     * Sets default query parameters for all requests.
     *
     * @param queryParams - Query parameters to append to URLs
     * @returns A new builder instance with query params configured
     *
     * @example
     * builder.setQueryParams({ api_key: "abc123", format: "json" })
     */
    function setQueryParams(
        queryParams: Record<string, string | number | boolean>,
    ) {
        return createFetcherBuilder({
            ...options,
            queryParams: { ...options.queryParams, ...queryParams },
        });
    }

    /**
     * Sets the credentials mode for requests.
     *
     * @param credentials - Credentials mode
     * @returns A new builder instance with credentials configured
     *
     * @example
     * builder.setCredentials("include")
     */
    function setCredentials(credentials: "include" | "omit" | "same-origin") {
        return createFetcherBuilder({ ...options, credentials });
    }

    /**
     * Sets the CORS mode for requests.
     *
     * @param mode - CORS mode
     * @returns A new builder instance with mode configured
     *
     * @example
     * builder.setMode("cors")
     */
    function setMode(mode: "cors" | "no-cors" | "same-origin" | "navigate") {
        return createFetcherBuilder({ ...options, mode });
    }

    /**
     * Sets the cache mode for requests.
     *
     * @param cache - Cache mode
     * @returns A new builder instance with cache configured
     *
     * @example
     * builder.setCache("no-cache")
     */
    function setCache(
        cache:
            | "default"
            | "no-store"
            | "reload"
            | "no-cache"
            | "force-cache"
            | "only-if-cached",
    ) {
        return createFetcherBuilder({ ...options, cache });
    }

    /**
     * Enables debug logging for requests and responses.
     *
     * @returns A new builder instance with debug enabled
     *
     * @example
     * builder.enableDebug()
     */
    function enableDebug() {
        return createFetcherBuilder({ ...options, debug: true });
    }

    /**
     * Enables request deduplication to prevent duplicate in-flight requests.
     *
     * @returns A new builder instance with deduplication enabled
     *
     * @example
     * builder.enableDeduplication()
     */
    function enableDeduplication() {
        return createFetcherBuilder({ ...options, dedupeRequests: true });
    }

    /**
     * Executes a function with retry logic based on configuration.
     *
     * @param fn - The fetch function to execute
     * @param retriesLeft - Number of retries remaining
     * @returns The response from the fetch function
     */
    async function executeWithRetry(
        fn: () => Promise<Response>,
        retriesLeft: number,
    ): Promise<Response> {
        try {
            const response = await fn();

            // Check if we should retry based on status code
            if (
                retriesLeft > 0 &&
                options.retryOn &&
                options.retryOn.includes(response.status)
            ) {
                await new Promise((resolve) =>
                    globalThis.setTimeout(resolve, options.retryDelay || 1000),
                );
                return executeWithRetry(fn, retriesLeft - 1);
            }

            return response;
        } catch (error) {
            if (retriesLeft > 0) {
                await new Promise((resolve) =>
                    globalThis.setTimeout(resolve, options.retryDelay || 1000),
                );
                return executeWithRetry(fn, retriesLeft - 1);
            }
            throw error;
        }
    }

    /**
     * Builds and returns the configured fetcher function.
     * The fetcher applies all configured options to every request.
     *
     * @returns A fetcher function that can be used to make HTTP requests
     *
     * @example
     * const fetcher = builder.build();
     * const response = await fetcher("/api/users", { method: "GET" });
     */
    function build(): Fetcher {
        return async (url: string, fetchOptions: ApiFetchOptions = {}) => {
            try {
                // Build full URL with base URL and query params
                let fullURL = options.baseURL
                    ? `${options.baseURL}${url}`
                    : url;

                // Add query parameters
                if (options.queryParams) {
                    const urlObj = new URL(fullURL, "http://localhost");
                    for (const [key, value] of Object.entries(
                        options.queryParams,
                    )) {
                        urlObj.searchParams.set(key, String(value));
                    }
                    fullURL = urlObj.toString();
                }

                // Build headers
                const headers = {
                    "Content-Type": "application/json",
                    ...options.headers,
                    ...(fetchOptions.headers || {}),
                } as Record<string, string>;

                // Add auth header
                if (options.auth) {
                    if (options.auth.type === "bearer" && options.auth.token) {
                        headers.Authorization = `Bearer ${options.auth.token}`;
                    } else if (
                        options.auth.type === "basic" &&
                        options.auth.username &&
                        options.auth.password
                    ) {
                        const encoded = btoa(
                            `${options.auth.username}:${options.auth.password}`,
                        );
                        headers.Authorization = `Basic ${encoded}`;
                    }
                }

                const isFormData = fetchOptions.body instanceof FormData;

                // Remove Content-Type if body is FormData
                if (isFormData) {
                    delete headers["Content-Type"];
                }

                const requestOptions: RequestInit = {
                    ...fetchOptions,
                    body: isFormData
                        ? (fetchOptions.body as FormData)
                        : JSON.stringify(fetchOptions.body),
                    headers: headers,
                    credentials: options.credentials,
                    mode: options.mode,
                    cache: options.cache,
                };

                // Before request hook
                if (options.beforeRequest) {
                    await options.beforeRequest(fullURL, requestOptions);
                }

                // Debug logging
                if (options.debug) {
                    console.log(
                        `[Fetcher] ${requestOptions.method || "GET"} ${fullURL}`,
                        {
                            headers,
                            body: fetchOptions.body,
                        },
                    );
                }

                // Request deduplication
                // Include body hash in cache key for non-GET requests to prevent different POST/PUT/PATCH requests from being deduplicated
                let cacheKey = `${requestOptions.method || "GET"}_${fullURL}`;
                if (requestOptions.body && options.dedupeRequests) {
                    if (typeof requestOptions.body === "string") {
                        // Hash the stringified body for consistent, short cache keys
                        cacheKey += `_${hashString(requestOptions.body)}`;
                    } else if (requestOptions.body instanceof FormData) {
                        // Hash FormData contents
                        const formDataHash = await hashFormData(
                            requestOptions.body as FormData,
                        );
                        cacheKey += `_${formDataHash}`;
                    }
                }

                if (options.dedupeRequests) {
                    const pending = pendingRequests.get(cacheKey);
                    if (pending) {
                        if (options.debug) {
                            console.log(
                                `[Fetcher] Using cached request for ${cacheKey}`,
                            );
                        }
                        return pending;
                    }
                }

                // Execute fetch with optional timeout
                const fetchFn = async () => {
                    if (options.timeout) {
                        const controller = new AbortController();
                        const timeoutId = globalThis.setTimeout(
                            () => controller.abort(),
                            options.timeout,
                        );

                        // If there's an existing signal, forward its abort to our controller
                        const existingSignal = requestOptions.signal;
                        if (existingSignal) {
                            existingSignal.addEventListener("abort", () => {
                                controller.abort();
                            });
                        }

                        try {
                            return await fetch(fullURL, {
                                ...requestOptions,
                                signal: controller.signal,
                            });
                        } finally {
                            globalThis.clearTimeout(timeoutId);
                        }
                    }

                    return await fetch(fullURL, requestOptions);
                };

                // Store promise for deduplication
                let fetchPromise: Promise<Response>;

                if (options.dedupeRequests) {
                    fetchPromise = (async () => {
                        try {
                            return options.retries
                                ? await executeWithRetry(
                                      fetchFn,
                                      options.retries,
                                  )
                                : await fetchFn();
                        } finally {
                            pendingRequests.delete(cacheKey);
                        }
                    })();
                    pendingRequests.set(cacheKey, fetchPromise);
                } else {
                    fetchPromise = options.retries
                        ? executeWithRetry(fetchFn, options.retries)
                        : fetchFn();
                }

                const response = await fetchPromise;

                // After response hook
                const finalResponse = options.afterResponse
                    ? await options.afterResponse(response)
                    : response;

                // Debug logging
                if (options.debug) {
                    console.log(`[Fetcher] Response ${finalResponse.status}`, {
                        url: fullURL,
                        ok: finalResponse.ok,
                    });
                }

                return finalResponse;
            } catch (error) {
                if (options.onError) {
                    options.onError(error as Error);
                }

                if (options.debug) {
                    console.error("[Fetcher] Error:", error);
                }

                throw error;
            }
        };
    }

    return {
        addHeader,
        setBaseURL,
        setRequestTimeout,
        setRetries,
        setAuth,
        setBeforeRequest,
        setAfterResponse,
        setOnError,
        setQueryParams,
        setCredentials,
        setMode,
        setCache,
        enableDebug,
        enableDeduplication,
        build,
    };
}
