import { describe, expect, test } from "vitest";
import { ApiError, isApiError } from "../src";

describe("isApiError", () => {
    test("identifies ApiError instances correctly", () => {
        const apiError = new ApiError("not_found", 404, "User not found");
        const nonApiError = new Error("Some other error");
        const someString = "Just a string";

        expect(isApiError(apiError)).toBe(true);
        expect(isApiError(nonApiError)).toBe(false);
        expect(isApiError(someString)).toBe(false);
    });
});
