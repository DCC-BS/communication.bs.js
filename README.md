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

![GitHub License](https://img.shields.io/github/license/DCC-BS/communication.bs.js)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?style=flat&logo=biome)](https://biomejs.dev)
[![NPM Version](https://img.shields.io/npm/v/%40dcc-bs%2Fcommunication.bs.js)](https://www.npmjs.com/package/@dcc-bs/communication.bs.js)


## Features

- **Type-Safe API Requests**: Full TypeScript support with type inference and overloaded function signatures
- **Factory Pattern**: Create multiple API clients with different configurations
- **Schema Validation**: Built-in Zod schema validation for API responses
- **Advanced Configuration**: Flexible fetcher builder with extensive configuration options
- **Error Handling**: Standardized API error responses with custom error types
- **Streaming Support**: Handle streaming API responses with ease including async iteration
- **Vue Composables**: Ready-to-use Vue 3 composables for reactive API calls
- **Multiple Response Types**: Support for JSON, text, and streaming responses
- **Request Hooks**: Intercept and modify requests with beforeRequest, afterResponse, and onError hooks
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Request Deduplication**: Prevent duplicate simultaneous requests automatically
- **Timeout Management**: Set request timeouts with automatic abort
- **Authentication**: Built-in support for Bearer tokens and Basic authentication
- **Abort Support**: Request cancellation with AbortController integration
- **FormData Support**: Automatic handling of multipart/form-data requests
- **Debug Mode**: Optional request/response logging for development

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

## Quick Start

### Simple Usage (Recommended for most cases)

The library provides ready-to-use functions for immediate use:

```typescript
import { apiFetch, isApiError } from '@dcc-bs/communication.bs.js';

// Simple API call
const response = await apiFetch<{ message: string }>('/api/hello');

if (isApiError(response)) {
  console.error('Error:', response.errorId);
} else {
  console.log(response.message); // Fully typed!
}
```

### Advanced Usage with Factory Pattern

For advanced configuration, create custom API clients:

```typescript
import { createApiClient, createFetcherBuilder } from '@dcc-bs/communication.bs.js';

// Create a custom fetcher with configuration
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .addHeader('X-API-Key', 'your-api-key')
  .setRequestTimeout(5000)
  .setRetries(3)
  .enableDebug()
  .build();

// Create an API client with the custom fetcher
const apiClient = createApiClient(fetcher);

// Use the client
const user = await apiClient.apiFetch('/users/1');
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

## Advanced Configuration

The `createFetcherBuilder()` function provides a fluent API for configuring custom HTTP clients with advanced features.

### Base URL and Headers

```typescript
import { createFetcherBuilder, createApiClient } from '@dcc-bs/communication.bs.js';

const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com/v1')
  .addHeader('X-API-Key', 'your-api-key')
  .addHeader('X-Custom-Header', 'value')
  .build();

const client = createApiClient(fetcher);

// Now all requests use the base URL and headers
const user = await client.apiFetch('/users/1'); // GET https://api.example.com/v1/users/1
```

### Authentication

```typescript
// Bearer Token Authentication
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .setAuth({
    type: 'bearer',
    token: 'your-jwt-token'
  })
  .build();

// Basic Authentication
const fetcher = createFetcherBuilder()
  .setAuth({
    type: 'basic',
    username: 'user',
    password: 'pass'
  })
  .build();
```

### Retries and Timeouts

```typescript
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .setRequestTimeout(5000) // 5 second timeout
  .setRetries({
    maxRetries: 3,
    retryDelay: 1000, // Initial delay in ms
    retryOn: [500, 502, 503, 504], // Retry on these status codes
    shouldRetry: (response) => !response.ok && response.status >= 500
  })
  .build();
```

### Request/Response Hooks

```typescript
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .setBeforeRequest((url, options) => {
    // Modify request before sending
    console.log(`Sending request to: ${url}`);
    options.headers = {
      ...options.headers,
      'X-Request-Time': new Date().toISOString()
    };
    return { url, options };
  })
  .setAfterResponse((response) => {
    // Process response after receiving
    console.log(`Received response with status: ${response.status}`);
    return response;
  })
  .setOnError((error) => {
    // Handle errors globally
    console.error('Request failed:', error);
    return error;
  })
  .build();
```

### Query Parameters and CORS

```typescript
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .setQueryParams({ version: '1.0', format: 'json' })
  .setCredentials('include') // 'omit' | 'same-origin' | 'include'
  .setMode('cors') // 'cors' | 'no-cors' | 'same-origin'
  .setCache('no-cache') // any valid RequestCache value
  .build();
```

### Request Deduplication

Prevent duplicate simultaneous requests to the same endpoint:

```typescript
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .enableDeduplication()
  .build();

const client = createApiClient(fetcher);

// These three simultaneous requests will only trigger one actual HTTP request
const [user1, user2, user3] = await Promise.all([
  client.apiFetch('/users/1'),
  client.apiFetch('/users/1'),
  client.apiFetch('/users/1')
]);
```

### Debug Mode

Enable detailed logging for development:

```typescript
const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com')
  .enableDebug() // Logs all requests and responses
  .build();
```

### Complete Example

```typescript
import { createFetcherBuilder, createApiClient } from '@dcc-bs/communication.bs.js';

const fetcher = createFetcherBuilder()
  .setBaseURL('https://api.example.com/v1')
  .setAuth({ type: 'bearer', token: process.env.API_TOKEN })
  .addHeader('X-App-Version', '1.0.0')
  .setRequestTimeout(10000)
  .setRetries({ maxRetries: 3, retryDelay: 1000 })
  .setBeforeRequest((url, options) => {
    console.log(`→ ${options.method || 'GET'} ${url}`);
    return { url, options };
  })
  .setAfterResponse((response) => {
    console.log(`← ${response.status} ${response.url}`);
    return response;
  })
  .enableDeduplication()
  .enableDebug()
  .build();

const apiClient = createApiClient(fetcher);

export { apiClient };
```

## Framework Integration

### Nuxt 3 Plugin

Create a Nuxt plugin to provide the API client throughout your application:

**`plugins/api.ts`**:
```typescript
import { createFetcherBuilder, createApiClient } from '@dcc-bs/communication.bs.js';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  
  // Create a configured fetcher
  const fetcher = createFetcherBuilder()
    .setBaseURL(config.public.apiBaseUrl)
    .setAuth({
      type: 'bearer',
      token: config.public.apiToken
    })
    .setRequestTimeout(10000)
    .setRetries({ maxRetries: 2, retryDelay: 1000 })
    .enableDebug()
    .build();

  // Create the API client
  const apiClient = createApiClient(fetcher);

  // Provide the client to the app
  return {
    provide: {
      api: apiClient
    }
  };
});
```

**Usage in pages/components**:
```vue
<script setup lang="ts">
import { z } from 'zod';

const { $api } = useNuxtApp();

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
});

