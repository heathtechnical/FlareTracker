import { supabase, handleSupabaseError } from '../lib/supabase'
import { CheckIn } from '../types'

export const checkInService = {
  async getCheckIns(userId: string) {
    try {
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (checkInsError) throw checkInsError

      if (!checkIns || checkIns.length === 0) return []

      // Get condition entries for all check-ins
      const checkInIds = checkIns.map(ci => ci.id)
      
      const { data: conditionEntries, error: conditionError } = await supabase
        .from('condition_entries')
        .select('*')
        .in('check_in_id', checkInIds)

      if (conditionError) throw conditionError

      // Get medication entries for all check-ins
      const { data: medicationEntries, error: medicationError } = await supabase
        .from('medication_entries')
        .select('*')
        .in('check_in_id', checkInIds)

      if (medicationError) throw medicationError

      // Combine the data
      return checkIns.map(checkIn => ({
        id: checkIn.id,
        date: checkIn.date,
        notes: checkIn.notes,
        photoUrl: checkIn.photo_url,
        factors: checkIn.factors || {},
        conditionEntries: (conditionEntries || [])
          .filter(entry => entry.check_in_id === checkIn.id)
          .map(entry => ({
            conditionId: entry.condition_id,
            severity: entry.severity,
            symptoms: entry.symptoms || [],
            notes: entry.notes
          })),
        medicationEntries: (medicationEntries || [])
          .filter(entry => entry.check_in_id === checkIn.id)
          .map(entry => ({
            medicationId: entry.medication_id,
            taken: entry.taken,
            timesTaken: entry.times_taken,
            skippedReason: entry.skipped_reason
          }))
      }))
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async createCheckIn(userId: string, checkInData: Omit<CheckIn, 'id'>) {
    try {
      // First create the check-in
      const { data: checkIn, error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          date: checkInData.date,
          notes: checkInData.notes,
          photo_url: checkInData.photoUrl,
          factors: checkInData.factors || {}
        })
        .select()
        .single()

      if (checkInError) throw checkInError

      // Create condition entries
      if (checkInData.conditionEntries.length > 0) {
        const { error: conditionError } = await supabase
          .from('condition_entries')
          .insert(
            checkInData.conditionEntries.map(entry => ({
              check_in_id: checkIn.id,
              condition_id: entry.conditionId,
              severity: entry.severity,
              symptoms: entry.symptoms || [],
              notes: entry.notes
            }))
          )
      
        if (conditionError) throw conditionError
      }

      // Create medication entries
      if (checkInData.medicationEntries.length > 0) {
        const { error: medicationError } = await supabase
          .from('medication_entries')
          .insert(
            checkInData.medicationEntries.map(entry => ({
              check_in_id: checkIn.id,
              medication_id: entry.medicationId,
              taken: entry.taken,
              times_taken: entry.timesTaken,
              skipped_reason: entry.skippedReason
            }))
          )

        if (medicationError) throw medicationError
      }

      // Return the complete check-in
      return {
        id: checkIn.id,
        date: checkIn.date,
        notes: checkIn.notes,
        photoUrl: checkIn.photo_url,
        factors: checkIn.factors || {},
        conditionEntries: checkInData.conditionEntries,
        medicationEntries: checkInData.medicationEntries
      }
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async updateCheckIn(checkInId: string, checkInData: CheckIn) {
    try {
      // Update the main check-in record
      const { data: checkIn, error: checkInError } = await supabase
        .from('check_ins')
        .update({
          date: checkInData.date,
          notes: checkInData.notes,
          photo_url: checkInData.photoUrl,
          factors: checkInData.factors || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', checkInId)
        .select()
        .single()

      if (checkInError) throw checkInError

      // Delete existing condition entries
      await supabase
        .from('condition_entries')
        .delete()
        .eq('check_in_id', checkInId)

      // Delete existing medication entries
      await supabase
        .from('medication_entries')
        .delete()
        .eq('check_in_id', checkInId)

      // Create new condition entries
      if (checkInData.conditionEntries.length > 0) {
        const { error: conditionError } = await supabase
          .from('condition_entries')
          .insert(
            checkInData.conditionEntries.map(entry => ({
              check_in_id: checkInId,
              condition_id: entry.conditionId,
              severity: entry.severity,
              symptoms: entry.symptoms || [],
              notes: entry.notes
            }))
          )

        if (conditionError) throw conditionError
      }

      // Create new medication entries
      if (checkInData.medicationEntries.length > 0) {
        const { error: medicationError } = await supabase
          .from('medication_entries')
          .insert(
            checkInData.medicationEntries.map(entry => ({
              check_in_id: checkInId,
              medication_id: entry.medicationId,
              taken: entry.taken,
              times_taken: entry.timesTaken,
              skipped_reason: entry.skippedReason
            }))
          )

        if (medicationError) throw medicationError
      }

      return checkInData
    } catch (error) {
      handleSupabaseError(error)
    }
  },

  async deleteCheckIn(checkInId: string) {
    try {
      // Delete condition entries first (due to foreign key constraints)
      await supabase
        .from('condition_entries')
        .delete()
        .eq('check_in_id', checkInId)

      // Delete medication entries
      await supabase
        .from('medication_entries')
        .delete()
        .eq('check_in_id', checkInId)

      // Delete the check-in
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', checkInId)

      if (error) throw error
    } catch (error) {
      handleSupabaseError(error)
    }
  }
}