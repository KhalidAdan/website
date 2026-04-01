import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentTree } from "./DocumentTree";
import type { DocRow } from "~/utils/documents";

const mockSubmit = vi.fn();
vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: null }),
}));

vi.mock("lazy-tree-view", () => ({
  LazyTreeView: ({ initialTree }: { initialTree: any[] }) => (
    <div data-testid="tree">
      {initialTree?.map((node: any) => (
        <div key={node.id} data-testid={`node-${node.name}`}>
          {node.name}
        </div>
      ))}
    </div>
  ),
  isBranchNode: (node: any) => !!node.children,
}));

const now = new Date();
const mockDocs: DocRow[] = [
  { id: "1", userId: "u1", parentId: null, name: "test.md", content: "hello", isFolder: false, createdAt: now, updatedAt: now },
  { id: "2", userId: "u1", parentId: null, name: "folder", content: "", isFolder: true, createdAt: now, updatedAt: now },
];

describe("DocumentTree", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    vi.stubGlobal("prompt", vi.fn(() => "New Doc"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders empty state when no documents", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no documents/i)).toBeInTheDocument();
  });

  it("renders tree with documents", () => {
    render(<DocumentTree documents={mockDocs} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByTestId("node-test.md")).toBeInTheDocument();
    expect(screen.getByTestId("node-folder")).toBeInTheDocument();
  });

  it("shows doc and folder create buttons", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /doc/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /folder/i })).toBeInTheDocument();
  });

  it("submits via fetcher when creating a doc", async () => {
    const user = userEvent.setup();
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole("button", { name: /doc/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      { name: "New Doc", parentId: "", isFolder: false },
      expect.objectContaining({ method: "POST", action: "/api/documents" }),
    );
  });

  it("submits via fetcher when creating a folder", async () => {
    const user = userEvent.setup();
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole("button", { name: /folder/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      { name: "New Doc", parentId: "", isFolder: true },
      expect.objectContaining({ method: "POST", action: "/api/documents" }),
    );
  });
});
