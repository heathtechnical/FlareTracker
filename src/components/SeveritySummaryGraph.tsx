import React, { useMemo } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SeveritySummaryGraphProps {
  days?: number;
  className?: string;
}

const SeveritySummaryGraph: React.FC<SeveritySummaryGraphProps> = ({ 
  days = 14, 
  className = '' 
}) => {
  const { user } = useApp();

  const chartData = useMemo(() => {
    if (!user || !user.conditions.length) return null;

    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
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
    const conditionsData = user.conditions.map(condition => {
      const dataPoints = allDates.map(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const checkIn = checkInsByDate.get(dateKey);
        
        if (checkIn) {
          const entry = checkIn.conditionEntries.find(
            entry => entry.conditionId === condition.id
          );
          return {
            date: format(date, 'MMM d'),
            severity: entry?.severity || null,
            x: date.getTime()
          };
        }
        
        return {
          date: format(date, 'MMM d'),
          severity: null,
          x: date.getTime()
        };
      });

      // Calculate trend
      const validPoints = dataPoints.filter(p => p.severity !== null);
      let trend = 'stable';
      if (validPoints.length >= 2) {
        const firstHalf = validPoints.slice(0, Math.floor(validPoints.length / 2));
        const secondHalf = validPoints.slice(Math.floor(validPoints.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, p) => sum + (p.severity || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, p) => sum + (p.severity || 0), 0) / secondHalf.length;
        
        const difference = firstAvg - secondAvg; // Positive means improvement (lower severity)
        
        if (Math.abs(difference) > 0.5) {
          trend = difference > 0 ? 'improving' : 'worsening';
        }
      }

      return {
        condition,
        dataPoints,
        trend,
        validPoints: validPoints.length
      };
    });

    return {
      dates: allDates.map(date => format(date, 'MMM d')),
      conditions: conditionsData
    };
  }, [user, days]);

  if (!chartData || !user) return null;

  const MiniLineChart = ({ condition, dataPoints, trend }: any) => {
    const width = 200;
    const height = 60;
    const padding = 8;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Filter out null values for line drawing but keep indices
    const validPoints = dataPoints
      .map((point: any, index: number) => ({ ...point, index }))
      .filter((point: any) => point.severity !== null);
    
    if (validPoints.length === 0) {
      return (
        <div className="w-full h-15 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded border">
          No data
        </div>
      );
    }
    
    // Create SVG path
    const createPath = () => {
      if (validPoints.length === 0) return '';
      
      const points = validPoints.map((point: any) => {
        const x = (point.index / (dataPoints.length - 1)) * chartWidth + padding;
        const y = height - ((point.severity / 5) * chartHeight) - padding;
        return `${x},${y}`;
      });
      
      return `M ${points.join(' L ')}`;
    };
    
    const pathData = createPath();
    
    const getTrendIcon = () => {
      switch (trend) {
        case 'improving':
          return <TrendingUp size={12} className="text-green-600" />;
        case 'worsening':
          return <TrendingDown size={12} className="text-red-600" />;
        default:
          return <Minus size={12} className="text-gray-500" />;
      }
    };

    const getTrendColor = () => {
      switch (trend) {
        case 'improving':
          return 'text-green-600';
        case 'worsening':
          return 'text-red-600';
        default:
          return 'text-gray-500';
      }
    };
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: condition.color }}
            ></div>
            <span className="text-sm font-medium text-gray-800 truncate">
              {condition.name}
            </span>
          </div>
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-medium capitalize">{trend}</span>
          </div>
        </div>
        
        <div className="relative">
          <svg width={width} height={height} className="overflow-visible">
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
            
            {/* Data points */}
            {validPoints.map((point: any) => {
              const x = (point.index / (dataPoints.length - 1)) * chartWidth + padding;
              const y = height - ((point.severity / 5) * chartHeight) - padding;
              return (
                <circle
                  key={point.index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={condition.color}
                  stroke="white"
                  strokeWidth="1"
                  className="hover:r-4 transition-all duration-200"
                />
              );
            })}
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-6">
            <span>5</span>
            <span>3</span>
            <span>1</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>
            Avg: {validPoints.length > 0 
              ? (validPoints.reduce((sum: number, p: any) => sum + p.severity, 0) / validPoints.length).toFixed(1)
              : '0.0'
            }
          </span>
          <span>{validPoints.length} days</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-neutral-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Severity Trends</h3>
          <p className="text-sm text-gray-500">Last {days} days overview</p>
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-gray-600">Improving</span>
          </div>
          <div className="flex items-center space-x-1">
            <Minus size={12} className="text-gray-500" />
            <span className="text-gray-600">Stable</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingDown size={12} className="text-red-600" />
            <span className="text-gray-600">Worsening</span>
          </div>
        </div>
      </div>
      
      {chartData.conditions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No conditions to display</p>
          <p className="text-xs mt-1">Add conditions to see severity trends</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartData.conditions.map(conditionData => (
            <MiniLineChart
              key={conditionData.condition.id}
              condition={conditionData.condition}
              dataPoints={conditionData.dataPoints}
              trend={conditionData.trend}
            />
          ))}
        </div>
      )}
      
      {chartData.conditions.some(c => c.validPoints > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Severity scale: 1 (Minimal) to 5 (Extreme)</span>
            <span>Trends based on first vs. second half comparison</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeveritySummaryGraph;