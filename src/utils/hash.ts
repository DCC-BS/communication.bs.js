/**
 * Simple hash function for generating consistent cache keys.
 * Uses the FNV-1a algorithm for fast, deterministic hashing.
 *
 * @param str - String to hash
 * @returns Hash value as a hexadecimal string
 *
 * @example
 * const hash = hashString('{"name":"John","age":30}');
 * console.log(hash); // "a1b2c3d4"
 */
export function hashString(str: string): string {
    let hash = 2166136261; // FNV offset basis

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash +=
            (hash << 1) +
            (hash << 4) +
            (hash << 7) +
            (hash << 8) +
            (hash << 24);
    }

    return (hash >>> 0).toString(16);
}

/**
 * Generates a hash for FormData by serializing its entries.
 * For File objects, includes name, size, and type (not content, for performance).
 * For regular values, includes the string representation.
 * Entries are sorted for consistent hashing regardless of insertion order.
 *
 * @param formData - FormData to hash
 * @returns Hash value as a hexadecimal string
 *
 * @example
 * const formData = new FormData();
 * formData.append("name", "John");
 * formData.append("file", fileBlob);
 * const hash = await hashFormData(formData);
 * console.log(hash); // "x9y8z7w6"
 */
export async function hashFormData(formData: FormData): Promise<string> {
    const entries: string[] = [];

    for (const [key, value] of formData.entries()) {
        if (
            typeof value === "object" &&
            value !== null &&
            "name" in value &&
            "size" in value &&
            "type" in value
        ) {
            // For files, include name, size, and type
            const file = value as File;
            entries.push(`${key}:file:${file.name}:${file.size}:${file.type}`);
        } else {
            entries.push(`${key}:${value}`);
        }
    }

    return hashString(entries.sort().join("|"));
}
