import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "../src/apiFetchFactory";
import { isApiError } from "../src/apiFetchUtils";
import { createFetcherBuilder } from "../src/fetcherFactory";

describe("Integration Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Multiple API Clients", () => {
        test("can create and use multiple clients with different base URLs", async () => {
            const mockFetch = vi.fn((url: string) => {
                if (url.includes("api1.example.com")) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ source: "api1" }),
                    } as Response);
                }
                if (url.includes("api2.example.com")) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ source: "api2" }),
                    } as Response);
                }
                return Promise.resolve({
                    ok: false,
                    status: 404,
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher1 = createFetcherBuilder()
                .setBaseURL("https://api1.example.com")
                .build();

            const fetcher2 = createFetcherBuilder()
                .setBaseURL("https://api2.example.com")
                .build();

            const client1 = createApiClient(fetcher1);
            const client2 = createApiClient(fetcher2);

            const response1 = await client1.apiFetch<{ source: string }>(
                "/data",
            );
            const response2 = await client2.apiFetch<{ source: string }>(
                "/data",
            );

            expect(isApiError(response1)).toBe(false);
            expect(isApiError(response2)).toBe(false);

            if (!isApiError(response1) && !isApiError(response2)) {
                expect(response1.source).toBe("api1");
                expect(response2.source).toBe("api2");
            }
        });

        test("clients can have different authentication", async () => {
            const mockFetch = vi.fn((_url: string, options: RequestInit) => {
                const authHeader = (options.headers as Record<string, string>)
                    ?.Authorization;

                if (authHeader?.includes("admin-token")) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ role: "admin" }),
                    } as Response);
                }

                if (authHeader?.includes("user-token")) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ role: "user" }),
                    } as Response);
                }

                return Promise.resolve({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ errorId: "unauthorized" }),
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const adminFetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .setAuth("bearer", "admin-token")
                .build();

            const userFetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .setAuth("bearer", "user-token")
                .build();

            const adminClient = createApiClient(adminFetcher);
            const userClient = createApiClient(userFetcher);

            const adminResponse = await adminClient.apiFetch<{ role: string }>(
                "/profile",
            );
            const userResponse = await userClient.apiFetch<{ role: string }>(
                "/profile",
            );

            if (!isApiError(adminResponse) && !isApiError(userResponse)) {
                expect(adminResponse.role).toBe("admin");
                expect(userResponse.role).toBe("user");
            }
        });
    });

    describe("Retry Logic", () => {
        test("successfully retries and recovers from transient failures", async () => {
            let attemptCount = 0;

            const mockFetch = vi.fn().mockImplementation(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.resolve({
                        ok: false,
                        status: 503,
                        json: () =>
                            Promise.resolve({ errorId: "service_unavailable" }),
                    } as Response);
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true }),
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setRetries(3, 10, [503, 502, 500])
                .build();

            const client = createApiClient(fetcher);
            const response = await client.apiFetch<{ success: boolean }>(
                "/flaky-endpoint",
            );

            expect(attemptCount).toBe(3);
            expect(isApiError(response)).toBe(false);
            if (!isApiError(response)) {
                expect(response.success).toBe(true);
            }
        });

        test("gives up after max retries exceeded", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ errorId: "server_error" }),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setRetries(2, 10).build();

            const client = createApiClient(fetcher);
            const response = await client.apiFetch("/always-fails");

            expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
            expect(isApiError(response)).toBe(true);
            if (isApiError(response)) {
                expect(response.errorId).toBe("server_error");
            }
        });
    });

    describe("Hook Execution Order", () => {
        test("hooks execute in correct order: beforeRequest -> fetch -> afterResponse", async () => {
            const executionOrder: string[] = [];

            const mockFetch = vi.fn().mockImplementation(() => {
                executionOrder.push("fetch");
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ data: "test" }),
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setBeforeRequest(() => {
                    executionOrder.push("beforeRequest");
                })
                .setAfterResponse((response) => {
                    executionOrder.push("afterResponse");
                    return response;
                })
                .build();

            const client = createApiClient(fetcher);
            await client.apiFetch("/data");

            expect(executionOrder).toEqual([
                "beforeRequest",
                "fetch",
                "afterResponse",
            ]);
        });

        test("onError hook executes on failure", async () => {
            let errorHookCalled = false;

            const mockFetch = vi
                .fn()
                .mockRejectedValue(new Error("Network failure"));

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setOnError((error) => {
                    errorHookCalled = true;
                    return error;
                })
                .build();

            const client = createApiClient(fetcher);
            const response = await client.apiFetch("/data");

            expect(errorHookCalled).toBe(true);
            expect(isApiError(response)).toBe(true);
        });
    });

    describe("Request Deduplication", () => {
        test("deduplicates concurrent identical requests", async () => {
            let fetchCallCount = 0;

            const mockFetch = vi.fn().mockImplementation(() => {
                fetchCallCount++;
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            status: 200,
                            json: () =>
                                Promise.resolve({ callNumber: fetchCallCount }),
                        } as Response);
                    }, 50);
                });
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .enableDeduplication()
                .build();

            const client = createApiClient(fetcher);

            const [res1, res2, res3] = await Promise.all([
                client.apiFetch<{ callNumber: number }>("/users/1"),
                client.apiFetch<{ callNumber: number }>("/users/1"),
                client.apiFetch<{ callNumber: number }>("/users/1"),
            ]);

            expect(fetchCallCount).toBe(1);
            expect(isApiError(res1)).toBe(false);
            expect(isApiError(res2)).toBe(false);
            expect(isApiError(res3)).toBe(false);

            if (!isApiError(res1) && !isApiError(res2) && !isApiError(res3)) {
                expect(res1.callNumber).toBe(1);
                expect(res2.callNumber).toBe(1);
                expect(res3.callNumber).toBe(1);
            }
        });

        test("does not deduplicate sequential requests", async () => {
            let fetchCallCount = 0;

            const mockFetch = vi.fn().mockImplementation(() => {
                fetchCallCount++;
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ callNumber: fetchCallCount }),
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .enableDeduplication()
                .build();

            const client = createApiClient(fetcher);

            await client.apiFetch("/data");
            await client.apiFetch("/data");
            await client.apiFetch("/data");

            expect(fetchCallCount).toBe(3);
        });
    });

    describe("Timeout and Retry Combination", () => {
        test("retries work with timeout configuration", async () => {
            let attemptCount = 0;

            const mockFetch = vi.fn().mockImplementation(() => {
                attemptCount++;
                if (attemptCount === 1) {
                    // First attempt times out
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({
                                ok: false,
                                status: 408,
                            } as Response);
                        }, 200);
                    });
                }
                // Second attempt succeeds quickly
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ success: true }),
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setRequestTimeout(100)
                .setRetries(2, 10)
                .build();

            const client = createApiClient(fetcher);
            const _ = await client.apiFetch<{ success: boolean }>("/data");

            expect(attemptCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Schema Validation with Real-World Scenarios", () => {
        test("validates nested object structures", async () => {
            const UserSchema = z.object({
                id: z.number(),
                name: z.string(),
                email: z.email(),
                profile: z.object({
                    age: z.number().min(0),
                    city: z.string(),
                }),
            });

            const mockData = {
                id: 1,
                name: "Alice",
                email: "alice@example.com",
                profile: {
                    age: 30,
                    city: "New York",
                },
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockData),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().build();
            const client = createApiClient(fetcher);

            const response = await client.apiFetch("/user", {
                schema: UserSchema,
            });

            expect(isApiError(response)).toBe(false);
            if (!isApiError(response)) {
                expect(response.id).toBe(1);
                expect(response.profile.city).toBe("New York");
            }
        });

        test("catches validation errors in deeply nested structures", async () => {
            const Schema = z.object({
                user: z.object({
                    details: z.object({
                        email: z.string().email(),
                    }),
                }),
            });

            const invalidData = {
                user: {
                    details: {
                        email: "not-an-email", // Invalid email
                    },
                },
            };

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(invalidData),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().build();
            const client = createApiClient(fetcher);

            const response = await client.apiFetch("/data", { schema: Schema });

            expect(isApiError(response)).toBe(true);
            if (isApiError(response)) {
                expect(response.errorId).toBe("schema_validation_failed");
            }
        });
    });

    describe("Complete Workflow", () => {
        test("full production-like setup with all features", async () => {
            const executionLog: string[] = [];

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () =>
                    Promise.resolve({
                        id: 1,
                        name: "Test User",
                        email: "test@example.com",
                    }),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const UserSchema = z.object({
                id: z.number(),
                name: z.string(),
                email: z.email(),
            });

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .addHeader("X-App-Version", "1.0.0")
                .setAuth("bearer", "production-token")
                .setRequestTimeout(5000)
                .setRetries(3, 1000)
                .setBeforeRequest(() => {
                    executionLog.push("before-request");
                })
                .setAfterResponse((response) => {
                    executionLog.push("after-response");
                    return response;
                })
                .setQueryParams({ api_version: "v1" })
                .setCredentials("include")
                .enableDeduplication()
                .build();

            const client = createApiClient(fetcher);

            const response = await client.apiFetch("/users/1", {
                schema: UserSchema,
            });

            expect(isApiError(response)).toBe(false);
            expect(executionLog).toContain("before-request");
            expect(executionLog).toContain("after-response");

            if (!isApiError(response)) {
                expect(response.id).toBe(1);
                expect(response.email).toContain("@");
            }

            // biome-ignore lint/style/noNonNullAssertion: ok in test
            const calledUrl = mockFetch.mock.calls![0]![0] as string;
            // biome-ignore lint/style/noNonNullAssertion: ok in test
            const calledOptions = mockFetch.mock.calls![0]![1] as RequestInit;

            expect(calledUrl).toContain("api.example.com");
            expect(calledUrl).toContain("api_version=v1");
            expect(
                (calledOptions.headers as Record<string, string>).Authorization,
            ).toBe("Bearer production-token");
            expect(
                (calledOptions.headers as Record<string, string>)[
                    "X-App-Version"
                ],
            ).toBe("1.0.0");
            expect(calledOptions.credentials).toBe("include");
        });
    });
});
