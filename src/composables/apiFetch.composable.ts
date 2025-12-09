import { type Ref, ref } from "vue";
import { createApiClient } from "../apiFetchFactory";
import { isApiError } from "../apiFetchUtils";
import { createFetcherBuilder } from "../fetcherFactory";
import type { ApiErrorResponse } from "../types/api_error_response";
import type { ApiFetchOptions } from "../types/api_fetch_options";

export type UseApiFetchOutput<T> = {
    data: Ref<T | undefined>;
    error: Ref<ApiErrorResponse | undefined>;
    pending: Ref<boolean>;
};

const defaultFetcher = createFetcherBuilder().build();

export function useApiFetch<T extends object>(
    url: string,
    options?: ApiFetchOptions,
    fetcher = defaultFetcher,
) {
    const client = createApiClient(fetcher);
    const data = ref<T>();
    const error = ref<ApiErrorResponse>();
    const pending = ref(true);

    client
        .apiFetch<T>(url, options)
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
        data: data,
        error: error,
        pending,
    };
}
