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
});
