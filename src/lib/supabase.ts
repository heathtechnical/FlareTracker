import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  throw new Error('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

if (supabaseUrl === 'your_supabase_project_url' || supabaseAnonKey === 'your_supabase_anon_key') {
  console.error('Supabase environment variables are not configured. Please update your .env file with actual values.')
  throw new Error('Supabase environment variables are not configured. Please update your .env file with actual values from your Supabase project dashboard.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
        },
      }).catch(error => {
        console.error('Fetch error:', error);
        throw error;
      });
    }
  }
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  // Check for network connectivity issues
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.name === 'TypeError') {
    throw new Error('Unable to connect to Supabase. Please check your internet connection and verify your Supabase URL is correct.')
  }
  
  // Handle authentication-specific errors
  if (error.message?.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
    throw new Error('Invalid email or password. Please check your credentials or create a new account if you haven\'t registered yet.')
  }
  
  if (error.message?.includes('Email not confirmed')) {
    throw new Error('Please check your email and click the confirmation link, then try signing in again.')
  }
  
  if (error.message?.includes('User already registered')) {
    throw new Error('This email is already registered. Please sign in instead.')
  }
  
  if (error.message?.includes('Signup is disabled')) {
    throw new Error('Account registration is currently disabled. Please contact support.')
  }
  
  // Handle configuration errors
  if (error.message?.includes('Invalid API key') || error.message?.includes('Project not found')) {
    throw new Error('Supabase configuration error. Please verify your project URL and API key are correct.')
  }
  
  throw new Error(error.message || 'An unexpected error occurred')
}