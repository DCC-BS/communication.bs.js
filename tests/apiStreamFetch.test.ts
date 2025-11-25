import { describe, expect, test, vi } from "vitest";
import { apiStreamFetch, isApiError } from "../src";

describe("apiStreamFetch", () => {
    test("success stream fetch", async () => {
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3]));
                controller.close();
            },
        });

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response),
        );

        const response = await apiStreamFetch("https://api.example.com/stream");

        expect(isApiError(response)).toBe(false);
        expect(response).toBeInstanceOf(ReadableStream);

        // Verify we can read from the stream
        if (isApiError(response)) {
            throw new Error(
                "Expected a ReadableStream, but received an ApiError",
            );
        }

        const reader = response.getReader();
        const { value, done } = await reader.read();
        expect(value).toEqual(new Uint8Array([1, 2, 3]));
        expect(done).toBe(false);
    });

    test("error stream fetch", async () => {
        const dummyError = {
            errorId: "not_found",
            debugMessage: "Stream not found",
        };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve(dummyError),
            } as Response),
        );

        const response = await apiStreamFetch(
            "https://api.example.com/stream/999",
        );

        expect(isApiError(response)).toBe(true);
        expect(response).toHaveProperty("errorId", "not_found");
        expect(response).toHaveProperty("debugMessage", "Stream not found");
    });

    test("network error stream fetch", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Network error")),
        );

        const response = await apiStreamFetch("https://api.example.com/stream");

        expect(isApiError(response)).toBe(true);
        expect(response).toHaveProperty("errorId", "fetch_failed");
        expect(response).toHaveProperty("debugMessage", "Network error");
    });
});
