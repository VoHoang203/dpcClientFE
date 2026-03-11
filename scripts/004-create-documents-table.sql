-- Create enum type for document type
DO $$ BEGIN
    CREATE TYPE document_type_enum AS ENUM (
        'PDF',
        'DOCX',
        'XLSX',
        'PPTX',
        'IMAGE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create documents table for file storage
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_type document_type_enum NOT NULL DEFAULT 'OTHER',
    mime_type VARCHAR(100),
    download_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    uploaded_by VARCHAR(255),
    uploader_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create document categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    color VARCHAR(50) DEFAULT '#DC2626',
    icon VARCHAR(50) DEFAULT 'Folder',
    sort_order INTEGER DEFAULT 0,
    document_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_is_pinned ON documents(is_pinned);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_categories_slug ON document_categories(slug);

-- Insert default document categories
INSERT INTO document_categories (name, slug, description, color, icon, sort_order) VALUES
    ('Dieu le', 'dieu-le', 'Dieu le Dang Cong san Viet Nam', '#DC2626', 'Scale', 1),
    ('Quy dinh', 'quy-dinh', 'Cac quy dinh ve hoat dong Dang', '#2563EB', 'FileText', 2),
    ('Huong dan', 'huong-dan', 'Tai lieu huong dan', '#059669', 'BookOpen', 3),
    ('Bieu mau', 'bieu-mau', 'Cac mau bieu ban', '#7C3AED', 'FileSpreadsheet', 4),
    ('Nghi quyet', 'nghi-quyet', 'Nghi quyet cac cap', '#F59E0B', 'FileCheck', 5),
    ('Bao cao', 'bao-cao', 'Mau bao cao cong tac', '#EC4899', 'BarChart', 6)
ON CONFLICT (name) DO NOTHING;
