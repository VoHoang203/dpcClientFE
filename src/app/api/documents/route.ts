import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/documents - List all documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const fileType = searchParams.get("fileType");
    const featured = searchParams.get("featured");

    let documents;

    if (categoryId) {
      documents = await sql`
        SELECT 
          d.id,
          d.title,
          d.slug,
          d.description,
          d.file_url as "fileUrl",
          d.file_name as "fileName",
          d.file_type as "fileType",
          d.file_size as "fileSize",
          d.category_id as "categoryId",
          d.uploaded_by as "uploadedBy",
          d.status,
          d.is_featured as "isFeatured",
          d.download_count as "downloadCount",
          d.tags,
          d.metadata,
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE d.category_id = ${parseInt(categoryId)} AND d.status = 'active'
        ORDER BY d.created_at DESC
      `;
    } else if (search) {
      documents = await sql`
        SELECT 
          d.id,
          d.title,
          d.slug,
          d.description,
          d.file_url as "fileUrl",
          d.file_name as "fileName",
          d.file_type as "fileType",
          d.file_size as "fileSize",
          d.category_id as "categoryId",
          d.uploaded_by as "uploadedBy",
          d.status,
          d.is_featured as "isFeatured",
          d.download_count as "downloadCount",
          d.tags,
          d.metadata,
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE (d.title ILIKE ${'%' + search + '%'} OR d.description ILIKE ${'%' + search + '%'}) AND d.status = 'active'
        ORDER BY d.created_at DESC
      `;
    } else if (fileType) {
      documents = await sql`
        SELECT 
          d.id,
          d.title,
          d.slug,
          d.description,
          d.file_url as "fileUrl",
          d.file_name as "fileName",
          d.file_type as "fileType",
          d.file_size as "fileSize",
          d.category_id as "categoryId",
          d.uploaded_by as "uploadedBy",
          d.status,
          d.is_featured as "isFeatured",
          d.download_count as "downloadCount",
          d.tags,
          d.metadata,
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE d.file_type = ${fileType} AND d.status = 'active'
        ORDER BY d.created_at DESC
      `;
    } else if (featured === "true") {
      documents = await sql`
        SELECT 
          d.id,
          d.title,
          d.slug,
          d.description,
          d.file_url as "fileUrl",
          d.file_name as "fileName",
          d.file_type as "fileType",
          d.file_size as "fileSize",
          d.category_id as "categoryId",
          d.uploaded_by as "uploadedBy",
          d.status,
          d.is_featured as "isFeatured",
          d.download_count as "downloadCount",
          d.tags,
          d.metadata,
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE d.is_featured = true AND d.status = 'active'
        ORDER BY d.created_at DESC
      `;
    } else {
      documents = await sql`
        SELECT 
          d.id,
          d.title,
          d.slug,
          d.description,
          d.file_url as "fileUrl",
          d.file_name as "fileName",
          d.file_type as "fileType",
          d.file_size as "fileSize",
          d.category_id as "categoryId",
          d.uploaded_by as "uploadedBy",
          d.status,
          d.is_featured as "isFeatured",
          d.download_count as "downloadCount",
          d.tags,
          d.metadata,
          d.created_at as "createdAt",
          d.updated_at as "updatedAt",
          c.name as "categoryName",
          c.slug as "categorySlug",
          c.color as "categoryColor",
          c.icon as "categoryIcon"
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE d.status = 'active'
        ORDER BY d.is_featured DESC, d.created_at DESC
      `;
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      categoryId,
      uploadedBy,
      isFeatured = false,
      tags = [],
      metadata = {},
    } = body;

    if (!title || !fileUrl || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Title, fileUrl, fileName and fileType are required" },
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

    const result = await sql`
      INSERT INTO documents (
        title,
        slug,
        description,
        file_url,
        file_name,
        file_type,
        file_size,
        category_id,
        uploaded_by,
        is_featured,
        tags,
        metadata
      )
      VALUES (
        ${title},
        ${slug},
        ${description || null},
        ${fileUrl},
        ${fileName},
        ${fileType},
        ${fileSize || 0},
        ${categoryId || null},
        ${uploadedBy || null},
        ${isFeatured},
        ${tags},
        ${JSON.stringify(metadata)}
      )
      RETURNING 
        id,
        title,
        slug,
        description,
        file_url as "fileUrl",
        file_name as "fileName",
        file_type as "fileType",
        file_size as "fileSize",
        category_id as "categoryId",
        uploaded_by as "uploadedBy",
        status,
        is_featured as "isFeatured",
        download_count as "downloadCount",
        tags,
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
