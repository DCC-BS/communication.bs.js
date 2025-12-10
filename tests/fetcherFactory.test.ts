import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BeforeRequestHook } from "../src";
import { createFetcherBuilder } from "../src/fetcherFactory";

describe("fetcherFactory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("builder pattern", () => {
        test("creates a builder instance", () => {
            const builder = createFetcherBuilder();
            expect(builder).toBeDefined();
            expect(typeof builder.build).toBe("function");
        });

        test("build() returns a function", () => {
            const fetcher = createFetcherBuilder().build();
            expect(typeof fetcher).toBe("function");
        });
    });

    describe("setBaseURL", () => {
        test("prepends base URL to relative paths", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .build();

            await fetcher("/users", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/users",
                expect.any(Object),
            );
        });

        test("handles base URL with trailing slash", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com/")
                .build();

            await fetcher("users", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/users",
                expect.any(Object),
            );
        });

        test("handles paths without leading slash", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .build();

            await fetcher("/users", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/users",
                expect.any(Object),
            );
        });
    });

    describe("addHeader", () => {
        test("adds single custom header", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .addHeader("X-API-Key", "test-key")
                .build();

            await fetcher("/data", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "X-API-Key": "test-key",
                    }),
                }),
            );
        });

        test("adds multiple custom headers", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .addHeader("X-API-Key", "test-key")
                .addHeader("X-Custom-Header", "custom-value")
                .addHeader("X-Version", "1.0")
                .build();

            await fetcher("/data", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "X-API-Key": "test-key",
                        "X-Custom-Header": "custom-value",
                        "X-Version": "1.0",
                    }),
                }),
            );
        });

        test("headers from options override builder headers", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .addHeader("X-API-Key", "default-key")
                .build();

            await fetcher("/data", {
                headers: {
                    "X-API-Key": "override-key",
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "X-API-Key": "override-key",
                    }),
                }),
            );
        });
    });

    describe("setAuth", () => {
        test("adds Bearer token authorization header", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setAuth("bearer", "my-jwt-token")
                .build();

            await fetcher("/protected", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/protected",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer my-jwt-token",
                    }),
                }),
            );
        });

        test("adds Basic auth header with encoded credentials", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setAuth("basic", undefined, "user", "pass")
                .build();

            await fetcher("/protected", {});

            const expectedAuth = `Basic ${btoa("user:pass")}`;

            expect(mockFetch).toHaveBeenCalledWith(
                "/protected",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: expectedAuth,
                    }),
                }),
            );
        });
    });

    describe("setRequestTimeout", () => {
        test("aborts request after timeout", async () => {
            const mockFetch = vi
                .fn()
                .mockImplementation((_url: string, options: RequestInit) => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve({
                                ok: true,
                                status: 200,
                            } as Response);
                        }, 5000);

                        options.signal?.addEventListener("abort", () => {
                            reject();
                        });
                    });
                });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setRequestTimeout(100)
                .build();

            await expect(fetcher("/slow", {})).rejects.toThrow();
        });

        test("does not abort fast requests", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setRequestTimeout(1000)
                .build();

            const response = await fetcher("/fast", {});

            expect(response.ok).toBe(true);
        });

        test("preserves existing abort signal", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const controller = new AbortController();
            const fetcher = createFetcherBuilder()
                .setRequestTimeout(1000)
                .build();

            await fetcher("/data", { signal: controller.signal });

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    signal: expect.any(AbortSignal),
                }),
            );
        });
    });

    describe("setRetries", () => {
        test("retries failed requests", async () => {
            let attempts = 0;
            const mockFetch = vi.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                    } as Response);
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setRetries(3, 10).build();

            const response = await fetcher("/flaky", {});

            expect(response.ok).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(3);
        });

        test("respects maxRetries limit", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setRetries(2, 10).build();

            const response = await fetcher("/always-fails", {});

            expect(response.ok).toBe(false);
            expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
        });

        test("only retries on specified status codes", async () => {
            let attempts = 0;
            const mockFetch = vi.fn().mockImplementation(() => {
                attempts++;
                return Promise.resolve({
                    ok: false,
                    status: attempts === 1 ? 404 : 500,
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setRetries(3, 10, [500, 502, 503])
                .build();

            const response = await fetcher("/data", {});

            expect(response.status).toBe(404);
            expect(mockFetch).toHaveBeenCalledTimes(1); // No retry for 404
        });

        test("uses shouldRetry function when provided", async () => {
            const mockFetch = vi.fn().mockImplementation(() => {
                return Promise.resolve({
                    ok: false,
                    status: 429, // Rate limited
                } as Response);
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setRetries(2, 10).build();

            await fetcher("/rate-limited", {});

            expect(mockFetch).toHaveBeenCalledTimes(3);
        });
    });

    describe("hooks", () => {
        test("afterResponse hook processes response", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                clone: function () {
                    return this;
                },
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const afterResponseSpy = vi.fn((response) => response);

            const fetcher = createFetcherBuilder()
                .setAfterResponse(afterResponseSpy)
                .build();

            await fetcher("/data", {});

            expect(afterResponseSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    ok: true,
                    status: 200,
                }),
            );
        });

        test("onError hook handles errors", async () => {
            const error = new Error("Network failed");
            const mockFetch = vi.fn().mockRejectedValue(error);

            vi.stubGlobal("fetch", mockFetch);

            const onErrorSpy = vi.fn((err) => err);

            const fetcher = createFetcherBuilder()
                .setOnError(onErrorSpy)
                .build();

            await expect(fetcher("/data", {})).rejects.toThrow();

            expect(onErrorSpy).toHaveBeenCalledWith(error);
        });
    });

    describe("setQueryParams", () => {
        test("adds query parameters to URL", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setQueryParams({ version: "1.0", format: "json" })
                .build();

            await fetcher("/data", {});

            const calledUrl = mockFetch.mock.calls[0][0];
            expect(calledUrl).toContain("version=1.0");
            expect(calledUrl).toContain("format=json");
        });

        test("preserves existing query parameters", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setQueryParams({ version: "1.0" })
                .build();

            await fetcher("/data?existing=value", {});

            const calledUrl = mockFetch.mock.calls[0][0];
            expect(calledUrl).toContain("existing=value");
            expect(calledUrl).toContain("version=1.0");
        });
    });

    describe("setCredentials", () => {
        test("sets credentials mode", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .setCredentials("include")
                .build();

            await fetcher("/data", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    credentials: "include",
                }),
            );
        });
    });

    describe("setMode", () => {
        test("sets CORS mode", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setMode("no-cors").build();

            await fetcher("/data", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    mode: "no-cors",
                }),
            );
        });
    });

    describe("setCache", () => {
        test("sets cache strategy", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().setCache("no-cache").build();

            await fetcher("/data", {});

            expect(mockFetch).toHaveBeenCalledWith(
                "/data",
                expect.objectContaining({
                    cache: "no-cache",
                }),
            );
        });
    });

    describe("enableDebug", () => {
        test("logs requests when debug is enabled", async () => {
            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder().enableDebug().build();

            await fetcher("/data", {});

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe("enableDeduplication", () => {
        test("deduplicates simultaneous identical requests", async () => {
            let callCount = 0;
            const mockFetch = vi.fn().mockImplementation(() => {
                callCount++;
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            status: 200,
                            json: () => Promise.resolve({ count: callCount }),
                        } as Response);
                    }, 100);
                });
            });

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .enableDeduplication()
                .build();

            const [response1, response2, response3] = await Promise.all([
                fetcher("/data", {}),
                fetcher("/data", {}),
                fetcher("/data", {}),
            ]);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response1).toBe(response2);
            expect(response2).toBe(response3);
        });

        test("does not deduplicate different URLs", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const fetcher = createFetcherBuilder()
                .enableDeduplication()
                .build();

            await Promise.all([fetcher("/data1", {}), fetcher("/data2", {})]);

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe("combined configuration", () => {
        test("all configurations work together", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true }),
            } as Response);

            vi.stubGlobal("fetch", mockFetch);

            const beforeRequestSpy = vi.fn(() =>
                Promise.resolve(),
            ) as BeforeRequestHook;

            const fetcher = createFetcherBuilder()
                .setBaseURL("https://api.example.com")
                .addHeader("X-API-Key", "test-key")
                .setAuth("bearer", "jwt-token")
                .setRequestTimeout(5000)
                .setBeforeRequest(beforeRequestSpy)
                .setQueryParams({ version: "1.0" })
                .setCredentials("include")
                .setMode("cors")
                .build();

            await fetcher("/users", {});

            expect(beforeRequestSpy).toHaveBeenCalled();
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(
                    "https://api.example.com/users?version=1.0",
                ),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "X-API-Key": "test-key",
                        Authorization: "Bearer jwt-token",
                    }),
                    credentials: "include",
                    mode: "cors",
                }),
            );
        });
    });
});
