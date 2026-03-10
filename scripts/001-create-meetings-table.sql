-- Create enum types for meetings
DO $$ BEGIN
    CREATE TYPE meetings_type_enum AS ENUM (
        'PERIODIC',
        'EXTRAORDINARY', 
        'EVENT',
        'CEREMONY',
        'CELEBRATION',
        'WEDDING',
        'FUNERAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meetings_status_enum AS ENUM (
        'SCHEDULED',
        'HAPPENING',
        'FINISHED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meetings_format_enum AS ENUM (
        'OFFLINE',
        'ONLINE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_cell_id UUID,
    title VARCHAR(255) NOT NULL,
    type meetings_type_enum NOT NULL DEFAULT 'PERIODIC',
    online_link VARCHAR(500),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    content TEXT,
    status meetings_status_enum NOT NULL DEFAULT 'SCHEDULED',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    attendance_secret VARCHAR(255),
    is_checkin_active BOOLEAN DEFAULT FALSE,
    location VARCHAR(500),
    format meetings_format_enum NOT NULL DEFAULT 'OFFLINE',
    minutes_url VARCHAR(500)
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS meeting_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(255)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(type);
CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting_id ON meeting_attachments(meeting_id);
