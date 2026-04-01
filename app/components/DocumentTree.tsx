import { useCallback, useRef } from "react";
import { useFetcher } from "react-router";
import { LazyTreeView, type TreeNode, type BranchNode, isBranchNode, type LazyTreeViewHandle, type BranchProps } from "lazy-tree-view";
import { FolderIcon, FileText, ChevronRight, ChevronDown, FilePlus, FolderPlus, Loader2 } from "lucide-react";
import { docsToTree, type DocRow } from "~/utils/documents";
import { calculatePosition, getSiblings } from "~/utils/position";

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
      { name, parentId: parentId ?? "", isFolder: "false" },
      { method: "POST", action: "/api/documents", encType: "application/x-www-form-urlencoded" },
    );
  };

  const handleCreateFolder = async (parentId: string | null = null) => {
    const name = prompt("Folder name:");
    if (!name) return;
    fetcher.submit(
      { name, parentId: parentId ?? "", isFolder: "true" },
      { method: "POST", action: "/api/documents", encType: "application/x-www-form-urlencoded" },
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

  const renderBranch = (node: BranchProps) => {
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
          <span
            onClick={(e) => {
              e.stopPropagation();
              node.onToggleOpen(e);
            }}
            className="cursor-pointer"
          >
            {node.isLoading ? (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            ) : node.isOpen ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </span>
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
            loadChildren={async (branch) => {
              const res = await fetch(`/api/documents?parentId=${branch.id}`);
              return res.json();
            }}
            branch={renderBranch}
            item={renderItem}
            allowDragAndDrop
            onDrop={(data) => {
              const sourceId = data.source.id;
              const targetId = data.target.id;
              const dropPos = data.position;
              
              let targetParentId: string | null = null;
              
              if (dropPos === "inside" && isBranchNode(data.target)) {
                targetParentId = targetId;
              } else if (dropPos === "before" || dropPos === "after") {
                const targetDoc = documents.find(d => d.id === targetId);
                if (targetDoc) {
                  targetParentId = targetDoc.parentId;
                }
              }
              
              const sourceDoc = documents.find(d => d.id === sourceId);
              if (!sourceDoc) return;
              
              const siblings = getSiblings(documents, targetParentId, sourceId);
              
              let insertIndex = siblings.length;
              if (dropPos === "before") {
                const targetIndex = siblings.findIndex(s => s.id === targetId);
                if (targetIndex !== -1) insertIndex = targetIndex;
              } else if (dropPos === "after") {
                const targetIndex = siblings.findIndex(s => s.id === targetId);
                if (targetIndex !== -1) insertIndex = targetIndex + 1;
              } else if (dropPos === "inside") {
                insertIndex = 0;
              }
              
              const newPosition = calculatePosition(siblings, insertIndex);
              
              fetcher.submit(
                { 
                  parentId: targetParentId ?? "", 
                  position: newPosition 
                },
                { method: "PATCH", action: `/api/documents?id=${sourceId}`, encType: "application/x-www-form-urlencoded" },
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
