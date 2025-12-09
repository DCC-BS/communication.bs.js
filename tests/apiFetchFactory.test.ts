import { describe, expect, test, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createApiClient } from "../src/apiFetchFactory";
import { ApiError } from "../src/types/api_error";
import type { Fetcher } from "../src/types/fetcher";

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

describe("createApiClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("with default fetcher", () => {
        test("creates client successfully", () => {
            const client = createApiClient();

            expect(client).toBeDefined();
            expect(client.apiFetch).toBeDefined();
            expect(client.apiStreamFetch).toBeDefined();
            expect(client.apiFetchTextMany).toBeDefined();
            expect(client.apiFetchMany).toBeDefined();
        });
    });

    describe("with custom fetcher", () => {
        test("uses custom fetcher for requests", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ id: "1", name: "Alice", email: "alice@example.com" }),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch<User>("/users/1");

            expect(mockFetcher).toHaveBeenCalledWith("/users/1", {});
            expect(response).toEqual({ id: "1", name: "Alice", email: "alice@example.com" });
        });

        test("passes options to custom fetcher", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true }),
            } as Response);

            const client = createApiClient(mockFetcher);
            await client.apiFetch("/api/data", { method: "POST", body: { test: true } });

            expect(mockFetcher).toHaveBeenCalledWith("/api/data", {
                method: "POST",
                body: { test: true },
            });
        });
    });

    describe("apiFetch method", () => {
        test("returns data on successful request", async () => {
            const mockData = { id: "1", name: "Alice", email: "alice@example.com" };
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockData),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch<User>("/users/1");

            expect(response).toEqual(mockData);
        });

        test("validates data with schema", async () => {
            const mockData = { id: "1", name: "Alice", email: "alice@example.com" };
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockData),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch("/users/1", { schema: UserSchema });

            expect(response).toEqual(mockData);
        });

        test("returns schema validation error for invalid data", async () => {
            const invalidData = { id: 1, fullName: "Alice" }; // wrong structure
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(invalidData),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch("/users/1", { schema: UserSchema });

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("schema_validation_failed");
                expect(response.statusCode).toBe(500);
                expect(response.debugMessage).toContain("validation failed");
            }
        });

        test("returns API error on failed request", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve({
                    errorId: "not_found",
                    debugMessage: "User not found",
                }),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch<User>("/users/999");

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("not_found");
                expect(response.statusCode).toBe(404);
                expect(response.debugMessage).toBe("User not found");
            }
        });

        test("handles network errors", async () => {
            const mockFetcher: Fetcher = vi.fn().mockRejectedValue(new Error("Network error"));

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch<User>("/users/1");

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("fetch_failed");
                expect(response.statusCode).toBe(500);
                expect(response.debugMessage).toBe("Network error");
            }
        });

        test("handles abort errors", async () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";
            const mockFetcher: Fetcher = vi.fn().mockRejectedValue(abortError);

            const client = createApiClient(mockFetcher);
            const response = await client.apiFetch<User>("/users/1");

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("request_aborted");
                expect(response.statusCode).toBe(499);
            }
        });
    });

    describe("apiStreamFetch method", () => {
        test("returns stream on successful request", async () => {
            const mockStream = new ReadableStream();
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiStreamFetch("/stream");

            expect(response).toBe(mockStream);
        });

        test("returns API error on failed stream request", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.resolve({
                    errorId: "server_error",
                    debugMessage: "Internal server error",
                }),
            } as Response);

            const client = createApiClient(mockFetcher);
            const response = await client.apiStreamFetch("/stream");

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("server_error");
                expect(response.statusCode).toBe(500);
            }
        });

        test("handles network errors in streaming", async () => {
            const mockFetcher: Fetcher = vi.fn().mockRejectedValue(new Error("Connection failed"));

            const client = createApiClient(mockFetcher);
            const response = await client.apiStreamFetch("/stream");

            expect(response).toBeInstanceOf(ApiError);
            if (response instanceof ApiError) {
                expect(response.errorId).toBe("fetch_failed");
                expect(response.debugMessage).toBe("Connection failed");
            }
        });
    });

    describe("apiFetchTextMany method", () => {
        test("yields text chunks from stream", async () => {
            const chunks = ["chunk1", "chunk2", "chunk3"];
            const encoder = new TextEncoder();

            const mockStream = new ReadableStream({
                start(controller) {
                    for (const chunk of chunks) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                },
            });

            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response);

            const client = createApiClient(mockFetcher);
            const results: string[] = [];

            for await (const chunk of client.apiFetchTextMany("/stream")) {
                results.push(chunk);
            }

            expect(results).toEqual(chunks);
        });

        test("throws error on failed request", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve({
                    errorId: "not_found",
                }),
            } as Response);

            const client = createApiClient(mockFetcher);

            await expect(async () => {
                for await (const _ of client.apiFetchTextMany("/stream")) {
                    // Should throw before yielding anything
                }
            }).rejects.toThrow();
        });

        test("throws error when response body is null", async () => {
            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: null,
            } as Response);

            const client = createApiClient(mockFetcher);

            await expect(async () => {
                for await (const _ of client.apiFetchTextMany("/stream")) {
                    // Should throw
                }
            }).rejects.toThrow();
        });
    });

    describe("apiFetchMany method", () => {
        test("yields parsed objects from stream", async () => {
            const users = [
                { id: "1", name: "Alice", email: "alice@example.com" },
                { id: "2", name: "Bob", email: "bob@example.com" },
            ];

            const encoder = new TextEncoder();
            const mockStream = new ReadableStream({
                start(controller) {
                    for (const user of users) {
                        controller.enqueue(encoder.encode(JSON.stringify(user)));
                    }
                    controller.close();
                },
            });

            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response);

            const client = createApiClient(mockFetcher);
            const results: User[] = [];

            for await (const user of client.apiFetchMany("/users", { schema: UserSchema })) {
                results.push(user);
            }

            expect(results).toEqual(users);
        });

        test("throws error on schema validation failure", async () => {
            const invalidData = { id: 1, fullName: "Alice" };
            const encoder = new TextEncoder();

            const mockStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(JSON.stringify(invalidData)));
                    controller.close();
                },
            });

            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response);

            const client = createApiClient(mockFetcher);

            await expect(async () => {
                for await (const _ of client.apiFetchMany("/users", { schema: UserSchema })) {
                    // Should throw on validation error
                }
            }).rejects.toThrow();
        });

        test("throws error on invalid JSON", async () => {
            const encoder = new TextEncoder();

            const mockStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode("invalid json"));
                    controller.close();
                },
            });

            const mockFetcher: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: mockStream,
            } as Response);

            const client = createApiClient(mockFetcher);

            await expect(async () => {
                for await (const _ of client.apiFetchMany("/data", { schema: UserSchema })) {
                    // Should throw on JSON parse error
                }
            }).rejects.toThrow();
        });
    });

    describe("multiple clients", () => {
        test("can create multiple independent clients", async () => {
            const fetcher1: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ api: 1 }),
            } as Response);

            const fetcher2: Fetcher = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ api: 2 }),
            } as Response);

            const client1 = createApiClient(fetcher1);
            const client2 = createApiClient(fetcher2);

            const response1 = await client1.apiFetch("/data");
            const response2 = await client2.apiFetch("/data");

            expect(response1).toEqual({ api: 1 });
            expect(response2).toEqual({ api: 2 });
            expect(fetcher1).toHaveBeenCalledOnce();
            expect(fetcher2).toHaveBeenCalledOnce();
        });
    });
});
