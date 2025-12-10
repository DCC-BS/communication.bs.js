import type { ZodType, z } from "zod";
import { createApiClient } from "./apiFetchFactory.js";
import type { ApiClient } from "./types/api_client.js";
import type { ApiError } from "./types/api_error";
import type {
    ApiFetchOptions,
    ApiFetchOptionsWithSchema,
} from "./types/api_fetch_options.js";

export type ErrorId = "unexpected_error" | "fetch_failed" | string;
export type ApiResponse<T> = T | ApiError;

let _client: ApiClient | undefined;

// lazy initialization of the API client
function client() {
    if (!_client) {
        _client = createApiClient();
    }
    return _client;
}

// overloads
export async function apiFetch<T extends ZodType>(
    url: string,
    options: ApiFetchOptionsWithSchema<T>,
): Promise<ApiResponse<z.infer<T>>>;
export async function apiFetch<T extends object>(
    url: string,
    options?: ApiFetchOptions,
): Promise<ApiResponse<T>>;

// implementation
export async function apiFetch(
    url: string,
    options?: ApiFetchOptions | ApiFetchOptionsWithSchema<ZodType>,
): Promise<ApiResponse<unknown>> {
    return client().apiFetch(url, options);
}

export async function apiStreamFetch(
    url: string,
    options?: ApiFetchOptions,
): Promise<ApiResponse<ReadableStream<Uint8Array>>> {
    return client().apiStreamFetch(url, options);
}

export async function* apiFetchTextMany(
    url: string,
    options?: ApiFetchOptions,
): AsyncGenerator<string, void, void> {
    for await (const chunk of client().apiFetchTextMany(url, options ?? {})) {
        yield chunk;
    }
}

export async function* apiFetchMany<T extends ZodType>(
    url: string,
    options: ApiFetchOptionsWithSchema<T>,
): AsyncGenerator<z.infer<T>, void, void> {
    for await (const item of client().apiFetchMany(url, options)) {
        yield item;
    }
}
