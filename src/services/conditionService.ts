import { supabase, handleSupabaseError } from '../lib/supabase'
import { SkinCondition } from '../types'

export const conditionService = {
  async getConditions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      return data.map(condition => ({
        id: condition.id,
        name: condition.name,
        description: condition.description,
        color: condition.color,
        createdAt: condition.created_at
      }))
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async createCondition(userId: string, conditionData: {
    name: string
    description?: string
    color: string
  }) {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .insert({
          user_id: userId,
          name: conditionData.name,
          description: conditionData.description,
          color: conditionData.color
        })
        .select()
        .single()

      if (error) throw error
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        createdAt: data.created_at
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async updateCondition(conditionId: string, updates: {
    name?: string
    description?: string
    color?: string
  }) {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conditionId)
        .select()
        .single()

      if (error) throw error
      
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        color: data.color,
        createdAt: data.created_at
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async deleteCondition(conditionId: string) {
    try {
      const { error } = await supabase
        .from('conditions')
        .delete()
        .eq('id', conditionId)

      if (error) throw error
    } catch (error) {
      handleSupabaseError(error)
    }
  }
}