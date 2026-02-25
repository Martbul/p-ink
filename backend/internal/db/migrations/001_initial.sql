CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_mac_address VARCHAR(50) UNIQUE,
    pairing_code VARCHAR(10) UNIQUE,
    firmware_version VARCHAR(20),          -- useful from day one for debugging
    last_pinged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE couples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_b_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID UNIQUE REFERENCES devices(id) ON DELETE SET NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (partner_a_id != partner_b_id)   -- prevents a user pairing with themselves
);

CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    category VARCHAR(50)                   -- 'deep', 'funny', 'memories', etc.
);

CREATE TABLE photo_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,                          -- when it was consumed
    used_in_entry_id UUID,                                     -- FK added after daily_entries is created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES prompts(id),
    photo_id UUID REFERENCES photo_queue(id),
    assigned_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(couple_id, assigned_date)
);

ALTER TABLE photo_queue
    ADD CONSTRAINT fk_photo_used_in_entry
    FOREIGN KEY (used_in_entry_id) REFERENCES daily_entries(id) ON DELETE SET NULL;

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_entry_id UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(daily_entry_id, user_id)
);

CREATE TABLE display_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    daily_entry_id UUID REFERENCES daily_entries(id) ON DELETE SET NULL,
    served_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image_url TEXT                         -- snapshot of what was generated and sent
);

CREATE INDEX idx_couples_device         ON couples(device_id);
CREATE INDEX idx_couples_partner_a      ON couples(partner_a_id);
CREATE INDEX idx_couples_partner_b      ON couples(partner_b_id);
CREATE INDEX idx_daily_entries_couple   ON daily_entries(couple_id, assigned_date);
CREATE INDEX idx_photo_queue_unused     ON photo_queue(couple_id) WHERE is_used = FALSE;
CREATE INDEX idx_answers_entry          ON answers(daily_entry_id);
CREATE INDEX idx_display_log_device     ON display_log(device_id, served_at DESC);