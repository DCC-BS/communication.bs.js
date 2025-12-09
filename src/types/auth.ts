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
export type AuthConfig = {
    /** The type of authentication to use */
    type: "bearer" | "basic";
    /** Bearer token for bearer authentication */
    token?: string;
    /** Username for basic authentication */
    username?: string;
    /** Password for basic authentication */
    password?: string;
};
