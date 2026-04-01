import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentTree } from "./DocumentTree";
import type { DocRow } from "~/utils/documents";
import { docsToTree } from "~/utils/documents";

const mockSubmit = vi.fn();
vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: null }),
}));

vi.mock("lazy-tree-view", () => ({
  LazyTreeView: ({ initialTree, loadChildren, className }: { initialTree: any[]; loadChildren?: (branch: any) => Promise<any[]>; className?: string }) => (
    <div data-testid="tree" className={className}>
      {initialTree?.map((node: any) => (
        <div key={node.id} data-testid={`node-${node.name}`}>
          {node.name}
          {node.children && node.children.length > 0 && (
            <div data-testid={`children-of-${node.name}`}>
              {node.children.map((child: any) => (
                <div key={child.id} data-testid={`child-${child.name}`}>
                  {child.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {loadChildren && (
        <button
          data-testid="test-load-children"
          onClick={async () => {
            const branch = { id: "folder-1", name: "TestFolder" };
            const result = await loadChildren(branch);
            window.loadChildrenResult = result;
          }}
        >
          Test Load Children
        </button>
      )}
    </div>
  ),
  isBranchNode: (node: any) => !!node.children,
}));

vi.mock("~/utils/documents", () => ({
  docsToTree: vi.fn((docs: any[]) => {
    const rows = docs;
    const docMap = new Map();
    const roots: any[] = [];

    for (const doc of rows) {
      if (doc.isFolder) {
        docMap.set(doc.id, {
          id: doc.id,
          name: doc.name,
          children: [],
          isOpen: false,
          hasChildren: rows.some((r: any) => r.parentId === doc.id),
        });
      } else {
        docMap.set(doc.id, {
          id: doc.id,
          name: doc.name,
        });
      }
    }

    for (const doc of rows) {
      const node = docMap.get(doc.id);
      if (doc.parentId && docMap.has(doc.parentId)) {
        const parent = docMap.get(doc.parentId);
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }),
}));

const now = new Date();
const mockDocs: DocRow[] = [
  { id: "1", userId: "u1", parentId: null, name: "test.md", content: "hello", isFolder: false, position: null, createdAt: now, updatedAt: now },
  { id: "2", userId: "u1", parentId: null, name: "folder", content: "", isFolder: true, position: null, createdAt: now, updatedAt: now },
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
      { name: "New Doc", parentId: "", isFolder: "false" },
      { action: "/api/documents", encType: "application/x-www-form-urlencoded", method: "POST" },
    );
  });

  it("submits via fetcher when creating a folder", async () => {
    const user = userEvent.setup();
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);

    await user.click(screen.getByRole("button", { name: /folder/i }));

    expect(mockSubmit).toHaveBeenCalledWith(
      { name: "New Doc", parentId: "", isFolder: "true" },
      { action: "/api/documents", encType: "application/x-www-form-urlencoded", method: "POST" },
    );
  });

  it("loadChildren converts folders to BranchNodes with children, isOpen, hasChildren", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      json: () => Promise.resolve([
        { id: "folder-1", userId: "u1", parentId: "parent-1", name: "Subfolder", content: "", isFolder: true, position: 1, createdAt: now, updatedAt: now },
        { id: "doc-1", userId: "u1", parentId: "parent-1", name: "child.md", content: "content", isFolder: false, position: 2, createdAt: now, updatedAt: now },
      ]),
    })));

    render(<DocumentTree documents={mockDocs} selectedId={null} onSelect={() => {}} />);

    const testButton = screen.getByTestId("test-load-children");
    await userEvent.click(testButton);

    const result = (window as any).loadChildrenResult;
    expect(result).toBeDefined();
    expect(result).toHaveLength(2);

    const folderNode = result.find((n: any) => n.id === "folder-1");
    expect(folderNode).toBeDefined();
    expect(folderNode.children).toEqual([]);
    expect("isOpen" in folderNode).toBe(true);
    expect(folderNode.isOpen).toBe(false);

    const docNode = result.find((n: any) => n.id === "doc-1");
    expect(docNode).toBeDefined();
    expect("children" in docNode).toBe(false);
  });

  it("renders resize handle", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByTestId("resize-handle")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle")).toHaveAttribute("role", "separator");
    expect(screen.getByTestId("resize-handle")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("renders hierarchy guides by default", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);
    const container = document.querySelector("[data-tree-container]");
    expect(container).toHaveAttribute("data-show-guides", "true");
  });

  it("does not render hierarchy guides when disabled", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} showHierarchyGuides={false} />);
    const container = document.querySelector("[data-tree-container]");
    expect(container).toHaveAttribute("data-show-guides", "false");
  });

  it("applies default width", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} />);
    const container = screen.getByText(/no documents/i).closest(".relative");
    expect(container).toHaveStyle({ width: "256px" });
  });

  it("applies custom width props", () => {
    render(<DocumentTree documents={[]} selectedId={null} onSelect={() => {}} defaultWidth={300} minWidth={150} maxWidth={500} />);
    const container = screen.getByText(/no documents/i).closest(".relative");
    expect(container).toHaveStyle({ width: "300px", maxWidth: "500px" });
  });
});
