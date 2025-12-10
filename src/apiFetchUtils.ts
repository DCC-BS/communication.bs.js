import { ApiError } from ".";
import { ApiErrorResponse } from "./types/api_error_response";

export function isApiError(response: unknown): response is ApiError {
    return (
        typeof response === "object" &&
        response !== null &&
        "$type" in response &&
        response.$type === "ApiError"
    );
}

export async function extractApiError(response: Response): Promise<ApiError> {
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

export async function extractApiErrorFromError(error: unknown) {
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
