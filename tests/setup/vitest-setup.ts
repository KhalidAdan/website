import "@testing-library/jest-dom/vitest";
import { vi, beforeEach } from "vitest";

/** Creates a functional localStorage/sessionStorage mock backed by a Map. */
function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    _store: store,
  };
}

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

beforeEach(() => {
  localStorageMock._store.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock._store.clear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

Object.defineProperty(document, "visibilityState", {
  value: "visible",
  writable: true,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

let cookieStore = new Map<string, string>();
Object.defineProperty(document, "cookie", {
  get: () => {
    const cookies: string[] = [];
    cookieStore.forEach((value, key) => {
      cookies.push(`${key}=${value}`);
    });
    return cookies.join("; ");
  },
  set: (cookie: string) => {
    const [keyValue] = cookie.split(";");
    if (!keyValue) return;
    const [key, value] = keyValue.split("=");
    if (!key || !value) return;
    cookieStore.set(key.trim(), value.trim());
  },
  configurable: true,
});

beforeEach(() => {
  cookieStore.clear();
});

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    useSession: vi.fn(),
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
  })),
}));