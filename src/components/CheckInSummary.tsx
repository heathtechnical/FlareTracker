import React from 'react';
import { format } from 'date-fns';
import { SeverityLevel, CheckIn, SkinCondition, Medication } from '../types';
import SeverityScale from './SeverityScale';
import { Pill, CheckCircle, XCircle } from 'lucide-react';

interface CheckInSummaryProps {
  checkIn: CheckIn;
  conditions: SkinCondition[];
  medications: Medication[];
  compact?: boolean;
}

const CheckInSummary: React.FC<CheckInSummaryProps> = ({ 
  checkIn, 
  conditions,
  medications,
  compact = false 
}) => {
  const getConditionName = (id: string): string => {
    const condition = conditions.find(c => c.id === id);
    return condition ? condition.name : 'Unknown Condition';
  };
  
  const getConditionColor = (id: string): string => {
    const condition = conditions.find(c => c.id === id);
    return condition ? condition.color : '#6B7280';
  };
  
  const getMedicationName = (id: string): string => {
    const medication = medications.find(m => m.id === id);
    return medication ? medication.name : 'Unknown Medication';
  };

  // Get medications for a specific condition - only show taken medications
  const getMedicationsForCondition = (conditionId: string) => {
    const conditionMedications = medications.filter(med => 
      med.conditionIds.includes(conditionId)
    );
    
    return conditionMedications.map(med => {
      const entry = checkIn.medicationEntries.find(entry => entry.medicationId === med.id);
      return {
        medication: med,
        entry: entry
      };
    }).filter(item => item.entry && item.entry.taken); // Only include taken medications
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-neutral-800">
            {format(new Date(checkIn.date), 'EEEE, MMMM d, yyyy')}
          </h3>
        </div>
        
        {/* Conditions */}
        {checkIn.conditionEntries.length > 0 && (
          <div className={compact ? "mb-3" : "mb-4"}>
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Conditions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {checkIn.conditionEntries.map(entry => {
                const conditionMedications = getMedicationsForCondition(entry.conditionId);
                const conditionColor = getConditionColor(entry.conditionId);
                
                return (
                  <div 
                    key={entry.conditionId} 
                    className="bg-neutral-50 rounded-lg overflow-hidden border-l-4"
                    style={{ borderLeftColor: conditionColor }}
                  >
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-neutral-800 text-sm sm:text-base">
                          {getConditionName(entry.conditionId)}
                        </span>
                      </div>
                      
                      {/* Severity and Symptoms Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <span className="text-xs text-neutral-500 mb-1 block">Severity</span>
                          <SeverityScale 
                            value={entry.severity as SeverityLevel} 
                            onChange={() => {}} 
                            size="sm"
                            showLabels={false}
                            readonly={true}
                          />
                        </div>
                        
                        {/* Symptoms on the right */}
                        {!compact && entry.symptoms.length > 0 && (
                          <div className="ml-4 flex-shrink-0 max-w-[50%]">
                            <div className="text-xs text-neutral-500 mb-1">Symptoms</div>
                            <div className="flex flex-wrap gap-1">
                              {entry.symptoms.map(symptom => (
                                <span 
                                  key={symptom} 
                                  className="inline-block text-xs bg-white text-neutral-600 px-2 py-1 rounded-full border border-neutral-200"
                                >
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Medications below - only show taken medications */}
                      {conditionMedications.length > 0 && (
                        <div className="border-t border-neutral-200 pt-3">
                          <div className="flex items-center mb-2">
                            <Pill size={14} className="text-neutral-400 mr-1" />
                            <span className="text-xs text-neutral-500 font-medium">Medications Taken</span>
                          </div>
                          <div className="space-y-2">
                            {conditionMedications.map(({ medication, entry }) => (
                              <div
                                key={medication.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-neutral-700 flex-1 truncate">
                                  {medication.name}
                                </span>
                                <div className="flex items-center ml-2">
                                  <div className="flex items-center text-success-600">
                                    <CheckCircle size={12} className="mr-1" />
                                    <span>Taken</span>
                                    {entry?.timesTaken && entry.timesTaken > 1 && (
                                      <span className="ml-1 text-neutral-500">({entry.timesTaken}x)</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Factors */}
        {!compact && checkIn.factors && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Lifestyle Factors</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {checkIn.factors.stress && (
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Stress Level</div>
                  <SeverityScale 
                    value={checkIn.factors.stress} 
                    onChange={() => {}} 
                    size="sm"
                    showLabels={false}
                    readonly={true}
                  />
                </div>
              )}
              
              {checkIn.factors.sleep && (
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Sleep Quality</div>
                  <SeverityScale 
                    value={checkIn.factors.sleep} 
                    onChange={() => {}} 
                    size="sm"
                    showLabels={false}
                    readonly={true}
                  />
                </div>
              )}
              
              {checkIn.factors.water && (
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Water Intake</div>
                  <SeverityScale 
                    value={checkIn.factors.water} 
                    onChange={() => {}} 
                    size="sm"
                    showLabels={false}
                    readonly={true}
                  />
                </div>
              )}
              
              {checkIn.factors.diet && (
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Diet Quality</div>
                  <SeverityScale 
                    value={checkIn.factors.diet} 
                    onChange={() => {}} 
                    size="sm"
                    showLabels={false}
                    readonly={true}
                  />
                </div>
              )}
              
              {checkIn.factors.weather && (
                <div className="bg-neutral-50 p-3 rounded-lg">
                  <div className="text-xs text-neutral-500 mb-1">Weather</div>
                  <div className="text-sm font-medium text-neutral-700">
                    {checkIn.factors.weather}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Notes */}
        {!compact && checkIn.notes && (
          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-2">Notes</h4>
            <div className="bg-neutral-50 p-3 rounded-lg">
              <p className="text-sm text-neutral-700">{checkIn.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckInSummary;