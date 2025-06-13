import { supabase, handleSupabaseError } from '../lib/supabase'
import { Medication } from '../types'

export const medicationService = {
  async getMedications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      return data.map(medication => ({
        id: medication.id,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        notes: medication.notes,
        active: medication.active,
        conditionIds: medication.condition_ids || [],
        maxUsageDays: medication.max_usage_days,
        createdAt: medication.created_at
      }))
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async createMedication(userId: string, medicationData: {
    name: string
    dosage: string
    frequency: string
    notes?: string
    active?: boolean
    conditionIds?: string[]
    maxUsageDays?: number
  }) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: userId,
          name: medicationData.name,
          dosage: medicationData.dosage,
          frequency: medicationData.frequency,
          notes: medicationData.notes,
          active: medicationData.active ?? true,
          condition_ids: medicationData.conditionIds || [],
          max_usage_days: medicationData.maxUsageDays
        })
        .select()
        .single()

      if (error) throw error
      
      return {
        id: data.id,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        notes: data.notes,
        active: data.active,
        conditionIds: data.condition_ids || [],
        maxUsageDays: data.max_usage_days,
        createdAt: data.created_at
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async updateMedication(medicationId: string, updates: {
    name?: string
    dosage?: string
    frequency?: string
    notes?: string
    active?: boolean
    condition_ids?: string[]
    maxUsageDays?: number
  }) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .update({
          name: updates.name,
          dosage: updates.dosage,
          frequency: updates.frequency,
          notes: updates.notes,
          active: updates.active,
          condition_ids: updates.condition_ids,
          max_usage_days: updates.maxUsageDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', medicationId)
        .select()
        .single()

      if (error) throw error
      
      return {
        id: data.id,
        name: data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        notes: data.notes,
        active: data.active,
        conditionIds: data.condition_ids || [],
        maxUsageDays: data.max_usage_days,
        createdAt: data.created_at
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async deleteMedication(medicationId: string) {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId)

      if (error) throw error
    } catch (error) {
      handleSupabaseError(error)
    }
  }
}