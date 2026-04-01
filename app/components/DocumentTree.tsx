import { useCallback, useRef } from "react";
import { useFetcher } from "react-router";
import { LazyTreeView, type TreeNode, type BranchNode, isBranchNode, type LazyTreeViewHandle } from "lazy-tree-view";
import { FolderIcon, FileText, ChevronRight, ChevronDown, FilePlus, FolderPlus } from "lucide-react";
import { docsToTree, type DocRow } from "~/utils/documents";

interface Props {
  documents: DocRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DocumentTree({ documents, selectedId, onSelect }: Props) {
  const tree = docsToTree(documents);
  const treeRef = useRef<LazyTreeViewHandle>(null);
  const fetcher = useFetcher();

  const handleSelect = useCallback(
    (node: TreeNode) => {
      if (!isBranchNode(node)) {
        onSelect(node.id);
      }
    },
    [onSelect],
  );

  const handleCreateDoc = async (parentId: string | null = null) => {
    const name = prompt("Document name:");
    if (!name) return;
    fetcher.submit(
      { name, parentId: parentId ?? "", isFolder: false },
      { method: "POST", action: "/api/documents", encType: "application/json" },
    );
  };

  const handleCreateFolder = async (parentId: string | null = null) => {
    const name = prompt("Folder name:");
    if (!name) return;
    fetcher.submit(
      { name, parentId: parentId ?? "", isFolder: true },
      { method: "POST", action: "/api/documents", encType: "application/json" },
    );
  };

  if (fetcher.state !== "idle") {
    // Show subtle loading state while mutation is in-flight
  }

  const renderItem = (node: TreeNode) => {
    const isSelected = node.id === selectedId;
    return (
      <button
        onClick={() => handleSelect(node)}
        className={`flex items-center gap-2 w-full px-2 py-1 text-left text-sm rounded transition-colors ${
          isSelected
            ? "bg-black/10 dark:bg-white/10"
            : "hover:bg-black/5 dark:hover:bg-white/5"
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  };

  const renderBranch = (node: BranchNode) => {
    const isSelected = node.id === selectedId;
    return (
      <div className="flex items-center">
        <button
          onClick={() => handleSelect(node)}
          className={`flex items-center gap-2 px-2 py-1 text-sm rounded transition-colors ${
            isSelected
              ? "bg-black/10 dark:bg-white/10"
              : "hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          {node.isOpen ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
          <FolderIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2">
        <button
          onClick={() => handleCreateDoc(null)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
        >
          <FilePlus className="w-3 h-3" />
          doc
        </button>
        <button
          onClick={() => handleCreateFolder(null)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
        >
          <FolderPlus className="w-3 h-3" />
          folder
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {tree.length === 0 ? (
          <p className="text-xs text-gray-500 p-2">No documents yet</p>
        ) : (
          <LazyTreeView
            ref={treeRef}
            initialTree={tree}
            loadChildren={async () => []}
            branch={renderBranch}
            item={renderItem}
          />
        )}
      </div>
    </div>
  );
}
