/*
  # Complete Skin Tracking App Schema

  1. New Tables
    - `users` - User profiles linked to auth.users
    - `conditions` - Skin conditions to track
    - `medications` - Medications and treatments
    - `check_ins` - Daily check-in records
    - `condition_entries` - Condition data for each check-in
    - `medication_entries` - Medication data for each check-in

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Foreign key constraints for data integrity

  3. Performance
    - Indexes on frequently queried columns
    - Triggers for automatic updated_at timestamps
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  reminder_enabled boolean DEFAULT true,
  reminder_time text DEFAULT '20:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can insert own data" ON users;
  DROP POLICY IF EXISTS "Users can read own data" ON users;
  DROP POLICY IF EXISTS "Users can update own data" ON users;
  
  -- Create new policies
  CREATE POLICY "Users can insert own data"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own data"
    ON users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);
END $$;

-- Conditions table
CREATE TABLE IF NOT EXISTS conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;

-- Handle conditions policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own conditions" ON conditions;
  
  CREATE POLICY "Users can manage own conditions"
    ON conditions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'conditions' AND indexname = 'idx_conditions_user_id'
  ) THEN
    CREATE INDEX idx_conditions_user_id ON conditions(user_id);
  END IF;
END $$;

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  notes text,
  active boolean DEFAULT true,
  condition_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Handle medications policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own medications" ON medications;
  
  CREATE POLICY "Users can manage own medications"
    ON medications
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Create medications index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'medications' AND indexname = 'idx_medications_user_id'
  ) THEN
    CREATE INDEX idx_medications_user_id ON medications(user_id);
  END IF;
END $$;

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  notes text,
  photo_url text,
  factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ins_user_id_date_key'
  ) THEN
    ALTER TABLE check_ins ADD CONSTRAINT check_ins_user_id_date_key UNIQUE(user_id, date);
  END IF;
END $$;

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Handle check_ins policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own check-ins" ON check_ins;
  
  CREATE POLICY "Users can manage own check-ins"
    ON check_ins
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Create check_ins indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'check_ins' AND indexname = 'idx_check_ins_user_id'
  ) THEN
    CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'check_ins' AND indexname = 'idx_check_ins_date'
  ) THEN
    CREATE INDEX idx_check_ins_date ON check_ins(date);
  END IF;
END $$;

-- Condition entries table
CREATE TABLE IF NOT EXISTS condition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  condition_id uuid NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  severity integer NOT NULL,
  symptoms text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'condition_entries_check_in_id_condition_id_key'
  ) THEN
    ALTER TABLE condition_entries ADD CONSTRAINT condition_entries_check_in_id_condition_id_key UNIQUE(check_in_id, condition_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'condition_entries_severity_check'
  ) THEN
    ALTER TABLE condition_entries ADD CONSTRAINT condition_entries_severity_check CHECK (severity >= 1 AND severity <= 5);
  END IF;
END $$;

ALTER TABLE condition_entries ENABLE ROW LEVEL SECURITY;

-- Handle condition_entries policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own condition entries" ON condition_entries;
  
  CREATE POLICY "Users can manage own condition entries"
    ON condition_entries
    FOR ALL
    TO authenticated
    USING (
      check_in_id IN (
        SELECT id FROM check_ins WHERE user_id = auth.uid()
      )
    );
END $$;

-- Create condition_entries index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'condition_entries' AND indexname = 'idx_condition_entries_check_in_id'
  ) THEN
    CREATE INDEX idx_condition_entries_check_in_id ON condition_entries(check_in_id);
  END IF;
END $$;

-- Medication entries table
CREATE TABLE IF NOT EXISTS medication_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  taken boolean NOT NULL DEFAULT false,
  times_taken integer,
  skipped_reason text,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'medication_entries_check_in_id_medication_id_key'
  ) THEN
    ALTER TABLE medication_entries ADD CONSTRAINT medication_entries_check_in_id_medication_id_key UNIQUE(check_in_id, medication_id);
  END IF;
END $$;

ALTER TABLE medication_entries ENABLE ROW LEVEL SECURITY;

-- Handle medication_entries policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own medication entries" ON medication_entries;
  
  CREATE POLICY "Users can manage own medication entries"
    ON medication_entries
    FOR ALL
    TO authenticated
    USING (
      check_in_id IN (
        SELECT id FROM check_ins WHERE user_id = auth.uid()
      )
    );
END $$;

-- Create medication_entries index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'medication_entries' AND indexname = 'idx_medication_entries_check_in_id'
  ) THEN
    CREATE INDEX idx_medication_entries_check_in_id ON medication_entries(check_in_id);
  END IF;
END $$;

-- Create triggers for updated_at columns
DO $$
BEGIN
  -- Users table trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Conditions table trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_conditions_updated_at'
  ) THEN
    CREATE TRIGGER update_conditions_updated_at
      BEFORE UPDATE ON conditions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Medications table trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_medications_updated_at'
  ) THEN
    CREATE TRIGGER update_medications_updated_at
      BEFORE UPDATE ON medications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Check-ins table trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_check_ins_updated_at'
  ) THEN
    CREATE TRIGGER update_check_ins_updated_at
      BEFORE UPDATE ON check_ins
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;