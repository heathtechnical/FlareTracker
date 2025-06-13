import { Medication, CheckIn, MedicationUsageAlert, MedicationUsageStats } from '../types';
import { differenceInDays, parseISO, format } from 'date-fns';

export const getMedicationUsageStats = (
  medication: Medication,
  checkIns: CheckIn[]
): MedicationUsageStats => {
  const medicationEntries = checkIns
    .filter(checkIn => 
      checkIn.medicationEntries.some(entry => 
        entry.medicationId === medication.id && entry.taken
      )
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (medicationEntries.length === 0) {
    return {
      medicationId: medication.id,
      daysUsed: 0,
      consecutiveDays: 0,
      totalDoses: 0,
      usagePattern: 'as-needed'
    };
  }

  const daysUsed = medicationEntries.length;
  const totalDoses = medicationEntries.reduce((total, checkIn) => {
    const entry = checkIn.medicationEntries.find(e => e.medicationId === medication.id);
    return total + (entry?.timesTaken || 1);
  }, 0);

  const lastUsed = medicationEntries[medicationEntries.length - 1].date;

  // Calculate consecutive days (simplified - just count recent consecutive usage)
  const consecutiveDays = calculateConsecutiveDays(medicationEntries);

  // Determine usage pattern based on frequency
  let usagePattern: 'regular' | 'sporadic' | 'as-needed' = 'as-needed';
  if (medication.frequency !== 'As required') {
    // For scheduled medications, check regularity
    const recentDays = 7;
    const recentCheckIns = checkIns.slice(-recentDays);
    const recentUsage = recentCheckIns.filter(checkIn => 
      checkIn.medicationEntries.some(entry => 
        entry.medicationId === medication.id && entry.taken
      )
    ).length;
    
    usagePattern = recentUsage >= recentDays * 0.7 ? 'regular' : 'sporadic';
  }

  return {
    medicationId: medication.id,
    daysUsed,
    consecutiveDays,
    totalDoses,
    lastUsed,
    usagePattern
  };
};

const calculateConsecutiveDays = (medicationEntries: any[]): number => {
  if (medicationEntries.length === 0) return 0;

  const usageDates = medicationEntries
    .map(checkIn => format(parseISO(checkIn.date), 'yyyy-MM-dd'))
    .sort()
    .reverse(); // Start from most recent

  let consecutiveDays = 0;
  let currentDate = usageDates[0];

  for (let i = 0; i < usageDates.length; i++) {
    if (usageDates[i] === currentDate) {
      consecutiveDays++;
      // Move to previous day
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      currentDate = format(prevDate, 'yyyy-MM-dd');
    } else {
      break; // Gap in usage
    }
  }

  return consecutiveDays;
};

export const getMedicationAlerts = (
  medications: Medication[],
  checkIns: CheckIn[]
): MedicationUsageAlert[] => {
  const alerts: MedicationUsageAlert[] = [];

  medications.forEach(medication => {
    if (!medication.active || !medication.maxUsageDays) return;

    const stats = getMedicationUsageStats(medication, checkIns);
    const daysUsed = stats.daysUsed;
    const maxDays = medication.maxUsageDays;

    if (daysUsed >= maxDays) {
      alerts.push({
        medicationId: medication.id,
        medicationName: medication.name,
        type: 'exceeded',
        daysUsed,
        maxDays,
        message: `You have used ${medication.name} for ${daysUsed} days, which exceeds the recommended maximum of ${maxDays} days. Please consult your healthcare provider.`,
        severity: 'high'
      });
    } else if (daysUsed >= Math.floor(maxDays * 0.8)) {
      const remainingDays = maxDays - daysUsed;
      alerts.push({
        medicationId: medication.id,
        medicationName: medication.name,
        type: 'warning',
        daysUsed,
        maxDays,
        message: `You have ${remainingDays} days remaining for ${medication.name}. Consider consulting your healthcare provider about continuing treatment.`,
        severity: 'medium'
      });
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
};

export const shouldIncludeInAdherenceScore = (medication: Medication): boolean => {
  return medication.frequency !== 'As required' && medication.active;
};

export const getMedicationAdherenceScore = (
  medications: Medication[],
  checkIns: CheckIn[],
  days: number = 7
): number => {
  const scheduledMedications = medications.filter(shouldIncludeInAdherenceScore);
  
  if (scheduledMedications.length === 0) return 100;

  const recentCheckIns = checkIns
    .filter(checkIn => {
      const checkInDate = new Date(checkIn.date);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return checkInDate >= cutoffDate;
    });

  if (recentCheckIns.length === 0) return 100;

  let totalExpected = 0;
  let totalTaken = 0;

  scheduledMedications.forEach(medication => {
    recentCheckIns.forEach(checkIn => {
      const entry = checkIn.medicationEntries.find(e => e.medicationId === medication.id);
      totalExpected++;
      if (entry?.taken) {
        totalTaken++;
      }
    });
  });

  return totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 100;
};