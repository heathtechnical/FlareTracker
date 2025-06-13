// Define types for the skin tracking app

export type SeverityLevel = 0 | 1 | 2 | 3 | 4 | 5; // Added 0 for unselected state

export interface SkinCondition {
  id: string;
  name: string;
  description?: string;
  color: string; // For UI representation
  createdAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  conditionIds: string[]; // Link medications to specific conditions
  
  // Simplified fields
  maxUsageDays?: number; // For medications that should have usage limits
}

export interface CheckIn {
  id: string;
  date: string;
  conditionEntries: ConditionEntry[];
  medicationEntries: MedicationEntry[];
  notes?: string;
  photoUrl?: string;
  factors: {
    stress?: SeverityLevel;
    sleep?: SeverityLevel;
    diet?: SeverityLevel;
    water?: SeverityLevel;
    weather?: string;
  };
}

export interface ConditionEntry {
  conditionId: string;
  severity: SeverityLevel;
  symptoms: string[];
  notes?: string;
}

export interface MedicationEntry {
  medicationId: string;
  taken: boolean;
  timesTaken?: number;
  skippedReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  conditions: SkinCondition[];
  medications: Medication[];
  checkIns: CheckIn[];
  createdAt: string;
  reminderEnabled: boolean;
  reminderTime?: string;
}

// New types for medication usage tracking
export interface MedicationUsageAlert {
  medicationId: string;
  medicationName: string;
  type: 'warning' | 'exceeded';
  daysUsed: number;
  maxDays: number;
  message: string;
  severity: 'medium' | 'high';
}

export interface MedicationUsageStats {
  medicationId: string;
  daysUsed: number;
  consecutiveDays: number;
  totalDoses: number;
  lastUsed?: string;
  usagePattern: 'regular' | 'sporadic' | 'as-needed';
}