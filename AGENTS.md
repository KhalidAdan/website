# Agents

## Skills

This project has custom skills configured:

- **khalid-commit**: Format commit messages in Khalid's preferred style - loads from `.opencode/skills/khalid-commit/SKILL.md`
- **khld-testing**: Testing guide for khld.md using Vitest + Playwright - loads from `.opencode/skills/khld-testing/SKILL.md`

When creating commits, always use the format: `Khalid's background agent: <description>`

## Features

### DB-Backed Documents

Documents are stored in D1 SQLite database with the following schema:

```sql
CREATE TABLE document (
  id text PRIMARY KEY,
  user_id text REFERENCES user(id) ON DELETE CASCADE,
  parent_id text REFERENCES document(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text DEFAULT '',
  is_folder integer DEFAULT false,
  created_at integer,
  updated_at integer
);
```

**API Routes:**
- `GET /api/documents` - List user's documents
- `GET /api/documents?id=` - Get single document
- `POST /api/documents` - Create document or folder
- `PATCH /api/documents?id=` - Update document
- `DELETE /api/documents?id=` - Delete document

**Frontend:**
- DocumentTree component with lazy-tree-view
- Auto-save (1s debounce) to database
- Sidebar with create doc/folder buttons

See SKILL.md for test plan.
