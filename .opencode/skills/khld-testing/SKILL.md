---
name: khld-testing
description: Testing guide for khld.md - Vitest + Playwright
---

# khld-testing

## Philosophy

Tests should resemble how users interact with the application. Write tests that mirror real user workflows - what they click, what they type, what they see. Avoid testing implementation details.

**Make assertions specific** - Be explicit about what's being tested. Instead of vague assertions, use specific, meaningful checks that clearly communicate expected behavior.

```typescript
// ✅ Good - Specific assertions user would understand
await expect(page.getByText(/email is required/i)).toBeVisible()

// ❌ Avoid - Vague assertions
expect(page.locator('.error')).toBeVisible()
```

## When to use this skill

Use this skill when you need to:

- Write unit tests for hooks, utils, components
- Write E2E smoke tests (does page render correctly)
- Write E2E critical path tests (auth flows, editor interactions)
- Configure test environment (vitest, playwright, mocks)

## Test File Locations

- **Unit specs**: `app/**/*.spec.ts` (inline alongside source)
- **E2E tests**: `tests/e2e/*.spec.ts`

Use `*.spec.ts` naming (not `*.test.ts`) per project convention.

## Project Structure

```
app/
├── hooks/
│   ├── useAutoSave.ts
│   ├── useAutoSave.spec.ts      # vitest - test exported functions
│   ├── useTheme.tsx
│   ├── useTheme.spec.tsx        # vitest + rtl - test ThemeProvider
│   ├── useSaveToDisk.ts
│   └── useSaveToDisk.spec.ts    # vitest - test keyboard handler
├── utils/
│   ├── auth.client.ts
│   ├── auth.client.spec.ts      # vitest - mock better-auth
│   ├── auth.server.ts
│   ├── auth.server.spec.ts      # vitest - test loaders/actions
│   ├── db.server.ts
│   └── db.server.spec.ts        # vitest - test DB queries
├── components/
│   ├── MilkdownEditor.tsx
│   └── MilkdownEditor.spec.tsx  # vitest - mock Crepe editor
├── routes/
│   ├── home.tsx
│   ├── home.spec.tsx            # vitest + rtl
│   ├── login.tsx
│   ├── login.spec.tsx           # vitest + rtl - form tests
│   ├── signup.tsx
│   ├── signup.spec.tsx          # vitest + rtl - form tests
│   ├── md.tsx
│   ├── md.spec.tsx              # vitest + rtl - editor tests
│   └── logout.tsx
tests/
├── e2e/
│   ├── smoke.spec.ts            # playwright - all routes render
│   ├── auth.spec.ts             # playwright - login/signup flows
│   └── editor.spec.ts           # playwright - editor interactions
├── setup/
│   ├── vitest-setup.ts          # @testing-library/jest-dom setup
│   └── mocks/
│       ├── idb-keyval.ts        # mock for IndexedDB
│       ├── better-auth.ts       # mock for auth client
│       ├── localStorage.ts      # mock for theme storage
│       └── FileSystemAccess.ts  # mock for File System API
└── playwright.config.ts
```

## Dependencies

Install these dev dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

## Configuration

### vite.config.ts

Add test configuration:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  // ... existing config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    include: ['**/*.spec.ts', '**/*.spec.tsx'],
  },
})
```

### tests/setup/vitest-setup.ts

```typescript
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import localStorageMock from './mocks/localStorage'

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock(),
})

// Mock IndexedDB
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}))
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

### package.json scripts

```json
"test": "vitest",
"test:run": "vitest run",
"test:watch": "vitest --watch",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

## Mock Strategy

| Dependency | Mock Location | Implementation |
|------------|---------------|-----------------|
| `idb-keyval` | `tests/setup/mocks/idb-keyval.ts` | In-memory Map for get/set |
| `better-auth` | `tests/setup/mocks/better-auth.ts` | Mock authClient with vi.fn() |
| `localStorage` | `tests/setup/mocks/localStorage.ts` | MockStorage class |
| File System Access API | `tests/setup/mocks/FileSystemAccess.ts` | Mock showSaveFilePicker |
| Database | D1 test database | Separate TEST_DB binding |

## Database Setup

### wrangler.toml

Add test database:

```toml
[[d1_databases]]
binding = "TEST_DB"
database_name = "khld-md-test"
```

### Test database usage

```typescript
// In tests that need DB
import { getDb } from '~/utils/db.server'

