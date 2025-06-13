import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { Medication, CheckIn } from '../types';
import { useApp } from '../context/AppContext';
import { getMedicationUsageStats } from '../utils/medicationUtils';
import { format, differenceInDays, parseISO } from 'date-fns';

interface MedicationCardProps {
  medication: Medication;
  recentCheckIns?: CheckIn[];
  compact?: boolean;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ 
  medication, 
  recentCheckIns = [],
  compact = false 
}) => {
  const { user } = useApp();
  
  // Find most recent check-in with this medication
  const latestEntry = recentCheckIns
    .flatMap(checkIn => 
      checkIn.medicationEntries
        .filter(entry => entry.medicationId === medication.id)
        .map(entry => ({ date: checkIn.date, entry }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Get associated conditions
  const associatedConditions = user?.conditions.filter(condition => 
    medication.conditionIds.includes(condition.id)
  ) || [];

  // Get usage statistics
  const usageStats = getMedicationUsageStats(medication, user?.checkIns || []);

  // Check if medication has usage limits and calculate status
  const getUsageStatus = () => {
    if (!medication.maxUsageDays) return null;

    const daysUsed = usageStats.daysUsed;
    const maxDays = medication.maxUsageDays;

    if (daysUsed >= maxDays) {
      return {
        type: 'exceeded',
        message: `Exceeded limit (${daysUsed}/${maxDays} days)`,
        color: 'text-red-600 bg-red-100'
      };
    } else if (daysUsed >= Math.floor(maxDays * 0.8)) {
      return {
        type: 'warning',
        message: `${maxDays - daysUsed} days remaining`,
        color: 'text-orange-600 bg-orange-100'
      };
    } else if (daysUsed > 0) {
      return {
        type: 'tracking',
        message: `${daysUsed}/${maxDays} days used`,
        color: 'text-blue-600 bg-blue-100'
      };
    }

    return null;
  };

  // Check if medication is overdue for scheduled medications
  const getOverdueStatus = () => {
    if (medication.frequency === 'As required' || !medication.active) return null;

    // Find the most recent check-in where this medication was taken
    const lastTakenEntry = recentCheckIns
      .filter(checkIn => 
        checkIn.medicationEntries.some(entry => 
          entry.medicationId === medication.id && entry.taken
        )
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!lastTakenEntry) {
      return {
        type: 'no-data',
        message: 'No recent usage data',
        color: 'text-gray-500 bg-gray-100',
        daysSince: null
      };
    }

    const daysSinceLastTaken = differenceInDays(new Date(), parseISO(lastTakenEntry.date));
    const lastTakenDate = format(parseISO(lastTakenEntry.date), 'MMM d');

    // Determine if overdue based on frequency
    let isOverdue = false;
    let expectedInterval = 1; // Default to daily

    switch (medication.frequency.toLowerCase()) {
      case 'once daily':
      case 'daily':
        expectedInterval = 1;
        break;
      case 'twice daily':
        expectedInterval = 1; // Still expect daily usage
        break;
      case 'three times daily':
      case 'four times daily':
        expectedInterval = 1; // Still expect daily usage
        break;
      case 'every 8 hours':
      case 'every 12 hours':
        expectedInterval = 1; // Still expect daily usage
        break;
      case 'weekly':
        expectedInterval = 7;
        break;
      case 'fortnightly':
        expectedInterval = 14;
        break;
      case 'monthly':
        expectedInterval = 30;
        break;
      default:
        expectedInterval = 1; // Default to daily
    }

    isOverdue = daysSinceLastTaken > expectedInterval + 1; // Allow 1 day grace period

    if (isOverdue) {
      return {
        type: 'overdue',
        message: `Overdue (last taken ${lastTakenDate})`,
        color: 'text-red-600 bg-red-100',
        daysSince: daysSinceLastTaken
      };
    } else if (daysSinceLastTaken === expectedInterval) {
      return {
        type: 'due-soon',
        message: `Due soon (last taken ${lastTakenDate})`,
        color: 'text-orange-600 bg-orange-100',
        daysSince: daysSinceLastTaken
      };
    } else {
      return {
        type: 'up-to-date',
        message: `Last taken ${lastTakenDate}`,
        color: 'text-green-600 bg-green-100',
        daysSince: daysSinceLastTaken
      };
    }
  };

  const usageStatus = getUsageStatus();
  const overdueStatus = getOverdueStatus();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="p-4 pr-16"> {/* Add right padding to account for absolute positioned buttons */}
        {/* Header with medication name and status */}
        <div className="mb-3">
          <div className="mb-2">
            <h3 className="font-medium text-neutral-800">{medication.name}</h3>
            <div className="flex items-center mt-1">
              <span className="text-sm text-neutral-500">{medication.dosage} • {medication.frequency}</span>
              {medication.frequency === 'As required' && (
                <>
                  <span className="mx-2 text-neutral-300">•</span>
                  <span className="text-xs text-neutral-500">PRN</span>
                </>
              )}
            </div>
          </div>
          
          {/* Status indicators - positioned below the name */}
          <div className="flex flex-wrap gap-2">
            <div className={`rounded-full px-2 py-1 text-xs font-medium ${
              medication.active ? 'bg-success-500/10 text-success-500' : 'bg-neutral-100 text-neutral-500'
            }`}>
              {medication.active ? 'Active' : 'Inactive'}
            </div>
            
            {/* Overdue status indicator for scheduled medications */}
            {overdueStatus && medication.frequency !== 'As required' && (
              <div className={`rounded-full px-2 py-1 text-xs font-medium flex items-center ${overdueStatus.color}`}>
                {overdueStatus.type === 'overdue' && <AlertTriangle size={12} className="mr-1" />}
                {overdueStatus.type === 'due-soon' && <Clock size={12} className="mr-1" />}
                {overdueStatus.type === 'up-to-date' && <CheckCircle size={12} className="mr-1" />}
                <span>{overdueStatus.message}</span>
              </div>
            )}
            
            {/* Usage status indicator */}
            {usageStatus && (
              <div className={`rounded-full px-2 py-1 text-xs font-medium flex items-center ${usageStatus.color}`}>
                {usageStatus.type === 'exceeded' && <AlertTriangle size={12} className="mr-1" />}
                <span>{usageStatus.message}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Show associated conditions */}
        {associatedConditions.length > 0 && !compact && (
          <div className="mb-3 flex flex-wrap gap-1">
            {associatedConditions.map(condition => (
              <div key={condition.id} className="flex items-center text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                <div 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: condition.color }}
                ></div>
                {condition.name}
              </div>
            ))}
          </div>
        )}
        
        {/* Latest usage info - show for all medications */}
        {!compact && (
          <div className="mt-3">
            {latestEntry ? (
              <div className="flex items-center">
                <div className={`mr-2 ${
                  latestEntry.entry.taken ? 'text-success-500' : 'text-error-500'
                }`}>
                  {latestEntry.entry.taken ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </div>
                <span className="text-sm text-neutral-600">
                  {latestEntry.entry.taken 
                    ? `Taken on ${new Date(latestEntry.date).toLocaleDateString()}`
                    : medication.frequency === 'As required'
                      ? "Not taken recently"
                      : `Missed on ${new Date(latestEntry.date).toLocaleDateString()}`
                  }
                  {latestEntry.entry.timesTaken && latestEntry.entry.timesTaken > 1 && (
                    <span className="text-neutral-500"> ({latestEntry.entry.timesTaken}x)</span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="mr-2 text-neutral-400">
                  <Clock size={16} />
                </div>
                <span className="text-sm text-neutral-500">No usage data available</span>
              </div>
            )}
          </div>
        )}

        {/* Usage statistics for medications with limits */}
        {medication.maxUsageDays && usageStats.daysUsed > 0 && !compact && (
          <div className="mt-3 bg-neutral-50 rounded-lg p-3">
            <div className="text-xs text-neutral-500 mb-1">Usage Statistics</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-neutral-500">Total days:</span>
                <span className="font-medium ml-1">{usageStats.daysUsed}</span>
              </div>
              <div>
                <span className="text-neutral-500">Total doses:</span>
                <span className="font-medium ml-1">{usageStats.totalDoses}</span>
              </div>
            </div>
          </div>
        )}
        
        {medication.notes && !compact && (
          <p className="mt-3 text-sm text-neutral-600">{medication.notes}</p>
        )}
      </div>
    </div>
  );
};

export default MedicationCard;