// Use the provided API client
const response = await $api.apiFetch('/users/1', {
  schema: UserSchema
});

if (!isApiError(response)) {
  console.log(response.name); // Fully typed!
}
</script>
```

**Creating composables with the API client**:
```typescript
// composables/useUser.ts
export const useUser = (userId: number) => {
  const { $api } = useNuxtApp();
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchUser = async () => {
    loading.value = true;
    const response = await $api.apiFetch(`/users/${userId}`);
    
    if (isApiError(response)) {
      error.value = response;
    } else {
      user.value = response;
    }
    loading.value = false;
  };

  onMounted(() => fetchUser());

  return { user, loading, error, refetch: fetchUser };
};
```

### Vue 3 Plugin

Create a Vue 3 plugin for non-Nuxt applications:

**`plugins/api.ts`**:
```typescript
import { createFetcherBuilder, createApiClient } from '@dcc-bs/communication.bs.js';
import type { App } from 'vue';

export const apiPlugin = {
  install(app: App) {
    const fetcher = createFetcherBuilder()
      .setBaseURL(import.meta.env.VITE_API_BASE_URL)
      .setAuth({
        type: 'bearer',
        token: import.meta.env.VITE_API_TOKEN
      })
      .enableDebug()
      .build();

    const apiClient = createApiClient(fetcher);

    // Provide globally
    app.provide('api', apiClient);
    
    // Also add to global properties for Options API
    app.config.globalProperties.$api = apiClient;
  }
};
```

**Register in main.ts**:
```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { apiPlugin } from './plugins/api';

const app = createApp(App);
app.use(apiPlugin);
app.mount('#app');
```

**Usage in components**:
```vue
<script setup lang="ts">
import { inject } from 'vue';
import type { ApiClient } from '@dcc-bs/communication.bs.js';

const api = inject<ApiClient>('api');

const loadData = async () => {
  const response = await api.apiFetch('/data');
  // Handle response...
};
</script>
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
├── apiFetch.ts              # Default API fetch function exports
├── apiFetchFactory.ts       # API client factory
├── apiFetchUtils.ts         # Utility functions (isApiError, error extraction)
├── fetcherFactory.ts        # Fetcher builder with advanced configuration
├── index.ts                 # Main entry point
├── composables/             # Vue composables
│   ├── apiFetch.composable.ts
│   └── useApiFetchWithSchema.ts
├── types/                   # TypeScript type definitions
│   ├── api_client.ts        # ApiClient, ApiFetchFunction, ApiResponse types
│   ├── api_error.ts         # ApiError class
│   ├── api_error_response.ts
│   ├── api_fetch_options.ts # Request options interfaces
│   ├── auth.ts              # Authentication configuration types
│   ├── fetcher.ts           # Fetcher function type
│   ├── fetcher_builder_options.ts
│   └── hooks.ts             # Hook function types
└── utils/                   # Utility modules
tests/                       # Test files
├── apiFetch.test.ts
├── apiFetchFactory.test.ts
├── apiFetchTextMany.test.ts
├── apiFetchUtils.test.ts
├── apiStreamFetch.test.ts
├── fetcherFactory.test.ts
├── integration.test.ts
└── isApiError.test.ts
```

## Error Handling

The library provides standardized error handling with predefined error types:

- `unexpected_error`: Unexpected API response format
- `fetch_failed`: Network or fetch operation failure
- `request_aborted`: Request was cancelled via AbortController
- `schema_validation_failed`: Response data doesn't match the provided Zod schema

All errors follow the `ApiError` structure with:
- `errorId`: Unique error identifier
- `statusCode`: HTTP status code
- `debugMessage`: Optional debug information

### Type Guard

Use the `isApiError()` function to check if a response is an error:

```typescript
import { apiFetch, isApiError } from '@dcc-bs/communication.bs.js';

