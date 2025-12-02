# communication.bs.js

A TypeScript library for type-safe API communication with built-in error handling, schema validation, and Vue composables. Designed for modern web applications that require robust HTTP request handling with automatic response parsing and validation.

This library expects the API to follow a consistent error response format to leverage its full capabilities. The error responses should include fields such as `errorId`, `statusCode`, and an optional `debugMessage` to ensure seamless integration with the library's error handling mechanisms.
```json
{ 
    "errorId": "string",          // Unique identifier for the error type
    "statusCode": 400,            // HTTP status code associated with the error
    "debugMessage": "string"      // Optional detailed debug message for developers
}
```

![GitHub License](https://img.shields.io/github/license/DCC-BS/communication.bs.js) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev) [![NPM Version](https://img.shields.io/npm/v/%40dcc-bs%2Fcommunication.bs.js)](https://www.npmjs.com/package/@dcc-bs/audio-recorder.bs.js)


## Features

- **Type-Safe API Requests**: Full TypeScript support with type inference
- **Schema Validation**: Built-in Zod schema validation for API responses
- **Error Handling**: Standardized API error responses with custom error types
- **Streaming Support**: Handle streaming API responses with ease
- **Vue Composables**: Ready-to-use Vue 3 composables for reactive API calls
- **Multiple Response Types**: Support for JSON, text, and streaming responses
- **Abort Support**: Request cancellation with AbortController integration
- **FormData Support**: Automatic handling of multipart/form-data requests

## Technology Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Schema Validation**: [Zod](https://zod.dev/)
- **Framework Support**: [Vue 3](https://vuejs.org/) (optional)
- **Code Quality**: [Biome](https://biomejs.dev/)

## Installation

Install the package using your preferred package manager:

```bash
# Using bun
bun add @dcc-bs/communication.bs.js

# Using npm
npm install @dcc-bs/communication.bs.js

# Using pnpm
pnpm add @dcc-bs/communication.bs.js
```

## Usage

### Basic API Fetch

```typescript
import { apiFetch, isApiError } from '@dcc-bs/communication.bs.js';

// Simple API call
const response = await apiFetch<{ message: string }>('/api/hello');

// the resposne is of type { message: string } | ApiError
// the isApiError function is a type guard so we can narrow the type
if (isApiError(response)) {
  console.error('API Error:', response.errorId, response.statusCode);
} else {
  console.log('Success:', response.message);
}
```

### With Zod Schema Validation

```typescript
import { apiFetch } from '@dcc-bs/communication.bs.js';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
});

const response = await apiFetch('/api/user/1', {
  schema: UserSchema,
});

if (!isApiError(response)) {
  // response is fully typed as z.infer<typeof UserSchema>
  console.log(response.email);
}
```

### Vue Composables
The composables provide a reactive way similar to [`useFetch`](https://nuxt.com/docs/4.x/api/composables/use-fetch) to handle API requests in Vue 3 applications.

```typescript
import { useApiFetch, useApiFetchWithSchema } from '@dcc-bs/communication.bs.js';
import { z } from 'zod';

// Basic composable
const { data, error, pending } = useApiFetch<User>('/api/user/1');

// data is of type Ref<User | undefined>
// error is of type Ref<ApiErrorResponse | undefined>
// pending is of type Ref<boolean>

// With schema validation
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const { data, error, pending } = useApiFetchWithSchema('/api/user/1', {
  schema: UserSchema,
});
```

### Streaming API Responses

```typescript
import { apiStreamFetch } from '@dcc-bs/communication.bs.js';

const response = apiStreamFetch('/api/stream', {
    method: 'POST',
    body: { prompt: 'Generate text...' },
});

if(isApiError(response)) {
    throw new Error(response.debugMessage);
}

const reader = response.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, {
        stream: true,
    });
    console.log('Received chunk:', chunk);
}
```

### Fetch streaming responses with async iteration

```typescript
import { apiFetchMany, apiFetchTextMany } from '@dcc-bs/communication.bs.js';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Fetch multiple JSON endpoints
const results = await apiFetchMany("/api/users", 
{
    method: "GET",
    schema: z.array(UserSchema),
});

await for(const user of results) {
    console.log(user.id);
    console.log(user.name);
}

// Fetch multiple text endpoints
const textResults = await apiFetchTextMany("/api/content/1");

await for(const text of textResults) {
    console.log(text);
}
```

## Development

### Setup

Install dependencies:

```bash
bun install
```

### Testing

Run tests with Vitest:

```bash
# Run tests
bun run test
```

### Building

Build the library:

```bash
bun run build
```

This generates both ESM and UMD bundles in the `dist/` directory.

### Linting & Formatting

Check and fix code issues with Biome:

```bash
bun run check
```

## Project Structure

```
src/
├── apiFetch.ts              # Core API fetch functions
├── index.ts                 # Main entry point
├── composables/             # Vue composables
│   ├── apiFetch.composable.ts
│   └── useApiFetchWithSchema.ts
└── models/                  # TypeScript models
    ├── api_error.ts
    ├── api_error_response.ts
    └── api_fetch_options.ts
tests/                       # Test files
├── apiFetch.test.ts
├── apiFetchTextMany.test.ts
├── apiStreamFetch.test.ts
└── isApiError.test.ts
```

## Error Handling

The library provides standardized error handling with predefined error types:

- `unexpected_error`: Unexpected API response format
- `fetch_failed`: Network or fetch operation failure
- `request_aborted`: Request was cancelled via AbortController

All errors follow the `ApiError` structure with:
- `errorId`: Unique error identifier
- `statusCode`: HTTP status code
- `debugMessage`: Optional debug information

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt

<a href="https://www.bs.ch/schwerpunkte/daten/databs/schwerpunkte/datenwissenschaften-und-ki"><img src="https://github.com/DCC-BS/.github/blob/main/_imgs/databs_log.png?raw=true" alt="DCC Logo" width="200" /></a>

Datenwissenschaften und KI <br>
Developed with ❤️ by DCC - Data Competence Center
