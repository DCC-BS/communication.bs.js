import { type Ref, ref } from "vue";
import { apiFetch, isApiError } from "../apiFetch";
import type { ApiErrorResponse } from "../models/api_error_response";
import type { ApiFetchOptions } from "../models/api_fetch_options";

export type UseApiFetchOutput<T> = {
    data: Ref<T | undefined>;
    error: Ref<ApiErrorResponse | undefined>;
    pending: Ref<boolean>;
};

export function useApiFetch<T extends object>(
    url: string,
    options?: ApiFetchOptions,
) {
    const data = ref<T>();
    const error = ref<ApiErrorResponse>();
    const pending = ref(true);

    apiFetch<T>(url, options)
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
