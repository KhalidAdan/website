import type { DocRow } from "./documents";

const DEFAULT_POSITION = 65536;

export function calculatePosition(
  siblings: DocRow[],
  insertIndex: number
): number {
  if (siblings.length === 0) {
    return DEFAULT_POSITION;
  }

  if (insertIndex === 0) {
    const firstPosition = siblings[0]?.position ?? DEFAULT_POSITION;
    return firstPosition / 2;
  }

  if (insertIndex >= siblings.length) {
    const lastSibling = siblings[siblings.length - 1]!;
    const lastPosition = lastSibling.position ?? DEFAULT_POSITION * Math.pow(2, siblings.length);
    return lastPosition * 2;
  }

  const prev = siblings[insertIndex - 1]!;
  const next = siblings[insertIndex]!;
  
  const prevPosition = prev.position ?? DEFAULT_POSITION * (siblings.length - insertIndex + 1);
  const nextPosition = next.position ?? DEFAULT_POSITION * (siblings.length - insertIndex);
  
  if (prevPosition === nextPosition) {
    return (prevPosition + nextPosition) / 2 + DEFAULT_POSITION / 4;
  }
  
  return (prevPosition + nextPosition) / 2;
}

export function getSiblings(
  allDocs: DocRow[],
  parentId: string | null,
  excludeId?: string
): DocRow[] {
  return allDocs
    .filter(d => d.parentId === parentId && d.id !== excludeId)
    .sort((a, b) => {
      if (a.position !== null && b.position !== null) {
        return a.position - b.position;
      }
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function findInsertIndex(
  siblings: DocRow[],
  targetPosition: number
): number {
  for (let i = 0; i < siblings.length; i++) {
    const siblingPos = siblings[i]?.position ?? DEFAULT_POSITION * (siblings.length - i);
    if (targetPosition < siblingPos) {
      return i;
    }
  }
  return siblings.length;
}