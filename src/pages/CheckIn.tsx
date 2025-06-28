import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit, Calendar as CalendarIcon, MessageCircle, Crown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CheckInDialog from '../components/CheckInDialog';
import PremiumAIChat from '../components/PremiumAIChat';
import { CheckIn } from '../types';

const CheckInPage: React.FC = () => {
  const { user } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Get check-ins for the current month
  const monthCheckIns = useMemo(() => {
    if (!user) return new Map();
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const checkInsMap = new Map<string, CheckIn>();
    
    user.checkIns.forEach(checkIn => {
      const checkInDate = parseISO(checkIn.date);
      if (checkInDate >= monthStart && checkInDate <= monthEnd) {
        const dateKey = format(checkInDate, 'yyyy-MM-dd');
        checkInsMap.set(dateKey, checkIn);
      }
    });
    
    return checkInsMap;
  }, [user, currentMonth]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the start of the calendar (including days from previous month)
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    // Get the end of the calendar (including days from next month)
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCheckInDialog(true);
  };

  const handleCheckInSuccess = () => {
    setShowCheckInDialog(false);
    setSelectedDate(null);
  };

  const getCheckInForDate = (date: Date): CheckIn | undefined => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return monthCheckIns.get(dateKey);
  };

  const getDayClasses = (date: Date) => {
    const baseClasses = "relative w-full h-24 p-2 border border-gray-200 transition-all duration-200 cursor-pointer";
    const checkIn = getCheckInForDate(date);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isTodayDate = isToday(date);
    
    let classes = baseClasses;
    
    if (!isCurrentMonth) {
      classes += " bg-gray-50 text-gray-400";
    } else if (isTodayDate) {
      classes += " bg-blue-50 border-blue-200";
    } else {
      classes += " bg-white hover:bg-gray-50";
    }
    
    if (checkIn) {
      classes += " border-l-4 border-l-green-500";
    }
    
    return classes;
  };

  const getAverageSeverity = (checkIn: CheckIn): number => {
    if (checkIn.conditionEntries.length === 0) return 0;
    
    const totalSeverity = checkIn.conditionEntries.reduce((sum, entry) => sum + entry.severity, 0);
    return totalSeverity / checkIn.conditionEntries.length;
  };

  const getSeverityColor = (severity: number): string => {
    if (severity === 0) return 'bg-gray-300';
    if (severity <= 1.5) return 'bg-green-500';
    if (severity <= 2.5) return 'bg-yellow-500';
    if (severity <= 3.5) return 'bg-orange-500';
    if (severity <= 4.5) return 'bg-red-500';
    return 'bg-red-700';
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Check-In Calendar</h1>
          <p className="text-gray-600">
            View your check-in history and add new entries
          </p>
        </div>
        
      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          
          <h2 className="text-xl font-semibold text-gray-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(date => {
            const checkIn = getCheckInForDate(date);
            const averageSeverity = checkIn ? getAverageSeverity(checkIn) : 0;
            
            return (
              <div
                key={date.toISOString()}
                className={getDayClasses(date)}
                onClick={() => handleDateClick(date)}
              >
                {/* Date number */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium ${
                    isSameMonth(date, currentMonth) ? 'text-gray-900' : 'text-gray-400'
                  } ${isToday(date) ? 'text-blue-600 font-bold' : ''}`}>
                    {format(date, 'd')}
                  </span>
                  
                  {checkIn && (
                    <div className="flex items-center space-x-1">
                      <Edit size={12} className="text-gray-500" />
                    </div>
                  )}
                </div>
                
                {/* Check-in indicator */}
                {checkIn && (
                  <div className="space-y-1">
                    {/* Severity indicator */}
                    <div className="flex items-center space-x-1">
                      <div 
                        className={`w-2 h-2 rounded-full ${getSeverityColor(averageSeverity)}`}
                        title={`Average severity: ${averageSeverity.toFixed(1)}`}
                      ></div>
                      <span className="text-xs text-gray-600">
                        {checkIn.conditionEntries.length} condition{checkIn.conditionEntries.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Medication indicator */}
                    {checkIn.medicationEntries.some(entry => entry.taken) && (
                      <div className="text-xs text-green-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                        Meds taken
                      </div>
                    )}
                    
                    {/* Notes indicator */}
                    {checkIn.notes && (
                      <div className="text-xs text-gray-500 truncate">
                        "{checkIn.notes.slice(0, 20)}..."
                      </div>
                    )}
                  </div>
                )}
                
                {/* Empty state for current month days without check-ins */}
                {!checkIn && isSameMonth(date, currentMonth) && (
                  <div className="flex items-center justify-center h-full">
                    <Plus size={16} className="text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Minimal severity (1-1.5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Mild severity (1.5-2.5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Moderate severity (2.5-3.5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Severe severity (3.5+)</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-green-500"></div>
              <span>Has check-in data</span>
            </div>
            <div className="flex items-center space-x-2">
              <Plus size={16} className="text-gray-300" />
              <span>Click to add check-in</span>
            </div>
            <div className="flex items-center space-x-2">
              <Edit size={12} className="text-gray-500" />
              <span>Click to edit check-in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-gray-900">{monthCheckIns.size}</p>
          <p className="text-xs text-gray-500">check-ins completed</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Completion Rate</h3>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round((monthCheckIns.size / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) * 100)}%
          </p>
          <p className="text-xs text-gray-500">of days this month</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Average Severity</h3>
          <p className="text-2xl font-bold text-gray-900">
            {monthCheckIns.size > 0 
              ? (Array.from(monthCheckIns.values())
                  .reduce((sum, checkIn) => sum + getAverageSeverity(checkIn), 0) / monthCheckIns.size)
                  .toFixed(1)
              : '0.0'
            }
          </p>
          <p className="text-xs text-gray-500">this month</p>
        </div>
      </div>

      {/* Check-in Dialog */}
      {showCheckInDialog && selectedDate && (
        <CheckInDialog
          isOpen={showCheckInDialog}
          onClose={() => {
            setShowCheckInDialog(false);
            setSelectedDate(null);
          }}
          onSuccess={handleCheckInSuccess}
          selectedDate={selectedDate}
        />
      )}

      {/* Premium AI Chat Modal */}
      {showAIChat && (
        <PremiumAIChat onClose={() => setShowAIChat(false)} />
      )}
    </div>
  );
};

export default CheckInPage;