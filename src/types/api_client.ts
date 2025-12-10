import type { ZodType, z } from "zod";
import type { ApiError } from "./api_error.js";
import type {
    ApiFetchOptions,
    ApiFetchOptionsWithSchema,
} from "./api_fetch_options.js";

export type ErrorId = "unexpected_error" | "fetch_failed" | string;
export type ApiResponse<T> = T | ApiError;

// Define the type with overloads
export interface ApiFetchFunction {
    <T extends ZodType>(
        url: string,
        options: ApiFetchOptionsWithSchema<T>,
    ): Promise<ApiResponse<z.infer<T>>>;
    <T extends object>(
        url: string,
        options?: ApiFetchOptions,
    ): Promise<ApiResponse<T>>;
}

export interface ApiClient {
    apiFetch: ApiFetchFunction;
    apiStreamFetch: (
        url: string,
        options?: ApiFetchOptions,
    ) => Promise<ApiResponse<ReadableStream<Uint8Array>>>;
    apiFetchTextMany: (
        url: string,
        options?: ApiFetchOptions,
    ) => AsyncGenerator<string, void, void>;
    apiFetchMany: <T extends ZodType>(
        url: string,
        options: ApiFetchOptionsWithSchema<T>,
    ) => AsyncGenerator<z.infer<T>, void, void>;
}
