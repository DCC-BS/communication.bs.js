export type HeadersInit =
    | Headers
    | Record<string, string | readonly string[]>
    | Array<[string, string]>
    | string[][];

export function normalizeHeaders(
    headers: HeadersInit | undefined,
): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
        const obj: Record<string, string> = {};
        headers.forEach((v, k) => {
            obj[k] = v;
        });
        return obj;
    }
    if (Array.isArray(headers)) {
        return Object.fromEntries(headers);
    }

    const obj: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        obj[key] = Array.isArray(value) ? value.join(", ") : (value as string);
    }
    return obj;
}
