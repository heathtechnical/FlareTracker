import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isAfter } from 'date-fns';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  maxDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({ 
  selectedDate, 
  onDateSelect, 
  onClose,
  maxDate = new Date()
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get all days to display (including padding days from previous/next month)
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
  
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (date: Date) => {
    if (isAfter(date, maxDate)) return; // Don't allow future dates
    onDateSelect(date);
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateDisabled = (date: Date) => {
    return isAfter(date, maxDate);
  };

  const getDayClasses = (date: Date) => {
    const baseClasses = "w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors";
    
    if (isDateDisabled(date)) {
      return `${baseClasses} text-gray-300 cursor-not-allowed`;
    }
    
    if (!isSameMonth(date, currentMonth)) {
      return `${baseClasses} text-gray-400 hover:bg-gray-100 cursor-pointer`;
    }
    
    if (isSameDay(date, selectedDate)) {
      return `${baseClasses} bg-blue-500 text-white font-medium cursor-pointer`;
    }
    
    if (isSameDay(date, new Date())) {
      return `${baseClasses} bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 cursor-pointer`;
    }
    
    return `${baseClasses} text-gray-700 hover:bg-gray-100 cursor-pointer`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4 w-80">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        
        <h3 className="font-semibold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(date => (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => handleDateClick(date)}
            disabled={isDateDisabled(date)}
            className={getDayClasses(date)}
          >
            {format(date, 'd')}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleDateClick(new Date())}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Calendar;