const response = await apiFetch('/api/data');

if (isApiError(response)) {
  // response is ApiError
  console.error(`Error ${response.errorId}: ${response.debugMessage}`);
  console.error(`Status: ${response.statusCode}`);
} else {
  // response is your data type
  console.log(response);
}
```

## API Reference

### Core Types

#### `ApiClient`
The main client interface returned by `createApiClient()`:

```typescript
interface ApiClient {
  apiFetch: ApiFetchFunction;
  apiStreamFetch: (url: string, options?: ApiFetchOptions) => Promise<ApiResponse<ReadableStream<Uint8Array>>>;
  apiFetchTextMany: (url: string, options?: ApiFetchOptions) => AsyncGenerator<string, void, void>;
  apiFetchMany: <T extends ZodType>(url: string, options: ApiFetchOptionsWithSchema<T>) => AsyncGenerator<z.infer<T>, void, void>;
}
```

#### `ApiFetchFunction`
Overloaded function type for type-safe API requests:

```typescript
interface ApiFetchFunction {
  // With schema validation
  <T extends ZodType>(url: string, options: ApiFetchOptionsWithSchema<T>): Promise<ApiResponse<z.infer<T>>>;
  // Without schema validation
  <T extends object>(url: string, options?: ApiFetchOptions): Promise<ApiResponse<T>>;
}
```

#### `ApiResponse<T>`
Union type representing either success data or an error:

```typescript
type ApiResponse<T> = T | ApiError;
```

#### `ApiError`
Error class with structured error information:

```typescript
class ApiError {
  errorId: string;
  statusCode: number;
  debugMessage?: string;
}
```

### Factory Functions

#### `createApiClient(fetcher?: Fetcher): ApiClient`
Creates a new API client instance with an optional custom fetcher.

#### `createFetcherBuilder(): FetcherBuilder`
Creates a new fetcher builder for configuring custom HTTP clients. Returns a builder with chainable configuration methods:

- `.setBaseURL(url: string)` - Set base URL for all requests
- `.addHeader(key: string, value: string)` - Add custom header
- `.setAuth(config: AuthConfig)` - Configure authentication
- `.setRequestTimeout(ms: number)` - Set request timeout
- `.setRetries(config: RetryConfig)` - Configure retry logic
- `.setBeforeRequest(hook: BeforeRequestHook)` - Add pre-request hook
- `.setAfterResponse(hook: AfterResponseHook)` - Add post-response hook
- `.setOnError(hook: OnErrorHook)` - Add error handler hook
- `.setQueryParams(params: Record<string, string>)` - Set default query parameters
- `.setCredentials(mode: RequestCredentials)` - Set credentials mode
- `.setMode(mode: RequestMode)` - Set CORS mode
- `.setCache(cache: RequestCache)` - Set cache strategy
- `.enableDebug()` - Enable debug logging
- `.enableDeduplication()` - Enable request deduplication
- `.build(): Fetcher` - Build and return the configured fetcher

### Utility Functions

#### `isApiError(response: unknown): response is ApiError`
Type guard to check if a response is an ApiError.

### Exported Types

```typescript
// From '@dcc-bs/communication.bs.js'
export type { ApiClient } from './types/api_client';
export type { ApiFetchFunction } from './types/api_client';
export type { ApiResponse } from './types/api_client';
export type { ApiError } from './types/api_error';
export type { ApiErrorResponse } from './types/api_error_response';
export type { ApiFetchOptions, ApiFetchOptionsWithSchema } from './types/api_fetch_options';
export type { AuthConfig } from './types/auth';
export type { Fetcher } from './types/fetcher';
export type { FetcherBuilderOptions } from './types/fetcher_builder_options';
export type { BeforeRequestHook, AfterResponseHook, OnErrorHook } from './types/hooks';
```

## License

[MIT](LICENSE) © Data Competence Center Basel-Stadt

<a href="https://www.bs.ch/schwerpunkte/daten/databs/schwerpunkte/datenwissenschaften-und-ki"><img src="https://github.com/DCC-BS/.github/blob/main/_imgs/databs_log.png?raw=true" alt="DCC Logo" width="200" /></a>

Datenwissenschaften und KI <br>
Developed with ❤️ by DCC - Data Competence Center
