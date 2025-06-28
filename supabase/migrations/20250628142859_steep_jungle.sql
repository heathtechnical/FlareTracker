/*
  # Fix RLS policy for user creation

  1. Security Changes
    - Update the INSERT policy on `users` table to allow `public` role
    - This enables initial user profile creation while maintaining security through the WITH CHECK clause
    - The WITH CHECK clause ensures users can only insert their own data (auth.uid() = id)

  This is a common pattern for handling user profile creation immediately after Supabase authentication.
*/

-- Drop and recreate the INSERT policy for users table
DROP POLICY IF EXISTS "Users can insert own data" ON users;

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);