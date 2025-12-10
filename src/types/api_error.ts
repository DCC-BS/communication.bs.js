import type { ErrorId } from "../apiFetch";

export class ApiError extends Error {
    $type = "ApiError" as const;
    errorId: ErrorId;
    debugMessage?: string;
    status: number;

    constructor(errorId: ErrorId, status: number, debugMessage?: string) {
        super(`API Error: ${errorId} (status: ${status})`);
        this.errorId = errorId;
        this.status = status;
        this.debugMessage = debugMessage;
    }
}
