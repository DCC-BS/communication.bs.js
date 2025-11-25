import zod from "zod";

export const ApiErrorResponse = zod.object({
    errorId: zod.string().optional().default("unexpected_error"),
    debugMessage: zod.string().optional(),
});

export type ApiErrorResponse = zod.infer<typeof ApiErrorResponse>;