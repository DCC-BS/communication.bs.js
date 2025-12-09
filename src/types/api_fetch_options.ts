import type { ZodType } from "zod";

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
    body?: object | FormData;
};

export type ApiFetchOptionsWithSchema<T extends ZodType> = ApiFetchOptions & {
    schema: T;
};
