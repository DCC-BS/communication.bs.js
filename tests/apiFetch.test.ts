import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { apiFetch } from "../src";

type User = {
    id: string;
    name: string;
};

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
});

describe("apiFetch", () => {
    test("success fetch", async () => {
        const dummyBody: User = { id: "1", name: "Alice" };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(dummyBody),
            } as Response),
        );

        const response = await apiFetch<User>("https://api.example.com/user/1");

        expect(response).toEqual(dummyBody);
    });

    test("error fetch", async () => {
        const dummyError = {
            errorId: "not_found",
            debugMessage: "User not found",
        };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve(dummyError),
            } as Response),
        );

        const response = await apiFetch<User>(
            "https://api.example.com/user/999",
        );

        expect(response).toHaveProperty("errorId", "not_found");
        expect(response).toHaveProperty("debugMessage", "User not found");
    });

    test("network error fetch", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Network error")),
        );

        const response = await apiFetch<User>("https://api.example.com/user/1");

        expect(response).toHaveProperty("errorId", "fetch_failed");
        expect(response).toHaveProperty("debugMessage", "Network error");
    });
});

describe("apiFetch with schema", () => {
    test("success fetch", async () => {
        const dummyBody = { id: "1", name: "Alice" };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(dummyBody),
            } as Response),
        );

        const response = await apiFetch("https://api.example.com/user/1", {
            schema: UserSchema,
        });

        expect(response).toEqual(dummyBody);
    });

    test("invalid data", async () => {
        const invalidBody = { id: 1, fullName: "Alice" };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve(invalidBody),
            } as Response),
        );

        const response = await apiFetch("https://api.example.com/user/1", {
            schema: UserSchema,
        });

        expect(response).toHaveProperty("errorId", "schema_validation_failed");
        expect(response).toHaveProperty(
            "debugMessage",
            expect.stringContaining("Invalid input"),
        );
    });

    test("error fetch", async () => {
        const dummyError = {
            errorId: "not_found",
            debugMessage: "User not found",
        };

        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                json: () => Promise.resolve(dummyError),
            } as Response),
        );

        const response = await apiFetch("https://api.example.com/user/999", {
            schema: UserSchema,
        });

        expect(response).toHaveProperty("errorId", "not_found");
        expect(response).toHaveProperty("debugMessage", "User not found");
    });

    test("network error fetch", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Network error")),
        );

        const response = await apiFetch("https://api.example.com/user/1", {
            schema: UserSchema,
        });

        expect(response).toHaveProperty("errorId", "fetch_failed");
        expect(response).toHaveProperty("debugMessage", "Network error");
    });

    test("POST request with body", async () => {
        const requestBody = { name: "Bob", email: "bob@example.com" };
        const responseBody = { id: "2", name: "Bob" };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: () => Promise.resolve(responseBody),
        } as Response);

        vi.stubGlobal("fetch", mockFetch);

        const response = await apiFetch<User>("https://api.example.com/users", {
            method: "POST",
            body: requestBody,
        });

        expect(response).toEqual(responseBody);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.example.com/users",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify(requestBody),
            }),
        );
    });

    test("request with custom headers", async () => {
        const dummyBody: User = { id: "1", name: "Alice" };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(dummyBody),
        } as Response);

        vi.stubGlobal("fetch", mockFetch);

        const response = await apiFetch<User>(
            "https://api.example.com/user/1",
            {
                headers: {
                    "X-Custom-Header": "custom-value",
                    Authorization: "Bearer token123",
                },
            },
        );

        expect(response).toEqual(dummyBody);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.example.com/user/1",
            expect.objectContaining({
                headers: expect.objectContaining({
                    "X-Custom-Header": "custom-value",
                    Authorization: "Bearer token123",
                }),
            }),
        );
    });

    test("request with AbortSignal", async () => {
        const controller = new AbortController();
        const dummyBody: User = { id: "1", name: "Alice" };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(dummyBody),
        } as Response);

        vi.stubGlobal("fetch", mockFetch);

        const response = await apiFetch<User>(
            "https://api.example.com/user/1",
            {
                signal: controller.signal,
            },
        );

        expect(response).toEqual(dummyBody);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.example.com/user/1",
            expect.objectContaining({
                signal: controller.signal,
            }),
        );
    });

    test("aborted request returns abort error", async () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

        const response = await apiFetch<User>("https://api.example.com/user/1");

        expect(response).toHaveProperty("errorId", "request_aborted");
        expect(response).toHaveProperty("status", 499);
    });

    test("PUT request", async () => {
        const requestBody = { name: "Alice Updated" };
        const responseBody = { id: "1", name: "Alice Updated" };

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve(responseBody),
        } as Response);

        vi.stubGlobal("fetch", mockFetch);

        const response = await apiFetch<User>(
            "https://api.example.com/users/1",
            {
                method: "PUT",
                body: requestBody,
            },
        );

        expect(response).toEqual(responseBody);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.example.com/users/1",
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify(requestBody),
            }),
        );
    });

    test("DELETE request", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
            json: () => Promise.resolve({}),
        } as Response);

        vi.stubGlobal("fetch", mockFetch);

        const _ = await apiFetch("https://api.example.com/users/1", {
            method: "DELETE",
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.example.com/users/1",
            expect.objectContaining({
                method: "DELETE",
            }),
        );
    });
});
