/**
 * Authentication configuration for the fetcher.
 * Supports Bearer token and Basic authentication methods.
 *
 * @example Bearer Authentication
 * const authConfig: AuthConfig = {
 *   type: "bearer",
 *   token: "your-api-token-here"
 * };
 *
 * @example Basic Authentication
 * const authConfig: AuthConfig = {
 *   type: "basic",
 *   username: "user",
 *   password: "pass"
 * };
 */
export type AuthConfig = BearerAuthConfig | BasicAuthConfig;

export type BearerAuthConfig = {
    type: "bearer";
    token: string;
};

export type BasicAuthConfig = {
    type: "basic";
    username: string;
    password: string;
};
