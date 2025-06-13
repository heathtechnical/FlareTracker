/*
  # Simplified Medication System

  1. Changes
    - Remove complex frequency_type field
    - Remove warning_threshold field  
    - Remove category field
    - Remove start_date field
    - Keep only max_usage_days for simple usage limits
    - Update existing medications to remove deprecated fields

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Remove deprecated columns from medications table
DO $$
BEGIN
  -- Remove frequency_type column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'frequency_type'
  ) THEN
    ALTER TABLE medications DROP COLUMN frequency_type;
  END IF;

  -- Remove warning_threshold column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'warning_threshold'
  ) THEN
    ALTER TABLE medications DROP COLUMN warning_threshold;
  END IF;

  -- Remove category column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'category'
  ) THEN
    ALTER TABLE medications DROP COLUMN category;
  END IF;

  -- Remove start_date column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE medications DROP COLUMN start_date;
  END IF;
END $$;