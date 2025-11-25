import type { ZodType, z } from "zod";
import { ApiError } from "./models/api_error";
import { ApiErrorResponse } from "./models/api_error_response.js";
import type {
    ApiFetchOptions,
    ApiFetchOptionsWithSchema,
} from "./models/api_fetch_options.js";

export type ErrorId = "unexpected_error" | "fetch_failed" | string;
export type ApiResponse<T> = T | ApiError;

export function isApiError(response: unknown): response is ApiError {
    return (
        typeof response === "object" &&
        response !== null &&
        "$type" in response &&
        response.$type === "ApiError"
    );
}

async function extractApiError(response: Response): Promise<ApiError> {
    try {
        const data = ApiErrorResponse.parse(await response.json());

        return new ApiError(
            data.errorId,
            response.status,
            data.debugMessage ?? JSON.stringify(data),
        );
    } catch (_) {
        return new ApiError("unexpected_error", response.status);
    }
}

async function extractApiErrorFormError(error: unknown) {
    if (error instanceof ApiError) {
        return error;
    }

    if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
    ) {
        return new ApiError("request_aborted", 499);
    }

    if (
        error &&
        typeof error === "object" &&
        "cause" in error &&
        error.cause === "aborted"
    ) {
        return new ApiError("request_aborted", 499);
    }

    if (typeof error === "string" && error === "aborted") {
        return new ApiError("request_aborted", 499);
    }

    const message = error instanceof Error ? error.message : String(error);
    return new ApiError("fetch_failed", 500, message);
}

async function _fetch(url: string, options: ApiFetchOptions) {
    const isFormData = options.body instanceof FormData;

    // Define headers with an index signature so properties are optional
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    // Remove Content-Type if body is FormData
    if (isFormData) {
        delete headers["Content-Type"];
    }

    return await fetch(url, {
        ...options,
        body: isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
        headers: headers,
    });
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
    try {
        const response = await _fetch(url, options ?? {});

        if (response.ok) {
            const data = await response.json();
            if (options && "schema" in options) {
                const schema = options.schema as ZodType;

                const parsed = schema.safeParse(data);

                if (!parsed.success) {
                    return new ApiError(
                        "schema_validation_failed",
                        500,
                        `Response validation failed: ${parsed.error.message}`,
                    );
                }

                return parsed.data;
            }

            return data;
        }

        return extractApiError(response);
    } catch (error) {
        return extractApiErrorFormError(error);
    }
}

export async function apiStreamFetch(
    url: string,
    options?: ApiFetchOptions,
): Promise<ApiResponse<ReadableStream<Uint8Array>>> {
    try {
        const response = await _fetch(url, options ?? {});

        if (response.ok) {
            return response.body as ReadableStream<Uint8Array>;
        }

        return extractApiError(response);
    } catch (error) {
        return extractApiErrorFormError(error);
    }
}

export async function* apiFetchTextMany(
    url: string,
    options?: ApiFetchOptions,
): AsyncGenerator<string, void, void> {
    try {
        const response = await _fetch(url, options ?? {});

        if (response.ok) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new ApiError(
                    "unexpected_error",
                    500,
                    "Response body is null",
                );
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, {
                    stream: true,
                });
                yield chunk;
            }
        } else {
            throw extractApiError(response);
        }
    } catch (error) {
        throw extractApiErrorFormError(error);
    }
}

export async function* apiFetchMany<T extends ZodType>(
    url: string,
    options: ApiFetchOptionsWithSchema<T>,
): AsyncGenerator<z.infer<T>, void, void> {
    try {
        for await (const chunk of apiFetchTextMany(url, options)) {
            const json = JSON.parse(chunk);
            const parsed = options.schema.safeParse(json);

            if (!parsed.success) {
                throw new ApiError(
                    "schema_validation_failed",
                    500,
                    `Chunk validation failed: ${parsed.error.message}`,
                );
            }

            yield parsed.data;
        }
    } catch (error) {
        throw extractApiErrorFormError(error);
    }
}
