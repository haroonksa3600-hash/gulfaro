-- =========================================================================
-- Gulfaro Database Schema: User Authentication with 5-Digit Access Key
-- =========================================================================

-- Enable UUID extension if supported (PostgreSQL)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    -- Unique User Identifier
    id VARCHAR(64) PRIMARY KEY,
    
    -- Basic Identification
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('job_seeker', 'employer', 'admin')),
    
    -- =====================================================================
    -- 5-Digit Access Key Recovery System (Compulsory Security Columns)
    -- =====================================================================
    -- Bcrypt hash of the 5-digit PIN (e.g., $2a$10$...). Plain text is NEVER stored.
    access_key_hash VARCHAR(255) NOT NULL,
    
    -- Tracks consecutive failed Access Key verification attempts (resets on success)
    failed_attempts INT DEFAULT 0 NOT NULL,
    
    -- Security Lockout Timestamp: Set to (NOW + 15 MINS) when failed_attempts reaches 3
    lockout_until TIMESTAMP NULL,
    
    -- =====================================================================
    -- Profile & Contact Information
    -- =====================================================================
    phone VARCHAR(64) NOT NULL UNIQUE,
    whatsapp VARCHAR(64),
    country VARCHAR(64) NOT NULL,
    city VARCHAR(128) NOT NULL,
    company_name VARCHAR(255),
    hiring_org_name VARCHAR(255),
    company_type VARCHAR(64) DEFAULT 'direct-employer',
    professional_title VARCHAR(255),
    headline VARCHAR(255),
    bio TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance security lookups and lockout verification
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_lockout ON users (lockout_until);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
