import type { BranchNode, TreeNode } from "lazy-tree-view";

export interface DocRow {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  content: string;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function docsToTree(docs: unknown): TreeNode[] {
  const rows = docs as DocRow[];
  const docMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const doc of rows) {
    if (doc.isFolder) {
      docMap.set(doc.id, {
        id: doc.id,
        name: doc.name,
        children: [],
        isOpen: false,
        hasChildren: rows.some((r) => r.parentId === doc.id),
      } as BranchNode);
    } else {
      docMap.set(doc.id, {
        id: doc.id,
        name: doc.name,
      });
    }
  }

  for (const doc of rows) {
    const node = docMap.get(doc.id)!;
    if (doc.parentId && docMap.has(doc.parentId)) {
      const parent = docMap.get(doc.parentId) as BranchNode;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export type DocNode = TreeNode<{ isFolder: boolean; content: string }>;