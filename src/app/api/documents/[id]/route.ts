import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/documents/[id] - Get single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);

    let document;
    if (isNumeric) {
      document = await sql`
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
        WHERE d.id = ${parseInt(id)}
      `;
    } else {
      document = await sql`
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
        WHERE d.slug = ${id}
      `;
    }

    if (document.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document[0]);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      status,
      isFeatured,
      tags,
      metadata,
    } = body;

    const result = await sql`
      UPDATE documents
      SET 
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        file_url = COALESCE(${fileUrl}, file_url),
        file_name = COALESCE(${fileName}, file_name),
        file_type = COALESCE(${fileType}, file_type),
        file_size = COALESCE(${fileSize}, file_size),
        category_id = COALESCE(${categoryId}, category_id),
        uploaded_by = COALESCE(${uploadedBy}, uploaded_by),
        status = COALESCE(${status}, status),
        is_featured = COALESCE(${isFeatured}, is_featured),
        tags = COALESCE(${tags}, tags),
        metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}, metadata),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
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

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      UPDATE documents
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
