import { supabase, handleSupabaseError } from '../lib/supabase'
import { User } from '../types'

export const userService = {
  async createUser(userData: {
    id: string
    email: string
    name: string
    reminderEnabled?: boolean
    reminderTime?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          reminder_enabled: userData.reminderEnabled ?? true,
          reminder_time: userData.reminderTime ?? '20:00'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async getUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)

      if (error) throw error
      
      // Return null if no user found, otherwise return the first user
      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async updateUser(userId: string, updates: {
    name?: string
    email?: string
    reminder_enabled?: boolean
    reminder_time?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      handleSupabaseError(error)
    }
  }
}