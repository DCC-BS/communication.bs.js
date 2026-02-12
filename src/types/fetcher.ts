import type { ApiFetchOptions } from "./api_fetch_options";

export type Fetcher = (
    url: string,
    options: ApiFetchOptions,
) => Promise<Response>;
