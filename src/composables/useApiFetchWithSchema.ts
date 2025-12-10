import { ref } from "vue";
import type { ZodType, z } from "zod";
import { createApiClient } from "../apiFetchFactory";
import { isApiError } from "../apiFetchUtils";
import { createFetcherBuilder } from "../fetcherFactory";
import type { ApiErrorResponse } from "../types/api_error_response";
import type { ApiFetchOptionsWithSchema } from "../types/api_fetch_options";
import type { Fetcher } from "../types/fetcher";
import type { UseApiFetchOutput } from "./apiFetch.composable";

const defaultFetcher: Fetcher = createFetcherBuilder().build();

export function useApiFetchWithSchema<T extends ZodType>(
    url: string,
    options: ApiFetchOptionsWithSchema<T>,
    fetcher: Fetcher = defaultFetcher,
): UseApiFetchOutput<z.infer<T>> {
    const client = createApiClient(fetcher);

    const data = ref<z.infer<T>>();
    const error = ref<ApiErrorResponse>();
    const pending = ref(true);

    client
        .apiFetch(url, options)
        .then((response) => {
            if (isApiError(response)) {
                error.value = response;
            } else {
                data.value = response;
            }
        })
        .catch((err) => {
            error.value = {
                errorId: "fetch_failed",
                debugMessage: String(err),
            };
        })
        .finally(() => {
            pending.value = false;
        });

    return {
        data,
        error,
        pending,
    };
}
