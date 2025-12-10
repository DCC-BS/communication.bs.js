/**
 * Hook that runs before each request is sent.
 * Can be used to modify the request, log, or perform authentication checks.
 *
 * @param url - The full URL that will be fetched
 * @param options - The RequestInit options that will be passed to fetch
 *
 * @example
 * const beforeRequest: BeforeRequestHook = async (url, options) => {
 *   console.log(`Requesting: ${url}`);
 *   // Add dynamic token
 *   options.headers = { ...options.headers, 'X-Token': await getToken() };
 * };
 */
export type BeforeRequestHook = (
    url: string,
    options: RequestInit,
) => Promise<void> | void;

/**
 * Hook that runs after a response is received.
 * Can be used to transform the response, log, or handle specific status codes.
 *
 * @param response - The Response object received from fetch
 * @returns The original or a modified Response object
 *
 * @example
 * const afterResponse: AfterResponseHook = async (response) => {
 *   console.log(`Response status: ${response.status}`);
 *   if (response.status === 401) {
 *     // Handle unauthorized
 *     await refreshToken();
 *   }
 *   return response;
 * };
 */
export type AfterResponseHook = (
    response: Response,
) => Promise<Response> | Response;

/**
 * Hook that runs when an error occurs during the fetch operation.
 * Can be used for error logging, monitoring, or custom error handling.
 *
 * @param error - The error that occurred during fetch
 *
 * @example
 * const onError: OnErrorHook = (error) => {
 *   console.error('Fetch error:', error.message);
 *   sendToErrorTracking(error);
 * };
 */
export type OnErrorHook = (error: Error) => void;
