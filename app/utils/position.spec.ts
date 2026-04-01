import { describe, expect, it } from 'vitest';
import { calculatePosition, getSiblings, findInsertIndex } from './position';
import type { DocRow } from './documents';

const createDoc = (partial: Partial<DocRow> & { id: string; name: string; isFolder: boolean }): DocRow => ({
  id: partial.id,
  userId: 'user-1',
  parentId: partial.parentId ?? null,
  name: partial.name,
  content: partial.content ?? '',
  isFolder: partial.isFolder,
  position: partial.position ?? null,
  createdAt: partial.createdAt ?? new Date(),
  updatedAt: partial.updatedAt ?? new Date(),
});

describe('calculatePosition', () => {
  it('returns default position for empty siblings', () => {
    const pos = calculatePosition([], 0);
    expect(pos).toBe(65536);
  });

  it('returns half of first sibling position when inserting at index 0', () => {
    const siblings = [createDoc({ id: '1', name: 'a', isFolder: false, position: 1000 })];
    const pos = calculatePosition(siblings, 0);
    expect(pos).toBe(500);
  });

  it('returns double of last sibling position when appending', () => {
    const siblings = [
      createDoc({ id: '1', name: 'a', isFolder: false, position: 1000 }),
    ];
    const pos = calculatePosition(siblings, 1);
    expect(pos).toBe(2000);
  });

  it('returns midpoint between two siblings', () => {
    const siblings = [
      createDoc({ id: '1', name: 'a', isFolder: false, position: 100 }),
      createDoc({ id: '2', name: 'b', isFolder: false, position: 200 }),
    ];
    const pos = calculatePosition(siblings, 1);
    expect(pos).toBe(150);
  });

  it('handles null positions with defaults', () => {
    const siblings = [
      createDoc({ id: '1', name: 'a', isFolder: false }),
    ];
    const pos = calculatePosition(siblings, 1);
    expect(pos).toBeGreaterThan(65536);
  });
});

describe('getSiblings', () => {
  it('returns all docs with same parent', () => {
    const docs = [
      createDoc({ id: '1', name: 'folder', isFolder: true }),
      createDoc({ id: '2', name: 'doc1', isFolder: false, parentId: '1' }),
      createDoc({ id: '3', name: 'doc2', isFolder: false, parentId: '1' }),
      createDoc({ id: '4', name: 'doc3', isFolder: false }), // root level
    ];
    const siblings = getSiblings(docs, '1');
    expect(siblings).toHaveLength(2);
  });

  it('excludes specified id from siblings', () => {
    const docs = [
      createDoc({ id: '1', name: 'folder', isFolder: true }),
      createDoc({ id: '2', name: 'doc1', isFolder: false, parentId: '1' }),
      createDoc({ id: '3', name: 'doc2', isFolder: false, parentId: '1' }),
    ];
    const siblings = getSiblings(docs, '1', '2');
    expect(siblings).toHaveLength(1);
    expect(siblings[0]!.id).toBe('3');
  });

  it('returns root level siblings for null parentId', () => {
    const docs = [
      createDoc({ id: '1', name: 'root1', isFolder: false }),
      createDoc({ id: '2', name: 'root2', isFolder: false }),
    ];
    const siblings = getSiblings(docs, null);
    expect(siblings).toHaveLength(2);
  });

  it('sorts by position then isFolder then name', () => {
    const docs = [
      createDoc({ id: '1', name: 'z-doc', isFolder: false, position: 100 }),
      createDoc({ id: '2', name: 'a-folder', isFolder: true, position: 50 }),
    ];
    const siblings = getSiblings(docs, null);
    expect(siblings[0]!.name).toBe('a-folder');
    expect(siblings[1]!.name).toBe('z-doc');
  });
});

describe('findInsertIndex', () => {
  it('returns 0 for empty siblings', () => {
    const idx = findInsertIndex([], 100);
    expect(idx).toBe(0);
  });

  it('finds index before first position greater than target', () => {
    const siblings = [
      createDoc({ id: '1', name: 'a', isFolder: false, position: 200 }),
      createDoc({ id: '2', name: 'b', isFolder: false, position: 400 }),
    ];
    const idx = findInsertIndex(siblings, 150);
    expect(idx).toBe(0);
  });

  it('returns length when position is after all siblings', () => {
    const siblings = [
      createDoc({ id: '1', name: 'a', isFolder: false, position: 100 }),
    ];
    const idx = findInsertIndex(siblings, 500);
    expect(idx).toBe(1);
  });
});