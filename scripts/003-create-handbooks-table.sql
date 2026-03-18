-- Create enum type for handbook status
DO $$ BEGIN
    CREATE TYPE handbook_status_enum AS ENUM (
        'DRAFT',
        'PUBLISHED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create handbooks table for blog-like posts written by Chi uy
CREATE TABLE IF NOT EXISTS handbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    cover_image VARCHAR(1000),
    status handbook_status_enum NOT NULL DEFAULT 'DRAFT',
    view_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create handbook categories table
CREATE TABLE IF NOT EXISTS handbook_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    color VARCHAR(50) DEFAULT '#DC2626',
    icon VARCHAR(50) DEFAULT 'FileText',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create handbook tags table for additional organization
CREATE TABLE IF NOT EXISTS handbook_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_handbooks_status ON handbooks(status);
CREATE INDEX IF NOT EXISTS idx_handbooks_category ON handbooks(category);
CREATE INDEX IF NOT EXISTS idx_handbooks_published_at ON handbooks(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_handbooks_slug ON handbooks(slug);
CREATE INDEX IF NOT EXISTS idx_handbooks_is_featured ON handbooks(is_featured);
CREATE INDEX IF NOT EXISTS idx_handbooks_is_pinned ON handbooks(is_pinned);
CREATE INDEX IF NOT EXISTS idx_handbook_tags_handbook_id ON handbook_tags(handbook_id);
CREATE INDEX IF NOT EXISTS idx_handbook_categories_slug ON handbook_categories(slug);

-- Insert default categories
INSERT INTO handbook_categories (name, slug, description, color, icon, sort_order) VALUES
    ('Dieu le Dang', 'dieu-le-dang', 'Cac quy dinh co ban ve to chuc va hoat dong cua Dang', '#DC2626', 'Scale', 1),
    ('Quy trinh', 'quy-trinh', 'Huong dan cac quy trinh thu tuc', '#2563EB', 'ClipboardList', 2),
    ('Huong dan', 'huong-dan', 'Cac bai huong dan chi tiet', '#059669', 'BookOpen', 3),
    ('Nghi quyet', 'nghi-quyet', 'Cac nghi quyet quan trong', '#7C3AED', 'FileCheck', 4),
    ('Thong bao', 'thong-bao', 'Thong bao tu Chi uy', '#F59E0B', 'Bell', 5),
    ('Tin tuc', 'tin-tuc', 'Tin tuc hoat dong cua Chi bo', '#EC4899', 'Newspaper', 6)
ON CONFLICT (name) DO NOTHING;