const testDb = getDb(env.TEST_DB)
```

## API Changes for Testability

Some files need refactoring to be testable:

### useAutoSave.ts

Export pure functions separately from the hook:

```typescript
// Current: only exports hook
// Needed: export loadSavedContent, loadSavedMode, saveMode as separate functions

export async function loadSavedContent(): Promise<string | null>
export async function loadSavedMode(): Promise<"raw" | "md">
export function saveMode(mode: "raw" | "md"): void
export function useAutoSave(content: string, delay?: number)
```

### auth.server.ts

Extract auth creation for testability:

```typescript
// Current: createAuth called in each loader
// Needed: export createAuth so it can be mocked in tests
export { createAuth } from 'better-auth'
export function getEnv(context: { cloudflare: { env: Env } }): Env
export async function getSession(request: Request, env: Env)
export async function requireSession(request: Request, env: Env)
```

### MilkdownEditor.tsx

Allow dependency injection for editor factory:

```typescript
// Current: hardcoded Crepe initialization
// Needed: allow passing editorFactory prop for testing

interface Props {
  defaultValue: string
  onChange?: (markdown: string) => void
  readonly?: boolean
  className?: string
  editorFactory?: () => Promise<Crepe>  // for testing
}
```

## Test Patterns by File Type

### Hooks (app/hooks/*.spec.ts)

Export pure functions separately, test them with standard vitest:

```typescript
// app/hooks/useAutoSave.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { loadSavedContent, loadSavedMode, saveMode } from './useAutoSave'

vi.mock('idb-keyval')

describe('loadSavedContent', () => {
  it('returns null when nothing stored', async () => {
    const result = await loadSavedContent()
    expect(result).toBeNull()
  })
})
```

### Utils (app/utils/*.spec.ts)

Test synchronous functions directly, mock external deps:

```typescript
// app/utils/auth.client.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { authClient } from './auth.client'

vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  })),
}))
```

### Routes (app/routes/*.spec.tsx)

Use @testing-library/react for component tests:

```typescript
// app/routes/login.spec.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from './login'

describe('Login', () => {
  it('renders email and password inputs', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
  })

  it('shows error on failed submission', async () => {
    // ... test error display
  })
})
```

### E2E (tests/e2e/*.spec.ts)

Use Playwright, test user workflows:

```typescript
// tests/e2e/auth.spec.ts
import { expect, test } from '@playwright/test'

test('user can log in', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholderText(/email/i).fill('test@example.com')
  await page.getByPlaceholderText(/password/i).fill('password123')
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page).toHaveURL('/md')
})
```

## Test Coverage Matrix

| Area | Unit | E2E Smoke | E2E Critical |
|------|------|-----------|--------------|
| Home page | - | ✓ | - |
| Login form | ✓ | ✓ | ✓ |
| Signup form | ✓ | ✓ | ✓ |
| Auth flow (login) | - | - | ✓ |
| Auth flow (signup) | - | - | ✓ |
| Auth flow (logout) | - | - | ✓ |
| Theme toggle | ✓ | ✓ | - |
| Editor raw mode | ✓ | ✓ | - |
| Editor preview mode | ✓ | - | - |
| Auto-save | ✓ | - | ✓ |
| Save to disk | ✓ | - | - |
| Word count | ✓ | ✓ | - |

## Common Mistakes to Avoid

- ❌ **Testing implementation instead of user behavior** - Write tests that mirror how users use the app
- ❌ **Vague assertions** - Use specific, meaningful assertions
- ❌ **Hardcoding test data** - Use consistent but distinct test values
- ❌ **Not waiting for elements** - Use `expect(locator).toBeVisible()` instead of assuming existence
- ❌ **Skipping error cases** - Test both happy path and error states
- ❌ **Not mocking external deps** - Always mock `idb-keyval`, `better-auth`, etc.
- ❌ **E2E without test DB** - Use separate D1 test database for E2E tests

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Epic Stack Testing](https://github.com/epicweb-dev/epic-stack/blob/main/docs/skills/epic-testing/SKILL.md) - Inspiration for this guide
