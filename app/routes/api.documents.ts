import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "~/utils/db.server";
import { document } from "~/db/schema";
import { getSession, getEnv } from "~/utils/auth.server";

export async function loader({ request, context }: { request: Request; context: { cloudflare: { env: Env } } }) {
  const env = getEnv(context);
  const session = await getSession(request, env);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const docId = url.searchParams.get("id");

  const db = getDb(env.DB);

  if (docId) {
    const doc = await db.query.document.findFirst({
      where: and(eq(document.id, docId), eq(document.userId, session.user.id)),
    });
    if (!doc) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json(doc);
  }

  const docs = await db.query.document.findMany({
    where: eq(document.userId, session.user.id),
    orderBy: [desc(document.isFolder), document.name],
  });

  return Response.json(docs);
}

export async function action({ request, context }: { request: Request; context: { cloudflare: { env: Env } } }) {
  const env = getEnv(context);
  const session = await getSession(request, env);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb(env.DB);
  const method = request.method;

  if (method === "POST") {
    const body = await request.json();
    const { name, parentId, isFolder, content } = body;

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const now = new Date();
    const doc = await db
      .insert(document)
      .values({
        id: nanoid(),
        userId: session.user.id,
        parentId: parentId || null,
        name,
        content: content || "",
        isFolder: isFolder || false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json(doc[0], { status: 201 });
  }

  if (method === "PATCH") {
    const url = new URL(request.url);
    const docId = url.searchParams.get("id");

    if (!docId) {
      return Response.json({ error: "Document ID required" }, { status: 400 });
    }

    const existing = await db.query.document.findFirst({
      where: and(eq(document.id, docId), eq(document.userId, session.user.id)),
    });

    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, content, parentId } = body;

    const updated = await db
      .update(document)
      .set({
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(parentId !== undefined && { parentId }),
        updatedAt: new Date(),
      })
      .where(eq(document.id, docId))
      .returning();

    return Response.json(updated[0]);
  }

  if (method === "DELETE") {
    const url = new URL(request.url);
    const docId = url.searchParams.get("id");

    if (!docId) {
      return Response.json({ error: "Document ID required" }, { status: 400 });
    }

    const existing = await db.query.document.findFirst({
      where: and(eq(document.id, docId), eq(document.userId, session.user.id)),
    });

    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(document).where(eq(document.id, docId));

    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}