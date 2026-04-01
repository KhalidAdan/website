import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
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
  const parentId = url.searchParams.get("parentId");

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

  // If parentId is provided, return only children of that folder
  if (parentId !== null) {
    const whereClause = parentId === ""
      ? and(eq(document.userId, session.user.id), isNull(document.parentId))
      : and(eq(document.userId, session.user.id), eq(document.parentId, parentId));
    
    const docs = await db.query.document.findMany({
      where: whereClause,
      orderBy: [
        asc(sql`${document.position} IS NULL`),
        asc(document.position),
        desc(document.isFolder),
        asc(document.name),
      ],
    });
    return Response.json(docs);
  }

  // Otherwise return all documents
  const docs = await db.query.document.findMany({
    where: eq(document.userId, session.user.id),
    orderBy: [
      asc(sql`${document.position} IS NULL`), // NULLs last
      asc(document.position),
      desc(document.isFolder),
      asc(document.name),
    ],
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

  // Parse body based on content type
  const contentType = request.headers.get("content-type") || "";
  let body: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries());
  }

  if (method === "POST") {
    const name = body.name as string | undefined;
    const parentId = (body.parentId as string) || null;
    const isFolder = body.isFolder === true || body.isFolder === "true";

    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const now = new Date();
    const targetParentId = parentId || null;

    // Calculate initial position based on existing siblings
    let initialPosition = 65536; // Default first position
    
    const siblingsWhere = targetParentId === null
      ? and(eq(document.userId, session.user.id), isNull(document.parentId))
      : and(eq(document.userId, session.user.id), eq(document.parentId, targetParentId));
    
    const siblings = await db.query.document.findMany({
      where: siblingsWhere,
      orderBy: [asc(document.position), asc(document.name)],
    });

    if (siblings.length > 0) {
      const lastSibling = siblings[siblings.length - 1]!;
      initialPosition = lastSibling.position ? lastSibling.position * 2 : 65536 * Math.pow(2, siblings.length);
    }

    const doc = await db
      .insert(document)
      .values({
        id: nanoid(),
        userId: session.user.id,
        parentId: targetParentId,
        name,
        content: "",
        isFolder: isFolder || false,
        position: initialPosition,
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

    const name = body.name as string | undefined;
    const content = body.content as string | undefined;
    const parentId = body.parentId as string | undefined;
    const positionRaw = body.position;
    const position = positionRaw !== undefined ? Number(positionRaw) : undefined;

    const updated = await db
      .update(document)
      .set({
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(position !== undefined && !isNaN(position) && { position }),
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