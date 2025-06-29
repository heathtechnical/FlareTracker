import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar } from 'lucide-react';
import { SkinCondition, CheckIn } from '../types';
import SeverityScale from './SeverityScale';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface ConditionCardProps {
  condition: SkinCondition;
  recentCheckIns?: CheckIn[];
  compact?: boolean;
}

const ConditionCard: React.FC<ConditionCardProps> = ({ 
  condition, 
  recentCheckIns = [],
  compact = false
}) => {
  // Find most recent check-in with this condition
  const latestEntry = recentCheckIns
    .flatMap(checkIn => 
      checkIn.conditionEntries
        .filter(entry => entry.conditionId === condition.id)
        .map(entry => ({ date: checkIn.date, entry }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Get severity data for the last 7 days
  const getLast7DaysSeverity = () => {
    const today = new Date();
    const severityData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Find check-in for this date
      const checkIn = recentCheckIns.find(ci => {
        const checkInDate = format(new Date(ci.date), 'yyyy-MM-dd');
        return checkInDate === dateString;
      });
      
      if (checkIn) {
        const entry = checkIn.conditionEntries.find(e => e.conditionId === condition.id);
        severityData.push({
          date: dateString,
          severity: entry?.severity || null,
          dayLabel: format(date, 'EEE')[0] // First letter of day
        });
      } else {
        severityData.push({
          date: dateString,
          severity: null,
          dayLabel: format(date, 'EEE')[0]
        });
      }
    }
    
    return severityData;
  };

  // Get check-ins count for current month
  const getMonthlyCheckInsCount = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return recentCheckIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.date);
      return checkInDate >= monthStart && 
             checkInDate <= monthEnd &&
             checkIn.conditionEntries.some(entry => entry.conditionId === condition.id);
    }).length;
  };

  const severityData = getLast7DaysSeverity();
  const monthlyCount = getMonthlyCheckInsCount();
  const currentMonth = format(new Date(), 'MMMM');

  // Debug: Log the data to see what we're working with
  console.log(`Condition: ${condition.name}`, {
    recentCheckInsCount: recentCheckIns.length,
    severityData,
    monthlyCount
  });

  // Mini line chart component with tooltip
  const MiniLineChart = () => {
    const [hoveredPoint, setHoveredPoint] = React.useState<{
      index: number;
      severity: number;
      date: string;
      x: number;
      y: number;
    } | null>(null);
    
    const width = 280; // Full width of card minus padding
    const height = 40;
    const padding = 4;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Filter out null values for line drawing
    const validPoints = severityData
      .map((day, index) => ({ ...day, index }))
      .filter(day => day.severity !== null && day.severity > 0);
    
    if (validPoints.length === 0) {
      return (
        <div className="w-full h-10 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded">
          No data for last 7 days
        </div>
      );
    }
    
    // Create SVG path
    const createPath = () => {
      if (validPoints.length === 0) return '';
      
      const points = validPoints.map(point => {
        const x = (point.index / 6) * chartWidth + padding;
        const y = height - ((point.severity! / 5) * chartHeight) - padding;
        return `${x},${y}`;
      });
      
      return `M ${points.join(' L ')}`;
    };
    
    const pathData = createPath();
    
    const severityLabels = ['', 'Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme'];
    
    return (
      <div className="w-full relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map(level => {
            const y = height - ((level / 5) * chartHeight) - padding;
            return (
              <line
                key={level}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Line */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={condition.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Data points with hover */}
          {validPoints.map(point => {
            const x = (point.index / 6) * chartWidth + padding;
            const y = height - ((point.severity! / 5) * chartHeight) - padding;
            return (
              <circle
                key={point.index}
                cx={x}
                cy={y}
                r="4"
                fill={condition.color}
                stroke="white"
                strokeWidth="1"
                className="cursor-pointer hover:r-6 transition-all duration-200"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredPoint({
                    index: point.index,
                    severity: point.severity!,
                    date: format(new Date(point.date), 'MMM d'),
                    x: rect.left + rect.width / 2,
                    y: rect.top
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
          
          {/* All points (including null) for day labels */}
          {severityData.map((day, index) => {
            const x = (index / 6) * chartWidth + padding;
            return (
              <g key={index}>
                {/* Day label */}
                <text
                  x={x}
                  y={height + 12}
                  textAnchor="middle"
                  className="text-xs fill-gray-400"
                  fontSize="10"
                >
                  {day.dayLabel}
                </text>
                
                {/* Null data indicator */}
                {day.severity === null && (
                  <circle
                    cx={x}
                    cy={height / 2}
                    r="1.5"
                    fill="#d1d5db"
                    opacity="0.5"
                  />
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
            style={{
              left: hoveredPoint.x - 40, // Center the tooltip
              top: hoveredPoint.y - 35, // Position above the point
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-center">
              <div className="font-medium">{hoveredPoint.date}</div>
              <div className="text-gray-300">
                Severity: {hoveredPoint.severity} ({severityLabels[hoveredPoint.severity]})
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ borderTop: `4px solid ${condition.color}` }}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-medium text-neutral-800">{condition.name}</h3>
            {condition.description && !compact && (
              <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{condition.description}</p>
            )}
          </div>
        </div>
        
        {/* Latest severity */}
        {latestEntry && !compact && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-500">
                Latest ({new Date(latestEntry.date).toLocaleDateString()})
              </span>
            </div>
            <SeverityScale 
              value={latestEntry.entry.severity} 
              onChange={() => {}} 
              size="sm" 
              showLabels={false}
              readonly={true}
            />
            
            {latestEntry.entry.symptoms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {latestEntry.entry.symptoms.slice(0, 3).map(symptom => (
                  <span 
                    key={symptom} 
                    className="inline-block text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full"
                  >
                    {symptom}
                  </span>
                ))}
                {latestEntry.entry.symptoms.length > 3 && (
                  <span className="text-xs text-neutral-500">
                    +{latestEntry.entry.symptoms.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 7-day severity line chart */}
        {!compact && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-neutral-600">Last 7 Days Trend</span>
              <span className="text-xs text-neutral-500">Severity</span>
            </div>
            <MiniLineChart />
          </div>
        )}

        {/* Monthly stats */}
        {!compact && (
          <div className="mb-4 flex items-center justify-between text-sm">
            <div className="flex items-center text-neutral-600">
              <Calendar size={14} className="mr-1" />
              <span>{currentMonth} check-ins</span>
            </div>
            <span className="font-medium text-neutral-800">{monthlyCount}</span>
          </div>
        )}
        
        <Link 
          to={`/app/conditions/${condition.id}`} 
          className="flex items-center text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
        >
          View details
          <ChevronRight size={16} className="ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default ConditionCard;