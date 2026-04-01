import { isBranchNode, type BranchNode, type TreeNode } from "lazy-tree-view";

export interface DocRow {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  content: string | null;
  isFolder: boolean;
  position: number | null;
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

  // Sort roots by position, then isFolder, then name
  roots.sort((a, b) => {
    const aDoc = rows.find(r => r.id === a.id);
    const bDoc = rows.find(r => r.id === b.id);
    if (!aDoc || !bDoc) return 0;
    if (aDoc.position !== null && bDoc.position !== null) {
      if (aDoc.position !== bDoc.position) return aDoc.position - bDoc.position;
    }
    if (aDoc.isFolder !== bDoc.isFolder) return aDoc.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Sort children within each folder
  const sortChildren = (node: TreeNode) => {
    if (isBranchNode(node)) {
      node.children.sort((a, b) => {
        const aDoc = rows.find(r => r.id === a.id);
        const bDoc = rows.find(r => r.id === b.id);
        if (!aDoc || !bDoc) return 0;
        if (aDoc.position !== null && bDoc.position !== null) {
          if (aDoc.position !== bDoc.position) return aDoc.position - bDoc.position;
        }
        if (aDoc.isFolder !== bDoc.isFolder) return aDoc.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };

  roots.forEach(sortChildren);

  return roots;
}

export type DocNode = TreeNode<{ isFolder: boolean; content: string }>;