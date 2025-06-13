/*
  # Add max_usage_days column to medications table

  1. Changes
    - Add `max_usage_days` column to `medications` table
    - Column type: integer (nullable)
    - Allows tracking maximum recommended usage duration for medications

  2. Notes
    - This column will store the maximum number of days a medication should be used
    - Nullable to allow medications without usage limits
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'max_usage_days'
  ) THEN
    ALTER TABLE medications ADD COLUMN max_usage_days integer;
  END IF;
END $$;