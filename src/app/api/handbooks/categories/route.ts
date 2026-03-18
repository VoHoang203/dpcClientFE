import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/handbooks/categories - List all handbook categories
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
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        COUNT(h.id) FILTER (WHERE h.status = 'published') as "publishedCount",
        COUNT(h.id) as "totalCount"
      FROM handbook_categories c
      LEFT JOIN handbooks h ON c.id = h.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching handbook categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
