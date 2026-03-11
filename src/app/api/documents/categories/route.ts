import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/documents/categories - List all document categories
export async function GET() {
  try {
    const categories = await sql`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.color,
        c.icon,
        c.parent_id as "parentId",
        c.sort_order as "sortOrder",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COUNT(d.id) FILTER (WHERE d.status = 'active') as "documentCount"
      FROM document_categories c
      LEFT JOIN documents d ON c.id = d.category_id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `;

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching document categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
