import { describe, expect, it, vi, beforeEach } from "vitest";
import { action } from "./api.documents";

// Mock auth - always returns a valid session
vi.mock("~/utils/auth.server", () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ user: { id: "user-1", name: "Test", email: "test@test.com" } })
  ),
  getEnv: vi.fn(() => ({ DB: "mock-db" })),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
}));

// Mock DB
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn(() => []);
const mockInsert = vi.fn(() => ({
  values: vi.fn(() => ({
    returning: vi.fn(() => [{ id: "test-id-123", name: "test", content: "", isFolder: false }]),
  })),
}));
const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => [{ id: "doc-1", name: "updated", content: "hello" }]),
    })),
  })),
}));
const mockDelete = vi.fn(() => ({
  where: vi.fn(),
}));

vi.mock("~/utils/db.server", () => ({
  getDb: vi.fn(() => ({
    query: {
      document: {
        findFirst: mockFindFirst,
        findMany: mockFindMany,
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
}));

vi.mock("~/db/schema", () => ({
  document: {
    id: "id",
    userId: "user_id",
    parentId: "parent_id",
    name: "name",
    content: "content",
    isFolder: "is_folder",
    position: "position",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((...args: unknown[]) => ({ type: "desc", args })),
  asc: vi.fn((...args: unknown[]) => ({ type: "asc", args })),
  sql: vi.fn((...args: unknown[]) => ({ type: "sql", args })),
  isNull: vi.fn((...args: unknown[]) => ({ type: "isNull", args })),
}));

const mockContext = { cloudflare: { env: { DB: "mock-db" } } } as unknown as { cloudflare: { env: Env } };

function jsonRequest(method: string, url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(method: string, url: string, data: Record<string, string>) {
  const params = new URLSearchParams(data);
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
}

describe("api.documents action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ id: "doc-1", userId: "user-1" });
    mockFindMany.mockResolvedValue([]);
  });

  describe("POST - create document", () => {
    it("handles JSON body", async () => {
      const request = jsonRequest("POST", "http://localhost/api/documents", {
        name: "test.md",
        isFolder: false,
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(201);
      const data = await res.json() as { name: string };
      expect(data.name).toBe("test");
    });

    it("handles formData body", async () => {
      const request = formRequest("POST", "http://localhost/api/documents", {
        name: "test.md",
        isFolder: "false",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(201);
    });

    it("returns 400 if name missing (JSON)", async () => {
      const request = jsonRequest("POST", "http://localhost/api/documents", {
        isFolder: false,
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(400);
    });

    it("returns 400 if name missing (formData)", async () => {
      const request = formRequest("POST", "http://localhost/api/documents", {
        isFolder: "false",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH - update document", () => {
    it("handles JSON body (auto-save content)", async () => {
      const request = jsonRequest("PATCH", "http://localhost/api/documents?id=doc-1", {
        content: "# Hello World",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(200);
    });

    it("handles formData body (drag and drop)", async () => {
      const request = formRequest("PATCH", "http://localhost/api/documents?id=doc-1", {
        parentId: "folder-1",
        position: "32768",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(200);
    });

    it("returns 400 if no id", async () => {
      const request = jsonRequest("PATCH", "http://localhost/api/documents", {
        content: "test",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(400);
    });

    it("returns 404 if document not found", async () => {
      mockFindFirst.mockResolvedValue(null);
      const request = jsonRequest("PATCH", "http://localhost/api/documents?id=missing", {
        content: "test",
      });
      const res = await action({ request, context: mockContext });
      expect(res.status).toBe(404);
    });
  });
});
