import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import LineChart from '../components/LineChart';
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns';

const Trends: React.FC = () => {
  const { user } = useApp();
  const [timeRange, setTimeRange] = useState<7 | 14 | 30 | 90>(7);
  const [showMedications, setShowMedications] = useState(true);
  
  // Lifestyle factors controls
  const [selectedFactors, setSelectedFactors] = useState<{
    stress: boolean;
    sleep: boolean;
    water: boolean;
    diet: boolean;
  }>({
    stress: false,
    sleep: false,
    water: false,
    diet: false
  });
  
  const chartData = useMemo(() => {
    if (!user) return [];
    
    // Get date range
    const endDate = new Date();
    const startDate = subDays(endDate, timeRange);
    
    // Create array of all dates in range
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get check-ins for the selected time range
    const relevantCheckIns = user.checkIns
      .filter(checkIn => {
        const checkInDate = new Date(checkIn.date);
        return checkInDate >= startDate && checkInDate <= endDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Create a map of dates to check-ins for quick lookup
    const checkInsByDate = new Map();
    relevantCheckIns.forEach(checkIn => {
      const dateKey = format(new Date(checkIn.date), 'yyyy-MM-dd');
      checkInsByDate.set(dateKey, checkIn);
    });
    
    // Prepare data for each condition
    return user.conditions.map(condition => {
      // Create data points for all dates, filling in gaps with null
      const conditionData = allDates.map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const checkIn = checkInsByDate.get(dateKey);
        
        if (checkIn) {
          const entry = checkIn.conditionEntries.find(
            entry => entry.conditionId === condition.id
          );
          return {
            date: format(date, 'MMM d'),
            severity: entry?.severity || null
          };
        }
        
        return {
          date: format(date, 'MMM d'),
          severity: null
        };
      });
      
      // Get medications for this specific condition
      const conditionMedications = user.medications.filter(med => 
        med.conditionIds.includes(condition.id)
      );
      
      // Create medication data array that matches the chart structure
      // Position medication points at the same severity level as the condition
      const medicationData = allDates.map((date, index) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const checkIn = checkInsByDate.get(dateKey);
        
        if (!checkIn) return null;
        
        // Find the condition entry for this date to get the severity
        const conditionEntry = checkIn.conditionEntries.find(
          entry => entry.conditionId === condition.id
        );
        
        if (!conditionEntry) return null;
        
        // Find medication entries for this condition's medications
        const conditionMedicationEntries = checkIn.medicationEntries.filter(entry =>
          conditionMedications.some(med => med.id === entry.medicationId)
        );
        
        if (conditionMedicationEntries.length === 0) return null;
        
        const takenMedications = conditionMedicationEntries.filter(entry => entry.taken);
        
        // Only show point if any medications for this condition were taken
        // Position at the same severity level as the condition
        if (takenMedications.length > 0) {
          return conditionEntry.severity;
        }
        return null;
      });
      
      // Get medication usage points for tooltip data
      const medicationPoints = allDates
        .map((date, index) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const checkIn = checkInsByDate.get(dateKey);
          
          if (!checkIn) return null;
          
          // Find the condition entry for this date to get the severity
          const conditionEntry = checkIn.conditionEntries.find(
            entry => entry.conditionId === condition.id
          );
          
          if (!conditionEntry) return null;
          
          // Find medication entries for this condition's medications
          const conditionMedicationEntries = checkIn.medicationEntries.filter(entry =>
            conditionMedications.some(med => med.id === entry.medicationId)
          );
          
          if (conditionMedicationEntries.length === 0) return null;
          
          const takenMedications = conditionMedicationEntries.filter(entry => entry.taken);
          
          // Only show point if any medications for this condition were taken
          if (takenMedications.length > 0) {
            return {
              x: index,
              y: conditionEntry.severity, // Use the actual severity value
              date: format(date, 'MMM d'),
              takenCount: takenMedications.length,
              totalCount: conditionMedicationEntries.length,
              medications: takenMedications.map(entry => {
                const med = user.medications.find(m => m.id === entry.medicationId);
                return med ? med.name : 'Unknown';
              })
            };
          }
          return null;
        })
        .filter(point => point !== null);

      // Create lifestyle factors data
      const lifestyleFactorsData = {
        stress: allDates.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const checkIn = checkInsByDate.get(dateKey);
          return checkIn?.factors?.stress || null;
        }),
        sleep: allDates.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const checkIn = checkInsByDate.get(dateKey);
          return checkIn?.factors?.sleep || null;
        }),
        water: allDates.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const checkIn = checkInsByDate.get(dateKey);
          return checkIn?.factors?.water || null;
        }),
        diet: allDates.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const checkIn = checkInsByDate.get(dateKey);
          return checkIn?.factors?.diet || null;
        })
      };
      
      return {
        condition,
        conditionData,
        medicationData,
        medicationPoints,
        conditionMedications,
        lifestyleFactorsData
      };
    });
  }, [user, timeRange]);

  const toggleLifestyleFactor = (factor: keyof typeof selectedFactors) => {
    setSelectedFactors(prev => ({
      ...prev,
      [factor]: !prev[factor]
    }));
  };
  
  if (!user) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Trends & Analysis</h1>
          <p className="text-gray-600">
            Track your skin health patterns over time
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="show-medications"
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showMedications}
              onChange={(e) => setShowMedications(e.target.checked)}
            />
            <label htmlFor="show-medications" className="ml-2 text-sm text-gray-700">
              Show medication usage
            </label>
          </div>

          <select
            className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 14 | 30 | 90)}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Lifestyle Factors Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Select Lifestyle Factors</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
              checked={selectedFactors.stress}
              onChange={() => toggleLifestyleFactor('stress')}
            />
            <span className="ml-2 text-sm text-gray-700">Stress Level</span>
            <div className="w-3 h-3 rounded-full bg-orange-500 ml-2"></div>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={selectedFactors.sleep}
              onChange={() => toggleLifestyleFactor('sleep')}
            />
            <span className="ml-2 text-sm text-gray-700">Sleep Quality</span>
            <div className="w-3 h-3 rounded-full bg-blue-500 ml-2"></div>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
              checked={selectedFactors.water}
              onChange={() => toggleLifestyleFactor('water')}
            />
            <span className="ml-2 text-sm text-gray-700">Water Intake</span>
            <div className="w-3 h-3 rounded-full bg-cyan-500 ml-2"></div>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
              checked={selectedFactors.diet}
              onChange={() => toggleLifestyleFactor('diet')}
            />
            <span className="ml-2 text-sm text-gray-700">Diet Quality</span>
            <div className="w-3 h-3 rounded-full bg-green-500 ml-2"></div>
          </label>
        </div>
      </div>
      
      {user.conditions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-100 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No conditions to analyze</h3>
          <p className="text-gray-600">
            Add your first skin condition to start tracking trends.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {chartData.map(({ condition, conditionData, medicationData, medicationPoints, conditionMedications, lifestyleFactorsData }) => {
            // Filter out null values for the line chart but keep the indices aligned
            const severityData = conditionData.map(d => d.severity);
            
            const datasets = [
              {
                label: 'Severity',
                data: severityData,
                borderColor: condition.color,
                backgroundColor: `${condition.color}33`,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 6,
                spanGaps: true, // This will connect points across null values
                order: 10 // Higher order = rendered first (behind)
              }
            ];
            
            // Add medication points dataset if enabled
            if (showMedications && medicationData.some(point => point !== null)) {
              datasets.push({
                label: 'Medication Taken',
                data: medicationData,
                borderColor: '#10B981',
                backgroundColor: '#10B981',
                showLine: false, // Only show points, no line
                pointRadius: 8, // Larger points for better visibility
                pointHoverRadius: 12,
                pointStyle: 'rect', // Squares for medication points
                tension: 0,
                order: 1 // Lower order = rendered last (on top)
              });
            }

            // Add lifestyle factors if enabled
            const factorColors = {
              stress: '#F97316', // Orange
              sleep: '#3B82F6',  // Blue
              water: '#06B6D4',  // Cyan
              diet: '#10B981'    // Green
            };

            const factorLabels = {
              stress: 'Stress Level',
              sleep: 'Sleep Quality',
              water: 'Water Intake',
              diet: 'Diet Quality'
            };

            Object.entries(selectedFactors).forEach(([factor, isSelected]) => {
              if (isSelected && lifestyleFactorsData[factor as keyof typeof lifestyleFactorsData]) {
                datasets.push({
                  label: factorLabels[factor as keyof typeof factorLabels],
                  data: lifestyleFactorsData[factor as keyof typeof lifestyleFactorsData],
                  borderColor: factorColors[factor as keyof typeof factorColors],
                  backgroundColor: `${factorColors[factor as keyof typeof factorColors]}33`,
                  tension: 0.3,
                  pointRadius: 3,
                  pointHoverRadius: 6,
                  spanGaps: true,
                  borderDash: [5, 5], // Dashed line to differentiate from severity
                  order: 5 // Middle order
                });
              }
            });
          
            return (
              <div key={condition.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: condition.color }}
                    ></div>
                    <h2 className="text-lg font-medium text-gray-800">{condition.name}</h2>
                  </div>
                  
                  {/* Show associated medications */}
                  {conditionMedications.length > 0 && (
                    <div className="text-sm text-gray-500">
                      Medications: {conditionMedications.map(med => med.name).join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <LineChart
                    title=""
                    labels={conditionData.map(d => d.date)}
                    datasets={datasets}
                    showMedicationPoints={showMedications}
                    medicationData={medicationPoints}
                  />
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-0.5 mr-2" 
                      style={{ backgroundColor: condition.color }}
                    ></div>
                    <span className="text-gray-600">Condition Severity</span>
                  </div>
                  {showMedications && medicationData.some(point => point !== null) && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 mr-2 bg-green-500"></div>
                      <span className="text-gray-600">Medication Taken</span>
                    </div>
                  )}
                  {Object.entries(selectedFactors).map(([factor, isSelected]) => {
                    if (!isSelected) return null;
                    const colors = {
                      stress: 'bg-orange-500',
                      sleep: 'bg-blue-500',
                      water: 'bg-cyan-500',
                      diet: 'bg-green-500'
                    };
                    const labels = {
                      stress: 'Stress Level',
                      sleep: 'Sleep Quality',
                      water: 'Water Intake',
                      diet: 'Diet Quality'
                    };
                    return (
                      <div key={factor} className="flex items-center">
                        <div className={`w-3 h-0.5 mr-2 ${colors[factor as keyof typeof colors]}`}></div>
                        <span className="text-gray-600">{labels[factor as keyof typeof labels]}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average Severity</p>
                    <p className="text-lg font-medium text-gray-800">
                      {conditionData.filter(d => d.severity !== null).length > 0 
                        ? (conditionData
                            .filter(d => d.severity !== null)
                            .reduce((sum, d) => sum + (d.severity || 0), 0) / 
                           conditionData.filter(d => d.severity !== null).length
                          ).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Highest Severity</p>
                    <p className="text-lg font-medium text-gray-800">
                      {conditionData.filter(d => d.severity !== null).length > 0 
                        ? Math.max(...conditionData.filter(d => d.severity !== null).map(d => d.severity || 0))
                        : '0'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Lowest Severity</p>
                    <p className="text-lg font-medium text-gray-800">
                      {conditionData.filter(d => d.severity !== null && d.severity > 0).length > 0 
                        ? Math.min(...conditionData.filter(d => d.severity !== null && d.severity > 0).map(d => d.severity || 0))
                        : '0'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Days with Meds</p>
                    <p className="text-lg font-medium text-gray-800">
                      {medicationData.filter(point => point !== null).length}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Trends;