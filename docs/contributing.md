# Contributing

## Project Layout

Place changes in the layer that owns the responsibility (see the [Directory Map](architecture.md#directory-map) for full paths):

- **Routes & Server Actions**: `src/app/` (`(public)` for reader/landing routes, `(admin)` for authenticated management routes, `actions/` and `api/` for shared handlers)
- **UI Components & Hooks**: `src/components/` and `src/hooks/`
- **Business Logic & Storage**: `src/lib/services/` and `src/lib/repositories/`
- **Validation, Guards & Errors**: `src/lib/validators/`, `src/lib/guards/`, and `src/lib/errors/`

## Code Standards

### TypeScript Strict Mode

`tsconfig.json` enables `"strict": true` with `@/*` mapped to `./src/*`. All new code must compile without `any` escapes or implicit types.

### Error Handling

Use the typed error classes in `src/lib/errors/AppError.ts` (`AppError`, `DatabaseError`, `ValidationError`, `StorageError`, `ProcessingError`, `AuthenticationError`) and `ErrorHandler` in `src/lib/errors/errorHandler.ts` so Server Actions and services return discriminated `Result<T, E>` responses (`{ success: true, data }` or `{ success: false, error }`) with cataloged error codes and user-facing Turkish messages.

### Structured Logging

Use the `logger` singleton from `src/lib/services/Logger.ts` instead of `console.log`. `Logger`:

- Automatically redacts PII field names (`password`, `token`, `secret`, `apiKey`, `url`, `userAgent`, etc.) and regex patterns (emails, phone numbers, SSNs, card numbers)
- Prints colored structured output to the console in `development` and `test`
- Sends `ERROR` logs and slow operations (`> 1000ms` via `logger.startTimer()` / `logger.logPerformance()`) to Sentry in `production`

### Validation, Type Guards, and Security

- **Zod Schemas**: Validate all Server Action inputs and `FormData` payloads using schemas in `src/lib/validators/` and `parseFormDataWithZod` (`src/lib/validators/formDataParser.ts`).
- **Runtime Type Guards**: Use guards in `src/lib/guards/` when checking untrusted objects at system boundaries.
- **Admin Mutations**: Protect admin Server Actions with `requireAdmin()` (`src/lib/services/authorization.ts`) and `verifyCSRFOrigin()`.

## Verification Checks

Run all verification checks before opening a pull request:

```bash
pnpm test
pnpm lint
pnpm type-check
```

- `pnpm test` runs `tsx --test` against unit tests in `src/lib/utils/__tests__/*.test.ts` and `src/lib/audio/__tests__/*.test.ts`.
- `pnpm lint` runs ESLint (`next/core-web-vitals`, `next/typescript`).
- `pnpm type-check` runs `tsc --noEmit`. Because `tsconfig.json` includes `.next/types/**/*.ts`, stale generated files in `.next/types/` after route changes can fail `tsc`; if that happens, remove `.next` and run `pnpm build` before re-running `pnpm type-check`.

See [Available Scripts](setup.md#available-scripts) for bundle analysis commands (`pnpm analyze*`).

## Pull Request Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/short-description
   ```
2. Keep changes scoped to the issue and add unit tests for new utilities or state logic.
3. Run `pnpm test`, `pnpm lint`, and `pnpm type-check`.
4. Commit with a concise description of what changed and why, push to your fork, and open a Pull Request.
