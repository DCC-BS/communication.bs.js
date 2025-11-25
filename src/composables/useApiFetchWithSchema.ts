import { ref } from "vue";
import type { ZodType, z } from "zod";
import { apiFetch, isApiError } from "../apiFetch";
import type { ApiErrorResponse } from "../models/api_error_response";
import type { ApiFetchOptionsWithSchema } from "../models/api_fetch_options";
import type { UseApiFetchOutput } from "./apiFetch.composable";

export function useApiFetchWithSchema<T extends ZodType>(
    url: string,
    options: ApiFetchOptionsWithSchema<T>,
): UseApiFetchOutput<z.infer<T>> {
    const data = ref<z.infer<T>>();
    const error = ref<ApiErrorResponse>();
    const pending = ref(true);

    apiFetch(url, options)
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
