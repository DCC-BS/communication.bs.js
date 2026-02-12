import zod from "zod";

export const ApiErrorResponse = zod.object({
    errorId: zod.string(),
    debugMessage: zod.string().optional(),
});

export type ApiErrorResponse = zod.infer<typeof ApiErrorResponse>;
