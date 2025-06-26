import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Edit, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { useApp } from '../context/AppContext';
import LineChart from '../components/LineChart';
import SeverityScale from '../components/SeverityScale';

const ConditionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, getConditionById } = useApp();
  
  const condition = useMemo(() => {
    if (!id || !user) return null;
    return getConditionById(id);
  }, [id, user, getConditionById]);
  
  if (!condition || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle size={48} className="text-orange-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Condition Not Found</h2>
        <p className="text-gray-600 mb-6">We couldn't find the condition you're looking for.</p>
        <Link
          to="/conditions"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ChevronLeft size={18} className="mr-2" />
          Back to Conditions
        </Link>
      </div>
    );
  }
  
  // Get check-ins for this condition
  const conditionCheckIns = user.checkIns
    .filter(checkIn => 
      checkIn.conditionEntries.some(entry => entry.conditionId === condition.id)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate average severity
  const calculateAverageSeverity = () => {
    if (conditionCheckIns.length === 0) return 0;
    
    const sum = conditionCheckIns.reduce((total, checkIn) => {
      const entry = checkIn.conditionEntries.find(
        entry => entry.conditionId === condition.id
      );
      return total + (entry?.severity || 0);
    }, 0);
    
    return sum / conditionCheckIns.length;
  };
  
  const averageSeverity = calculateAverageSeverity();

  // Prepare chart data
  const chartData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const recentCheckIns = conditionCheckIns
      .filter(checkIn => new Date(checkIn.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const labels = recentCheckIns.map(checkIn => 
      format(parseISO(checkIn.date), 'MMM d')
    );

    const severityData = recentCheckIns.map(checkIn => {
      const entry = checkIn.conditionEntries.find(
        entry => entry.conditionId === condition.id
      );
      return entry?.severity || 0;
    });

    return {
      labels,
      datasets: [{
        label: 'Severity',
        data: severityData,
        borderColor: condition.color || '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3
      }]
    };
  }, [conditionCheckIns, condition.id, condition.color]);
  
  // Get most common symptoms
  const getMostCommonSymptoms = () => {
    const symptoms: Record<string, number> = {};
    
    conditionCheckIns.forEach(checkIn => {
      const entry = checkIn.conditionEntries.find(
        entry => entry.conditionId === condition.id
      );
      
      entry?.symptoms.forEach(symptom => {
        symptoms[symptom] = (symptoms[symptom] || 0) + 1;
      });
    });
    
    return Object.entries(symptoms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symptom, count]) => ({
        symptom,
        count,
        percentage: Math.round((count / conditionCheckIns.length) * 100)
      }));
  };
  
  const commonSymptoms = getMostCommonSymptoms();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(-1)}
          className="mr-3 text-gray-600 hover:text-blue-600"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">{condition.name}</h1>
        <div 
          className="w-3 h-3 rounded-full ml-3" 
          style={{ backgroundColor: condition.color }}
        ></div>
      </div>
      
      {condition.description && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-gray-600">{condition.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">First Recorded</h3>
          <p className="text-lg font-semibold text-gray-800">
            {format(parseISO(condition.createdAt), 'MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Check-ins</h3>
          <p className="text-lg font-semibold text-gray-800">{conditionCheckIns.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Severity</h3>
          <p className="text-lg font-semibold text-gray-800">{averageSeverity.toFixed(1)}/5</p>
        </div>
      </div>
      
      {/* Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Severity Trends</h3>
        <LineChart 
          title={`${condition.name} Severity - Last 30 Days`}
          labels={chartData.labels}
          datasets={chartData.datasets}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Common Symptoms */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Common Symptoms</h3>
          
          {commonSymptoms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No symptom data recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {commonSymptoms.map(({ symptom, percentage }) => (
                <div key={symptom}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">{symptom}</span>
                    <span className="text-sm text-gray-500">{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Stats</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Best day (lowest severity):</span>
              <span className="text-sm font-medium">
                {conditionCheckIns.length > 0 
                  ? Math.min(...conditionCheckIns.map(ci => {
                      const entry = ci.conditionEntries.find(e => e.conditionId === condition.id);
                      return entry?.severity || 5;
                    }))
                  : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Worst day (highest severity):</span>
              <span className="text-sm font-medium">
                {conditionCheckIns.length > 0 
                  ? Math.max(...conditionCheckIns.map(ci => {
                      const entry = ci.conditionEntries.find(e => e.conditionId === condition.id);
                      return entry?.severity || 0;
                    }))
                  : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Days with severity ≥ 4:</span>
              <span className="text-sm font-medium">
                {conditionCheckIns.filter(ci => {
                  const entry = ci.conditionEntries.find(e => e.conditionId === condition.id);
                  return entry && entry.severity >= 4;
                }).length}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Days with severity ≤ 2:</span>
              <span className="text-sm font-medium">
                {conditionCheckIns.filter(ci => {
                  const entry = ci.conditionEntries.find(e => e.conditionId === condition.id);
                  return entry && entry.severity <= 2 && entry.severity > 0;
                }).length}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Check-ins */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Recent Check-ins</h3>
          <Link
            to="/check-in"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Calendar size={14} className="mr-1" />
            <span>New Check-in</span>
          </Link>
        </div>
        
        {conditionCheckIns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 text-center">
            <p className="text-gray-600 mb-4">No check-ins recorded for this condition yet.</p>
            <Link
              to="/check-in"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Calendar size={18} />
              <span>Add Your First Check-in</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conditionCheckIns.slice(0, 5).map(checkIn => {
              const entry = checkIn.conditionEntries.find(
                e => e.conditionId === condition.id
              );
              
              if (!entry) return null;
              
              return (
                <div key={checkIn.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">
                        {format(parseISO(checkIn.date), 'EEEE, MMMM d')}
                      </p>
                      <div className="mt-2">
                        <SeverityScale 
                          value={entry.severity} 
                          onChange={() => {}} 
                          size="sm" 
                          showLabels={false}
                          readonly={true}
                        />
                      </div>
                    </div>
                    
                    {entry.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
                        {entry.symptoms.map((symptom, index) => (
                          <span 
                            key={index}
                            className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {entry.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{entry.notes}"</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {conditionCheckIns.length > 5 && (
          <div className="text-center">
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all {conditionCheckIns.length} check-ins
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConditionDetail;