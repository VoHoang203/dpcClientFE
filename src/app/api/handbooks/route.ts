import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/handbooks - List all handbooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const categoryId = searchParams.get("categoryId");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");

    let handbooks;

    if (status && status !== "all") {
      handbooks = await sql`
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
        WHERE h.status = ${status}
        ORDER BY h.is_pinned DESC, h.published_at DESC NULLS LAST, h.created_at DESC
      `;
    } else if (categoryId) {
      handbooks = await sql`
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
        WHERE h.category_id = ${parseInt(categoryId)}
        ORDER BY h.is_pinned DESC, h.published_at DESC NULLS LAST, h.created_at DESC
      `;
    } else if (featured === "true") {
      handbooks = await sql`
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
        WHERE h.is_featured = true AND h.status = 'published'
        ORDER BY h.published_at DESC NULLS LAST
        LIMIT ${limit ? parseInt(limit) : 10}
      `;
    } else if (search) {
      handbooks = await sql`
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
        WHERE (h.title ILIKE ${'%' + search + '%'} OR h.excerpt ILIKE ${'%' + search + '%'})
        ORDER BY h.is_pinned DESC, h.published_at DESC NULLS LAST, h.created_at DESC
      `;
    } else {
      handbooks = await sql`
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
        ORDER BY h.is_pinned DESC, h.published_at DESC NULLS LAST, h.created_at DESC
      `;
    }

    return NextResponse.json(handbooks);
  } catch (error) {
    console.error("Error fetching handbooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch handbooks" },
      { status: 500 }
    );
  }
}

// POST /api/handbooks - Create new handbook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      excerpt,
      content,
      coverImage,
      categoryId,
      authorName,
      authorAvatar,
      status = "draft",
      isFeatured = false,
      isPinned = false,
      tags = [],
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() + "-" + Date.now();

    const publishedAt = status === "published" ? new Date().toISOString() : null;

    const result = await sql`
      INSERT INTO handbooks (
        title,
        slug,
        excerpt,
        content,
        cover_image,
        category_id,
        author_name,
        author_avatar,
        status,
        is_featured,
        is_pinned,
        tags,
        published_at
      )
      VALUES (
        ${title},
        ${slug},
        ${excerpt || null},
        ${content},
        ${coverImage || null},
        ${categoryId || null},
        ${authorName || null},
        ${authorAvatar || null},
        ${status},
        ${isFeatured},
        ${isPinned},
        ${tags},
        ${publishedAt}
      )
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

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating handbook:", error);
    return NextResponse.json(
      { error: "Failed to create handbook" },
      { status: 500 }
    );
  }
}
