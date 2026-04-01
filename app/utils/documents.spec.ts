import { describe, expect, it } from 'vitest';
import { docsToTree, type DocRow } from './documents';
import type { BranchNode, TreeNode } from 'lazy-tree-view';

const createDoc = (partial: Partial<DocRow> & { id: string; name: string; isFolder: boolean }): DocRow => ({
  id: partial.id,
  userId: 'user-1',
  parentId: partial.parentId ?? null,
  name: partial.name,
  content: partial.content ?? '',
  isFolder: partial.isFolder,
  createdAt: partial.createdAt ?? new Date(),
  updatedAt: partial.updatedAt ?? new Date(),
});

const asBranchNode = (node: TreeNode): BranchNode => node as BranchNode;

describe('docsToTree', () => {
  it('returns empty tree for empty array', () => {
    expect(docsToTree([])).toEqual([]);
  });

  it('places documents at root level', () => {
    const docs = [createDoc({ id: '1', name: 'test.md', isFolder: false })];
    const tree = docsToTree(docs);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.name).toBe('test.md');
  });

  it('creates branch nodes for folders', () => {
    const docs = [createDoc({ id: '1', name: 'folder', isFolder: true })];
    const tree = docsToTree(docs);
    expect(tree).toHaveLength(1);
    const branch = asBranchNode(tree[0]!);
    expect(branch.children).toEqual([]);
    expect('isOpen' in branch).toBe(true);
  });

  it('sets hasChildren true when folder has children', () => {
    const docs = [
      createDoc({ id: '1', name: 'folder', isFolder: true }),
      createDoc({ id: '2', name: 'child.md', isFolder: false, parentId: '1' }),
    ];
    const tree = docsToTree(docs);
    const branch = asBranchNode(tree[0]!);
    expect((branch as any).hasChildren).toBe(true);
  });

  it('sets hasChildren false when folder has no children', () => {
    const docs = [createDoc({ id: '1', name: 'empty-folder', isFolder: true })];
    const tree = docsToTree(docs);
    const branch = asBranchNode(tree[0]!);
    expect((branch as any).hasChildren).toBe(false);
  });

  it('nests children under parent folders', () => {
    const docs = [
      createDoc({ id: '1', name: 'folder', isFolder: true }),
      createDoc({ id: '2', name: 'child.md', isFolder: false, parentId: '1' }),
    ];
    const tree = docsToTree(docs);
    const branch = asBranchNode(tree[0]!);
    expect(branch.children).toHaveLength(1);
    expect(branch.children[0]!.name).toBe('child.md');
  });

  it('handles multiple root level items', () => {
    const docs = [
      createDoc({ id: '1', name: 'doc1.md', isFolder: false }),
      createDoc({ id: '2', name: 'doc2.md', isFolder: false }),
    ];
    const tree = docsToTree(docs);
    expect(tree).toHaveLength(2);
  });

  it('handles nested folders', () => {
    const docs = [
      createDoc({ id: '1', name: 'root-folder', isFolder: true }),
      createDoc({ id: '2', name: 'nested-folder', isFolder: true, parentId: '1' }),
      createDoc({ id: '3', name: 'deep-doc.md', isFolder: false, parentId: '2' }),
    ];
    const tree = docsToTree(docs);
    const root = asBranchNode(tree[0]!);
    expect(root.children).toHaveLength(1);
    const nested = asBranchNode(root.children[0]!);
    expect(nested.name).toBe('nested-folder');
    expect(nested.children).toHaveLength(1);
  });

  it('handles documents as root with folders', () => {
    const docs = [
      createDoc({ id: '1', name: 'root-folder', isFolder: true }),
      createDoc({ id: '2', name: 'doc.md', isFolder: false }),
    ];
    const tree = docsToTree(docs);
    expect(tree).toHaveLength(2);
  });
});