import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, handleSupabaseError } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((error) => {
      console.error('Error getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      })
      
      if (error) {
        handleSupabaseError(error)
      }
      
      return data
    } catch (error) {
      handleSupabaseError(error)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        handleSupabaseError(error)
      }
      
      return data
    } catch (error) {
      handleSupabaseError(error)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        handleSupabaseError(error)
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut
  }
}