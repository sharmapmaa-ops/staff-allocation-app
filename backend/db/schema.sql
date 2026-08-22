-- ============================================================
-- Staff Allocation Management System - Database Schema
-- Safe to run multiple times (IF NOT EXISTS everywhere).
-- Executed automatically via Settings > Migration in the app,
-- or manually with: psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_code VARCHAR(20),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'User',
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- A single login (email) can belong to more than one workspace (company),
-- each with its own role - e.g. Admin in one company, plain User in another.
-- users.workspace_id / users.role above are kept only for backward
-- compatibility with earlier single-workspace deployments; from this point
-- on, workspace_memberships is the source of truth for access + role.
CREATE TABLE IF NOT EXISTS workspace_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'User',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_requests (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150),
  company_name VARCHAR(150),
  message TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  rate NUMERIC(12,4) DEFAULT 1,
  is_base BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(100),
  time_zone VARCHAR(60),
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS project_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS project_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS billing_basis (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS billing_frequencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  next_invoice_rule VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  dob DATE,
  gender VARCHAR(10),
  contact_number VARCHAR(30),
  email VARCHAR(150),
  joining_date DATE,
  exit_date DATE,
  payroll_type VARCHAR(30),
  location VARCHAR(100),
  gross_salary NUMERIC(12,2) DEFAULT 0,
  salary_currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'Active',
  access_type VARCHAR(20) DEFAULT 'User',
  reporting_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_code VARCHAR(20) UNIQUE NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  client_name VARCHAR(150),
  category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  project_type VARCHAR(50),
  billing_frequency VARCHAR(50),
  sow_available BOOLEAN DEFAULT FALSE,
  billable BOOLEAN DEFAULT TRUE,
  project_manager VARCHAR(150),
  billing_basis VARCHAR(50),
  hours_capping NUMERIC(8,2) DEFAULT 0,
  gp_margin NUMERIC(5,2) DEFAULT 0,
  rate NUMERIC(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  description TEXT,
  comments TEXT,
  additional_notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  billable BOOLEAN DEFAULT TRUE,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  step VARCHAR(200),
  status VARCHAR(20),
  detail TEXT,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  run_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- Safe additive migrations for existing deployments (columns added
-- after initial release). ALTER ... ADD COLUMN IF NOT EXISTS is a
-- no-op if the column is already there, so this is safe to run on
-- every boot alongside the CREATE TABLE statements above.
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT TRUE;

-- ============================================================
-- Multi-tenant scoping: every piece of business data belongs to exactly
-- one workspace (company). Added as nullable so existing rows aren't
-- broken, then backfilled below for any deployment that had a single
-- workspace before this change shipped.
-- ============================================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE project_categories ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE project_types ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE billing_basis ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE billing_frequencies ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE migration_log ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;

-- Backfill: any deployment that only ever had a single workspace gets all
-- of its existing (previously un-scoped) rows assigned to that workspace.
-- Deployments with more than one workspace already are left alone (their
-- rows should already be correctly scoped by the code that created them).
DO $$
DECLARE
  only_workspace_id INTEGER;
BEGIN
  IF (SELECT COUNT(*) FROM workspaces) = 1 THEN
    SELECT id INTO only_workspace_id FROM workspaces LIMIT 1;
    UPDATE employees SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE projects SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE currencies SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE locations SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE project_categories SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE project_types SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE billing_basis SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE billing_frequencies SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE departments SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    UPDATE designations SET workspace_id = only_workspace_id WHERE workspace_id IS NULL;
    -- Backfill workspace_memberships from the old single-workspace users.role
    INSERT INTO workspace_memberships (user_id, workspace_id, role)
    SELECT id, only_workspace_id, role FROM users WHERE workspace_id = only_workspace_id
    ON CONFLICT (user_id, workspace_id) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_workspace ON employees(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user ON workspace_memberships(user_id);
