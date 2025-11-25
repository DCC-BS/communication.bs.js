# communication.bs.js

A TypeScript library for type-safe API communication with built-in error handling, schema validation, and Vue composables. Designed for modern web applications that require robust HTTP request handling with automatic response parsing and validation.

![GitHub License](https://img.shields.io/github/license/DCC-BS/communication.bs.js) [![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev) ![NPM Version](https://img.shields.io/npm/v/%40dcc-bs%2Fcommunication.bs.js)


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
  email: z.string().email(),
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

```typescript
import { useApiFetch, useApiFetchWithSchema } from '@dcc-bs/communication.bs.js';
import { z } from 'zod';

// Basic composable
const { data, error, pending } = useApiFetch<User>('/api/user/1');

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

for await (const chunk of apiStreamFetch('/api/stream', {
  method: 'POST',
  body: { prompt: 'Generate text...' },
})) {
  console.log('Received:', chunk);
}
```

### Multiple Requests

```typescript
import { apiFetchMany, apiFetchTextMany } from '@dcc-bs/communication.bs.js';

// Fetch multiple JSON endpoints
const results = await apiFetchMany([
  { url: '/api/users' },
  { url: '/api/posts' },
]);

// Fetch multiple text endpoints
const textResults = await apiFetchTextMany([
  { url: '/api/content/1' },
  { url: '/api/content/2' },
]);
```

## API Reference

### Core Functions

#### `apiFetch<T>(url: string, options?: ApiFetchOptions): Promise<ApiResponse<T>>`

Main function for making API requests with type safety.

**Options:**
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `body`: Request body (JSON object or FormData)
- `headers`: Custom headers
- `signal`: AbortController signal
- `schema`: Zod schema for response validation

#### `apiFetchMany(requests: ApiFetchOptions[]): Promise<ApiResponse<unknown>[]>`

Execute multiple API requests in parallel.

#### `apiFetchTextMany(requests: ApiFetchOptions[]): Promise<(string | ApiError)[]>`

Execute multiple text-based API requests in parallel.

#### `apiStreamFetch(url: string, options?: ApiFetchOptions): AsyncGenerator<string>`

Handle streaming API responses with async iteration.

#### `isApiError(response: unknown): response is ApiError`

Type guard to check if a response is an API error.

### Types

#### `ApiError`

```typescript
class ApiError {
  errorId: string;
  statusCode: number;
  debugMessage?: string;
  $type: 'ApiError';
}
```

#### `ApiFetchOptions`

```typescript
interface ApiFetchOptions {
  method?: string;
  body?: unknown | FormData;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}
```

#### `ApiFetchOptionsWithSchema<T extends ZodType>`

Extends `ApiFetchOptions` with required schema property for validation.

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
bun test

# Run tests in watch mode
bun test:watch

# Generate coverage report
bun test:coverage
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
