import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { apiFetchMany, apiFetchTextMany, isApiError } from "../src";

const MessageSchema = z.object({
    id: z.number(),
    text: z.string(),
});

describe("apiFetchTextMany", () => {
    test("success text many fetch", async () => {
        const chunks = ["Hello", " ", "World"];

        const mockStream = new ReadableStream({
            start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(new TextEncoder().encode(chunk));
                }
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

        const result: string[] = [];
        for await (const chunk of apiFetchTextMany(
            "https://api.example.com/stream",
        )) {
            if (isApiError(chunk)) {
                throw new Error("Should not return error");
            }
            result.push(chunk);
        }

        expect(result).toEqual(chunks);
    });

    test("error text many fetch", async () => {
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

        const generator = apiFetchTextMany(
            "https://api.example.com/stream/999",
        );

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw error
            }
        }).rejects.toThrow();
    });

    test("network error text many fetch", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Network error")),
        );

        const generator = apiFetchTextMany("https://api.example.com/stream");

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw error
            }
        }).rejects.toThrow();
    });

    test("null body error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: null,
            } as Response),
        );

        const generator = apiFetchTextMany("https://api.example.com/stream");

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw error for null body
            }
        }).rejects.toThrow();
    });

    test("handles abort error during text streaming", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

        const generator = apiFetchTextMany("https://api.example.com/stream");

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw abort error
            }
        }).rejects.toThrow();
    });

    test("handles large stream with multiple chunks", async () => {
        const largeChunks = Array.from({ length: 100 }, (_, i) => `chunk-${i}`);

        const mockStream = new ReadableStream({
            start(controller) {
                for (const chunk of largeChunks) {
                    controller.enqueue(new TextEncoder().encode(chunk));
                }
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

        const result: string[] = [];
        for await (const chunk of apiFetchTextMany(
            "https://api.example.com/stream",
        )) {
            result.push(chunk);
        }

        expect(result).toEqual(largeChunks);
        expect(result.length).toBe(100);
    });

    test("handles empty stream", async () => {
        const mockStream = new ReadableStream({
            start(controller) {
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

        const result: string[] = [];
        for await (const chunk of apiFetchTextMany(
            "https://api.example.com/stream",
        )) {
            result.push(chunk);
        }

        expect(result).toEqual([]);
    });
});

describe("apiFetchMany", () => {
    test("success fetch many", async () => {
        const messages = [
            { id: 1, text: "First" },
            { id: 2, text: "Second" },
            { id: 3, text: "Third" },
        ];

        const mockStream = new ReadableStream({
            start(controller) {
                for (const message of messages) {
                    controller.enqueue(
                        new TextEncoder().encode(
                            `${JSON.stringify(message)}\n`,
                        ),
                    );
                }
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

        const result = [];
        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        for await (const chunk of generator) {
            result.push(chunk);
        }

        expect(result).toEqual(messages);
    });

    test("error fetch many", async () => {
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

        const generator = apiFetchMany("https://api.example.com/stream/999", {
            schema: MessageSchema,
        });

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw error
            }
        }).rejects.toThrow();
    });

    test("network error fetch many", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Network error")),
        );

        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw error
            }
        }).rejects.toThrow();
    });

    test("invalid schema data", async () => {
        const invalidData = [{ id: "not-a-number", text: "First" }];

        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(
                    new TextEncoder().encode(JSON.stringify(invalidData[0])),
                );
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

        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw validation error
            }
        }).rejects.toThrow();
    });

    test("handles abort error during iteration", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw abort error
            }
        }).rejects.toThrow();
    });

    test("handles invalid JSON in stream", async () => {
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("not valid json"));
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

        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        await expect(async () => {
            for await (const _chunk of generator) {
                // Should throw JSON parse error
            }
        }).rejects.toThrow();
    });

    test("handles empty stream", async () => {
        const mockStream = new ReadableStream({
            start(controller) {
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

        const result = [];
        const generator = apiFetchMany("https://api.example.com/stream", {
            schema: MessageSchema,
        });

        for await (const chunk of generator) {
            result.push(chunk);
        }

        expect(result).toEqual([]);
    });
});
