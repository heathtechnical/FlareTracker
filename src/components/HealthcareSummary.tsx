import React, { useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';
import { CheckIn, SkinCondition, Medication } from '../types';

interface HealthcareSummaryProps {
  startDate: Date;
  endDate: Date;
  checkIns: CheckIn[];
  onClose: () => void;
}

const HealthcareSummary: React.FC<HealthcareSummaryProps> = ({
  startDate,
  endDate,
  checkIns,
  onClose
}) => {
  const { user } = useApp();

  const summaryData = useMemo(() => {
    if (!user) return null;

    // Filter check-ins for the selected period
    const periodCheckIns = checkIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.date);
      return checkInDate >= startDate && checkInDate <= endDate;
    });

    // Calculate condition statistics
    const conditionStats = user.conditions.map(condition => {
      const conditionEntries = periodCheckIns
        .flatMap(checkIn => 
          checkIn.conditionEntries.filter(entry => entry.conditionId === condition.id)
        );

      if (conditionEntries.length === 0) {
        return {
          condition,
          totalDays: 0,
          averageSeverity: 0,
          severityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          commonSymptoms: [],
          bestDay: null,
          worstDay: null
        };
      }

      const severities = conditionEntries.map(entry => entry.severity);
      const averageSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;

      // Severity distribution
      const severityDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      severities.forEach(severity => {
        severityDistribution[severity as keyof typeof severityDistribution]++;
      });

      // Common symptoms
      const symptomCounts: Record<string, number> = {};
      conditionEntries.forEach(entry => {
        entry.symptoms.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
      });

      const commonSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom, count]) => ({
          symptom,
          count,
          percentage: Math.round((count / conditionEntries.length) * 100)
        }));

      // Best and worst days
      const entriesWithDates = periodCheckIns
        .map(checkIn => ({
          date: checkIn.date,
          entry: checkIn.conditionEntries.find(entry => entry.conditionId === condition.id)
        }))
        .filter(item => item.entry);

      const bestDay = entriesWithDates.reduce((best, current) => 
        !best || (current.entry!.severity < best.entry!.severity) ? current : best
      );

      const worstDay = entriesWithDates.reduce((worst, current) => 
        !worst || (current.entry!.severity > worst.entry!.severity) ? current : worst
      );

      return {
        condition,
        totalDays: conditionEntries.length,
        averageSeverity,
        severityDistribution,
        commonSymptoms,
        bestDay: bestDay ? { date: bestDay.date, severity: bestDay.entry!.severity } : null,
        worstDay: worstDay ? { date: worstDay.date, severity: worstDay.entry!.severity } : null
      };
    });

    // Calculate medication statistics
    const medicationStats = user.medications
      .filter(med => med.active)
      .map(medication => {
        const medicationEntries = periodCheckIns
          .flatMap(checkIn => 
            checkIn.medicationEntries.filter(entry => entry.medicationId === medication.id)
          );

        const takenEntries = medicationEntries.filter(entry => entry.taken);
        const adherenceRate = medicationEntries.length > 0 
          ? Math.round((takenEntries.length / medicationEntries.length) * 100)
          : 0;

        const totalDoses = takenEntries.reduce((sum, entry) => sum + (entry.timesTaken || 1), 0);

        // Skip reasons analysis
        const skippedEntries = medicationEntries.filter(entry => !entry.taken && entry.skippedReason);
        const skipReasons: Record<string, number> = {};
        skippedEntries.forEach(entry => {
          if (entry.skippedReason) {
            skipReasons[entry.skippedReason] = (skipReasons[entry.skippedReason] || 0) + 1;
          }
        });

        return {
          medication,
          totalDays: medicationEntries.length,
          daysTaken: takenEntries.length,
          adherenceRate,
          totalDoses,
          skipReasons: Object.entries(skipReasons).sort((a, b) => b[1] - a[1])
        };
      });

    // Overall statistics
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const checkInDays = periodCheckIns.length;
    const trackingConsistency = Math.round((checkInDays / totalDays) * 100);

    // Lifestyle factors analysis
    const lifestyleFactors = {
      stress: [] as number[],
      sleep: [] as number[],
      water: [] as number[],
      diet: [] as number[]
    };

    periodCheckIns.forEach(checkIn => {
      if (checkIn.factors.stress) lifestyleFactors.stress.push(checkIn.factors.stress);
      if (checkIn.factors.sleep) lifestyleFactors.sleep.push(checkIn.factors.sleep);
      if (checkIn.factors.water) lifestyleFactors.water.push(checkIn.factors.water);
      if (checkIn.factors.diet) lifestyleFactors.diet.push(checkIn.factors.diet);
    });

    const lifestyleAverages = {
      stress: lifestyleFactors.stress.length > 0 
        ? lifestyleFactors.stress.reduce((sum, val) => sum + val, 0) / lifestyleFactors.stress.length
        : null,
      sleep: lifestyleFactors.sleep.length > 0 
        ? lifestyleFactors.sleep.reduce((sum, val) => sum + val, 0) / lifestyleFactors.sleep.length
        : null,
      water: lifestyleFactors.water.length > 0 
        ? lifestyleFactors.water.reduce((sum, val) => sum + val, 0) / lifestyleFactors.water.length
        : null,
      diet: lifestyleFactors.diet.length > 0 
        ? lifestyleFactors.diet.reduce((sum, val) => sum + val, 0) / lifestyleFactors.diet.length
        : null
    };

    return {
      conditionStats,
      medicationStats,
      totalDays,
      checkInDays,
      trackingConsistency,
      lifestyleAverages
    };
  }, [user, checkIns, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  if (!user || !summaryData) return null;

  const severityLabels = ['', 'Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
        {/* Header - Hidden in print */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Healthcare Provider Summary</h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Print Summary
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          <div className="print:text-black">
            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">FlareTracker Health Summary</h1>
              <p className="text-lg text-gray-700 mt-2">Patient: {user.name}</p>
              <p className="text-sm text-gray-600">
                Period: {format(startDate, 'MMMM d, yyyy')} - {format(endDate, 'MMMM d, yyyy')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Generated on {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Overview Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                  <div className="text-sm text-gray-600">Total Period</div>
                  <div className="text-xl font-semibold text-gray-900">{summaryData.totalDays} days</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                  <div className="text-sm text-gray-600">Check-ins Completed</div>
                  <div className="text-xl font-semibold text-gray-900">{summaryData.checkInDays} days</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                  <div className="text-sm text-gray-600">Tracking Consistency</div>
                  <div className="text-xl font-semibold text-gray-900">{summaryData.trackingConsistency}%</div>
                </div>
              </div>
            </div>

            {/* Conditions Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                Skin Conditions Summary
              </h3>
              {summaryData.conditionStats.map(stat => (
                <div key={stat.condition.id} className="mb-6 bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                  <div className="flex items-center mb-3">
                    <div 
                      className="w-4 h-4 rounded-full mr-3 print:border print:border-gray-400" 
                      style={{ backgroundColor: stat.condition.color }}
                    ></div>
                    <h4 className="text-lg font-medium text-gray-800">{stat.condition.name}</h4>
                  </div>
                  
                  {stat.totalDays > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="mb-3">
                          <div className="text-sm text-gray-600">Average Severity</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {stat.averageSeverity.toFixed(1)}/5 ({severityLabels[Math.round(stat.averageSeverity)]})
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-sm text-gray-600">Days Tracked</div>
                          <div className="text-lg font-semibold text-gray-900">{stat.totalDays}</div>
                        </div>

                        {stat.bestDay && stat.worstDay && (
                          <div className="mb-3">
                            <div className="text-sm text-gray-600">Best/Worst Days</div>
                            <div className="text-sm text-gray-700">
                              Best: {format(new Date(stat.bestDay.date), 'MMM d')} (Severity {stat.bestDay.severity})
                            </div>
                            <div className="text-sm text-gray-700">
                              Worst: {format(new Date(stat.worstDay.date), 'MMM d')} (Severity {stat.worstDay.severity})
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="mb-3">
                          <div className="text-sm text-gray-600 mb-2">Severity Distribution</div>
                          {Object.entries(stat.severityDistribution).map(([severity, count]) => (
                            <div key={severity} className="flex justify-between text-sm">
                              <span>{severityLabels[parseInt(severity)]}</span>
                              <span>{count} days ({Math.round((count / stat.totalDays) * 100)}%)</span>
                            </div>
                          ))}
                        </div>

                        {stat.commonSymptoms.length > 0 && (
                          <div>
                            <div className="text-sm text-gray-600 mb-2">Most Common Symptoms</div>
                            {stat.commonSymptoms.slice(0, 3).map(({ symptom, percentage }) => (
                              <div key={symptom} className="flex justify-between text-sm">
                                <span>{symptom}</span>
                                <span>{percentage}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">No data recorded for this condition during the selected period.</div>
                  )}
                </div>
              ))}
            </div>

            {/* Medications Section */}
            {summaryData.medicationStats.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                  Medication Summary
                </h3>
                {summaryData.medicationStats.map(stat => (
                  <div key={stat.medication.id} className="mb-4 bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800">{stat.medication.name}</h4>
                        <p className="text-sm text-gray-600">{stat.medication.dosage} • {stat.medication.frequency}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">{stat.adherenceRate}%</div>
                        <div className="text-xs text-gray-500">Adherence</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Days Prescribed:</span>
                        <span className="font-medium ml-1">{stat.totalDays}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Days Taken:</span>
                        <span className="font-medium ml-1">{stat.daysTaken}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Doses:</span>
                        <span className="font-medium ml-1">{stat.totalDoses}</span>
                      </div>
                    </div>

                    {stat.skipReasons.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 mb-1">Reasons for Missing Doses:</div>
                        {stat.skipReasons.map(([reason, count]) => (
                          <div key={reason} className="text-sm text-gray-700">
                            • {reason}: {count} times
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Lifestyle Factors Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                Lifestyle Factors (Average)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryData.lifestyleAverages.stress && (
                  <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-600">Stress Level</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {summaryData.lifestyleAverages.stress.toFixed(1)}/5
                    </div>
                  </div>
                )}
                {summaryData.lifestyleAverages.sleep && (
                  <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-600">Sleep Quality</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {summaryData.lifestyleAverages.sleep.toFixed(1)}/5
                    </div>
                  </div>
                )}
                {summaryData.lifestyleAverages.water && (
                  <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-600">Water Intake</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {summaryData.lifestyleAverages.water.toFixed(1)}/5
                    </div>
                  </div>
                )}
                {summaryData.lifestyleAverages.diet && (
                  <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
                    <div className="text-sm text-gray-600">Diet Quality</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {summaryData.lifestyleAverages.diet.toFixed(1)}/5
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer for print */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>This report was generated by FlareTracker - Advanced Skin Health Analytics</p>
              <p>Please discuss these findings with your healthcare provider</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 1in;
            size: letter;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\\:border-gray-400 {
            border-color: #9ca3af !important;
          }
          
          .print\\:text-black {
            color: black !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HealthcareSummary;