import { describe, expect, test } from "vitest";
import {
    extractApiError,
    extractApiErrorFormError,
    isApiError,
} from "../src/apiFetchUtils";
import { ApiError } from "../src/types/api_error";

describe("isApiError", () => {
    test("returns true for ApiError instances", () => {
        const error = new ApiError("test_error", 400, "Test message");
        expect(isApiError(error)).toBe(true);
    });

    test("returns false for plain objects", () => {
        const obj = { errorId: "test", status: 400 };
        expect(isApiError(obj)).toBe(false);
    });

    test("returns false for null", () => {
        expect(isApiError(null)).toBe(false);
    });

    test("returns false for undefined", () => {
        expect(isApiError(undefined)).toBe(false);
    });

    test("returns false for strings", () => {
        expect(isApiError("error")).toBe(false);
    });

    test("returns false for numbers", () => {
        expect(isApiError(404)).toBe(false);
    });

    test("returns false for objects with $type but wrong value", () => {
        const obj = { $type: "SomethingElse" };
        expect(isApiError(obj)).toBe(false);
    });

    test("returns false for arrays", () => {
        expect(isApiError([])).toBe(false);
    });
});

describe("extractApiError", () => {
    test("extracts error from valid API error response", async () => {
        const mockResponse = {
            ok: false,
            status: 404,
            json: () =>
                Promise.resolve({
                    errorId: "not_found",
                    debugMessage: "Resource not found",
                }),
        } as Response;

        const error = await extractApiError(mockResponse);

        expect(isApiError(error)).toBe(true);
        expect(error.errorId).toBe("not_found");
        expect(error.status).toBe(404);
        expect(error.debugMessage).toBe("Resource not found");
    });

    test("extracts error without debugMessage", async () => {
        const mockResponse = {
            ok: false,
            status: 400,
            json: () =>
                Promise.resolve({
                    errorId: "bad_request",
                }),
        } as Response;

        const error = await extractApiError(mockResponse);

        expect(isApiError(error)).toBe(true);
        expect(error.errorId).toBe("bad_request");
        expect(error.status).toBe(400);
        expect(error.debugMessage).toContain("bad_request");
    });

    test("returns unexpected_error for invalid JSON response", async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response;

        const error = await extractApiError(mockResponse);

        expect(isApiError(error)).toBe(true);
        expect(error.errorId).toBe("unexpected_error");
        expect(error.status).toBe(500);
    });

    test("returns unexpected_error for non-conforming response structure", async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            json: () => Promise.resolve({ someField: "value" }),
        } as Response;

        const error = await extractApiError(mockResponse);

        expect(isApiError(error)).toBe(true);
        expect(error.errorId).toBe("unexpected_error");
        expect(error.status).toBe(500);
    });

    test("preserves status codes correctly", async () => {
        const statuss = [400, 401, 403, 404, 500, 502, 503];

        for (const status of statuss) {
            const mockResponse = {
                ok: false,
                status: status,
                json: () =>
                    Promise.resolve({
                        errorId: "test_error",
                    }),
            } as Response;

            const error = await extractApiError(mockResponse);
            expect(error.status).toBe(status);
        }
    });
});

describe("extractApiErrorFormError", () => {
    test("returns ApiError instance unchanged", async () => {
        const originalError = new ApiError(
            "original_error",
            400,
            "Original message",
        );
        const result = await extractApiErrorFormError(originalError);

        expect(result).toBe(originalError);
        expect(result.errorId).toBe("original_error");
    });

    test("converts AbortError by name", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";

        const result = await extractApiErrorFormError(abortError);

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("request_aborted");
        expect(result.status).toBe(499);
    });

    test("converts error with abort cause", async () => {
        const error = { cause: "aborted" };

        const result = await extractApiErrorFormError(error);

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("request_aborted");
        expect(result.status).toBe(499);
    });

    test("converts string 'aborted'", async () => {
        const result = await extractApiErrorFormError("aborted");

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("request_aborted");
        expect(result.status).toBe(499);
    });

    test("converts standard Error to fetch_failed", async () => {
        const error = new Error("Network error");

        const result = await extractApiErrorFormError(error);

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("fetch_failed");
        expect(result.status).toBe(500);
        expect(result.debugMessage).toBe("Network error");
    });

    test("converts string errors to fetch_failed", async () => {
        const result = await extractApiErrorFormError("Something went wrong");

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("fetch_failed");
        expect(result.status).toBe(500);
        expect(result.debugMessage).toBe("Something went wrong");
    });

    test("converts unknown objects to fetch_failed", async () => {
        const result = await extractApiErrorFormError({ weird: "object" });

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("fetch_failed");
        expect(result.status).toBe(500);
        expect(result.debugMessage).toContain("[object Object]");
    });

    test("handles TypeError from fetch", async () => {
        const typeError = new TypeError("Failed to fetch");

        const result = await extractApiErrorFormError(typeError);

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("fetch_failed");
        expect(result.status).toBe(500);
        expect(result.debugMessage).toBe("Failed to fetch");
    });

    test("handles DOMException for network errors", async () => {
        const error = new Error("NetworkError");
        error.name = "NetworkError";

        const result = await extractApiErrorFormError(error);

        expect(isApiError(result)).toBe(true);
        expect(result.errorId).toBe("fetch_failed");
        expect(result.debugMessage).toBe("NetworkError");
    });
});
