/*
  # Initial Schema for Skin Tracking App

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches Supabase auth.users.id
      - `email` (text, unique)
      - `name` (text)
      - `reminder_enabled` (boolean)
      - `reminder_time` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `conditions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text, nullable)
      - `color` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `medications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `dosage` (text)
      - `frequency` (text)
      - `notes` (text, nullable)
      - `active` (boolean)
      - `condition_ids` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `check_ins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `date` (date)
      - `notes` (text, nullable)
      - `photo_url` (text, nullable)
      - `factors` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `condition_entries`
      - `id` (uuid, primary key)
      - `check_in_id` (uuid, foreign key)
      - `condition_id` (uuid, foreign key)
      - `severity` (integer)
      - `symptoms` (text array)
      - `notes` (text, nullable)
      - `created_at` (timestamp)
    
    - `medication_entries`
      - `id` (uuid, primary key)
      - `check_in_id` (uuid, foreign key)
      - `medication_id` (uuid, foreign key)
      - `taken` (boolean)
      - `times_taken` (integer, nullable)
      - `skipped_reason` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  reminder_enabled boolean DEFAULT true,
  reminder_time text DEFAULT '20:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conditions table
CREATE TABLE IF NOT EXISTS conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  notes text,
  active boolean DEFAULT true,
  condition_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  notes text,
  photo_url text,
  factors jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create condition_entries table
CREATE TABLE IF NOT EXISTS condition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid REFERENCES check_ins(id) ON DELETE CASCADE NOT NULL,
  condition_id uuid REFERENCES conditions(id) ON DELETE CASCADE NOT NULL,
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 5),
  symptoms text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(check_in_id, condition_id)
);

-- Create medication_entries table
CREATE TABLE IF NOT EXISTS medication_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_in_id uuid REFERENCES check_ins(id) ON DELETE CASCADE NOT NULL,
  medication_id uuid REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  taken boolean NOT NULL DEFAULT false,
  times_taken integer,
  skipped_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(check_in_id, medication_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for conditions table
CREATE POLICY "Users can manage own conditions" ON conditions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Create policies for medications table
CREATE POLICY "Users can manage own medications" ON medications
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Create policies for check_ins table
CREATE POLICY "Users can manage own check-ins" ON check_ins
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Create policies for condition_entries table
CREATE POLICY "Users can manage own condition entries" ON condition_entries
  FOR ALL TO authenticated
  USING (
    check_in_id IN (
      SELECT id FROM check_ins WHERE user_id = auth.uid()
    )
  );

-- Create policies for medication_entries table
CREATE POLICY "Users can manage own medication entries" ON medication_entries
  FOR ALL TO authenticated
  USING (
    check_in_id IN (
      SELECT id FROM check_ins WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conditions_user_id ON conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_date ON check_ins(date);
CREATE INDEX IF NOT EXISTS idx_condition_entries_check_in_id ON condition_entries(check_in_id);
CREATE INDEX IF NOT EXISTS idx_medication_entries_check_in_id ON medication_entries(check_in_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conditions_updated_at BEFORE UPDATE ON conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();