import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { conditionService } from '../services/conditionService';
import { medicationService } from '../services/medicationService';
import { checkInService } from '../services/checkInService';
import { userService } from '../services/userService';
import { User, SkinCondition, Medication, CheckIn } from '../types';

interface AppContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  supabaseUser: SupabaseUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  addCondition: (condition: Omit<SkinCondition, 'id' | 'createdAt'>) => Promise<void>;
  updateCondition: (condition: SkinCondition) => Promise<void>;
  deleteCondition: (id: string) => Promise<void>;
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt'>) => Promise<void>;
  updateMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  addCheckIn: (checkIn: Omit<CheckIn, 'id'>) => Promise<void>;
  updateCheckIn: (checkIn: CheckIn) => Promise<void>;
  deleteCheckIn: (id: string) => Promise<void>;
  getTodayCheckIn: () => CheckIn | undefined;
  getConditionById: (id: string) => SkinCondition | undefined;
  getMedicationById: (id: string) => Medication | undefined;
  updateUserSettings: (settings: Partial<User>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: supabaseUser, loading: authLoading, signUp: authSignUp, signIn: authSignIn, signOut: authSignOut } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (supabaseUser) {
        try {
          setIsLoading(true);
          
          // Get or create user profile
          let userProfile = await userService.getUser(supabaseUser.id);
          
          if (!userProfile) {
            // Create user profile if it doesn't exist
            userProfile = await userService.createUser({
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name: supabaseUser.user_metadata?.name || supabaseUser.email!.split('@')[0],
            });
          }

          // Load all user data
          const [conditions, medications, checkIns] = await Promise.all([
            conditionService.getConditions(supabaseUser.id),
            medicationService.getMedications(supabaseUser.id),
            checkInService.getCheckIns(supabaseUser.id)
          ]);

          setUser({
            id: userProfile.id,
            name: userProfile.name,
            email: userProfile.email,
            reminderEnabled: userProfile.reminder_enabled,
            reminderTime: userProfile.reminder_time || '20:00',
            createdAt: userProfile.created_at,
            conditions: conditions || [],
            medications: medications || [],
            checkIns: checkIns || []
          });
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsLoading(authLoading);
      }
    };

    loadUserData();
  }, [supabaseUser, authLoading]);

  const signIn = async (email: string, password: string) => {
    await authSignIn(email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    await authSignUp(email, password, name);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
  };

  const addCondition = async (conditionData: Omit<SkinCondition, 'id' | 'createdAt'>) => {
    if (!supabaseUser || !user) return;
    
    const newCondition = await conditionService.createCondition(supabaseUser.id, conditionData);
    if (newCondition) {
      setUser({
        ...user,
        conditions: [...user.conditions, newCondition]
      });
    }
  };

  const updateCondition = async (condition: SkinCondition) => {
    if (!user) return;
    
    const updatedCondition = await conditionService.updateCondition(condition.id, {
      name: condition.name,
      description: condition.description,
      color: condition.color
    });
    
    if (updatedCondition) {
      setUser({
        ...user,
        conditions: user.conditions.map(c => 
          c.id === condition.id ? updatedCondition : c
        )
      });
    }
  };

  const deleteCondition = async (id: string) => {
    if (!user) return;
    
    await conditionService.deleteCondition(id);
    
    setUser({
      ...user,
      conditions: user.conditions.filter(c => c.id !== id),
      medications: user.medications.map(med => ({
        ...med,
        conditionIds: med.conditionIds.filter(conditionId => conditionId !== id)
      })),
      checkIns: user.checkIns.map(checkIn => ({
        ...checkIn,
        conditionEntries: checkIn.conditionEntries.filter(
          entry => entry.conditionId !== id
        )
      }))
    });
  };

  const addMedication = async (medicationData: Omit<Medication, 'id' | 'createdAt'>) => {
    if (!supabaseUser || !user) return;
    
    const newMedication = await medicationService.createMedication(supabaseUser.id, medicationData);
    if (newMedication) {
      setUser({
        ...user,
        medications: [...user.medications, newMedication]
      });
    }
  };

  const updateMedication = async (medication: Medication) => {
    if (!user) return;
    
    const updatedMedication = await medicationService.updateMedication(medication.id, {
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      notes: medication.notes,
      active: medication.active,
      condition_ids: medication.conditionIds,
      maxUsageDays: medication.maxUsageDays
    });
    
    if (updatedMedication) {
      setUser({
        ...user,
        medications: user.medications.map(m => 
          m.id === medication.id ? updatedMedication : m
        )
      });
    }
  };

  const deleteMedication = async (id: string) => {
    if (!user) return;
    
    await medicationService.deleteMedication(id);
    
    setUser({
      ...user,
      medications: user.medications.filter(m => m.id !== id),
      checkIns: user.checkIns.map(checkIn => ({
        ...checkIn,
        medicationEntries: checkIn.medicationEntries.filter(
          entry => entry.medicationId !== id
        )
      }))
    });
  };

  const addCheckIn = async (checkInData: Omit<CheckIn, 'id'>) => {
    if (!supabaseUser || !user) return;
    
    const newCheckIn = await checkInService.createCheckIn(supabaseUser.id, checkInData);
    if (newCheckIn) {
      // Remove any existing check-in for the same date
      const newCheckInDate = new Date(newCheckIn.date);
      const newDateString = `${newCheckInDate.getFullYear()}-${String(newCheckInDate.getMonth() + 1).padStart(2, '0')}-${String(newCheckInDate.getDate()).padStart(2, '0')}`;
      
      const filteredCheckIns = user.checkIns.filter(existingCheckIn => {
        const existingDate = new Date(existingCheckIn.date);
        const existingDateString = `${existingDate.getFullYear()}-${String(existingDate.getMonth() + 1).padStart(2, '0')}-${String(existingDate.getDate()).padStart(2, '0')}`;
        return existingDateString !== newDateString;
      });
      
      setUser({
        ...user,
        checkIns: [...filteredCheckIns, newCheckIn]
      });
    }
  };

  const updateCheckIn = async (checkIn: CheckIn) => {
    if (!supabaseUser || !user) return;
    
    const updatedCheckIn = await checkInService.updateCheckIn(checkIn.id, checkIn);
    if (updatedCheckIn) {
      setUser({
        ...user,
        checkIns: user.checkIns.map(c => 
          c.id === checkIn.id ? updatedCheckIn : c
        )
      });
    }
  };

  const deleteCheckIn = async (id: string) => {
    if (!user) return;
    
    await checkInService.deleteCheckIn(id);
    
    setUser({
      ...user,
      checkIns: user.checkIns.filter(c => c.id !== id)
    });
  };

  const getTodayCheckIn = () => {
    if (!user) return undefined;
    
    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return user.checkIns.find(checkIn => {
      const checkInDate = new Date(checkIn.date);
      const checkInDateString = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`;
      return checkInDateString === todayDateString;
    });
  };

  const getConditionById = (id: string) => {
    if (!user) return undefined;
    return user.conditions.find(condition => condition.id === id);
  };

  const getMedicationById = (id: string) => {
    if (!user) return undefined;
    return user.medications.find(medication => medication.id === id);
  };

  const updateUserSettings = async (settings: Partial<User>) => {
    if (!supabaseUser || !user) return;
    
    const updatedUser = await userService.updateUser(supabaseUser.id, {
      name: settings.name,
      email: settings.email,
      reminder_enabled: settings.reminderEnabled,
      reminder_time: settings.reminderTime
    });
    
    if (updatedUser) {
      setUser({
        ...user,
        name: updatedUser.name,
        email: updatedUser.email,
        reminderEnabled: updatedUser.reminder_enabled,
        reminderTime: updatedUser.reminder_time || '20:00'
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!supabaseUser,
        supabaseUser,
        signIn,
        signUp,
        signOut,
        addCondition,
        updateCondition,
        deleteCondition,
        addMedication,
        updateMedication,
        deleteMedication,
        addCheckIn,
        updateCheckIn,
        deleteCheckIn,
        getTodayCheckIn,
        getConditionById,
        getMedicationById,
        updateUserSettings
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
};