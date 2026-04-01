import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DocumentTree } from './DocumentTree';

vi.mock('lazy-tree-view', () => ({
  LazyTreeView: ({ initialTree }: { initialTree: any[] }) => (
    <div data-testid="tree">
      {initialTree?.map((node: any) => (
        <div key={node.id} data-testid={`node-${node.name}`}>
          {node.name}
        </div>
      ))}
    </div>
  ),
}));

const mockDocs = [
  { id: '1', userId: 'u1', parentId: null, name: 'test.md', content: 'hello', isFolder: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', userId: 'u1', parentId: null, name: 'folder', content: '', isFolder: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

describe('DocumentTree', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('prompt', vi.fn(() => 'New Doc'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders loading state initially', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<DocumentTree selectedId={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('renders empty state when no documents', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<DocumentTree selectedId={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/no documents/i)).toBeInTheDocument();
    });
  });

  it('renders tree with documents', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocs),
    });
    render(<DocumentTree selectedId={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('node-test.md')).toBeInTheDocument();
      expect(screen.getByTestId('node-folder')).toBeInTheDocument();
    });
  });

  it('shows doc and folder buttons', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    render(<DocumentTree selectedId={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /doc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /folder/i })).toBeInTheDocument();
    });
  });
});