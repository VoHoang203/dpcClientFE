import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/handbooks/[id] - Get single handbook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if id is a number (ID) or string (slug)
    const isNumeric = /^\d+$/.test(id);

    let handbook;
    if (isNumeric) {
      handbook = await sql`
        SELECT 
          h.id,
          h.title,
          h.slug,
          h.excerpt,
          h.content,
          h.cover_image as "coverImage",
          h.category_id as "categoryId",
          h.author_name as "authorName",
          h.author_avatar as "authorAvatar",
          h.status,
          h.is_featured as "isFeatured",
          h.is_pinned as "isPinned",
          h.view_count as "viewCount",
          h.tags,
          h.published_at as "publishedAt",
          h.created_at as "createdAt",
          h.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM handbooks h
        LEFT JOIN handbook_categories c ON h.category_id = c.id
        WHERE h.id = ${parseInt(id)}
      `;
    } else {
      handbook = await sql`
        SELECT 
          h.id,
          h.title,
          h.slug,
          h.excerpt,
          h.content,
          h.cover_image as "coverImage",
          h.category_id as "categoryId",
          h.author_name as "authorName",
          h.author_avatar as "authorAvatar",
          h.status,
          h.is_featured as "isFeatured",
          h.is_pinned as "isPinned",
          h.view_count as "viewCount",
          h.tags,
          h.published_at as "publishedAt",
          h.created_at as "createdAt",
          h.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM handbooks h
        LEFT JOIN handbook_categories c ON h.category_id = c.id
        WHERE h.slug = ${id}
      `;
    }

    if (handbook.length === 0) {
      return NextResponse.json(
        { error: "Handbook not found" },
        { status: 404 }
      );
    }

    // Increment view count
    if (isNumeric) {
      await sql`UPDATE handbooks SET view_count = view_count + 1 WHERE id = ${parseInt(id)}`;
    } else {
      await sql`UPDATE handbooks SET view_count = view_count + 1 WHERE slug = ${id}`;
    }

    return NextResponse.json(handbook[0]);
  } catch (error) {
    console.error("Error fetching handbook:", error);
    return NextResponse.json(
      { error: "Failed to fetch handbook" },
      { status: 500 }
    );
  }
}

// PUT /api/handbooks/[id] - Update handbook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      coverImage,
      categoryId,
      authorName,
      authorAvatar,
      status,
      isFeatured,
      isPinned,
      tags,
    } = body;

    // Check if status changed to published
    const existingHandbook = await sql`SELECT status, published_at FROM handbooks WHERE id = ${parseInt(id)}`;
    
    let publishedAt = existingHandbook[0]?.published_at;
    if (status === "published" && existingHandbook[0]?.status !== "published") {
      publishedAt = new Date().toISOString();
    }

    const result = await sql`
      UPDATE handbooks
      SET 
        title = COALESCE(${title}, title),
        excerpt = COALESCE(${excerpt}, excerpt),
        content = COALESCE(${content}, content),
        cover_image = COALESCE(${coverImage}, cover_image),
        category_id = COALESCE(${categoryId}, category_id),
        author_name = COALESCE(${authorName}, author_name),
        author_avatar = COALESCE(${authorAvatar}, author_avatar),
        status = COALESCE(${status}, status),
        is_featured = COALESCE(${isFeatured}, is_featured),
        is_pinned = COALESCE(${isPinned}, is_pinned),
        tags = COALESCE(${tags}, tags),
        published_at = ${publishedAt},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING 
        id,
        title,
        slug,
        excerpt,
        content,
        cover_image as "coverImage",
        category_id as "categoryId",
        author_name as "authorName",
        author_avatar as "authorAvatar",
        status,
        is_featured as "isFeatured",
        is_pinned as "isPinned",
        view_count as "viewCount",
        tags,
        published_at as "publishedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Handbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating handbook:", error);
    return NextResponse.json(
      { error: "Failed to update handbook" },
      { status: 500 }
    );
  }
}

// DELETE /api/handbooks/[id] - Delete handbook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      DELETE FROM handbooks
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Handbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting handbook:", error);
    return NextResponse.json(
      { error: "Failed to delete handbook" },
      { status: 500 }
    );
  }
}
