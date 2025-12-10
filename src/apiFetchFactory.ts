import type { ZodType, z } from "zod";
import { extractApiError, extractApiErrorFormError } from "./apiFetchUtils.js";
import { createFetcherBuilder } from "./fetcherFactory.js";
import type {
    ApiClient,
    ApiFetchFunction,
    ApiResponse,
} from "./types/api_client.js";
import { ApiError } from "./types/api_error";
import type {
    ApiFetchOptions,
    ApiFetchOptionsWithSchema,
} from "./types/api_fetch_options.js";
import type { Fetcher } from "./types/fetcher.js";

export function createApiClient(fetcher?: Fetcher): ApiClient {
    const _fetch = fetcher ?? createFetcherBuilder().build();

    const apiFetch = (async (
        url: string,
        options?: ApiFetchOptions | ApiFetchOptionsWithSchema<ZodType>,
    ): Promise<ApiResponse<unknown>> => {
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
    }) as ApiFetchFunction;

    async function apiStreamFetch(
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

    async function* apiFetchTextMany(
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

    async function* apiFetchMany<T extends ZodType>(
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

    return {
        apiFetch,
        apiStreamFetch,
        apiFetchTextMany,
        apiFetchMany,
    };
}
