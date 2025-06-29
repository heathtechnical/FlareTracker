import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Edit, Calendar as CalendarIcon, MessageCircle, Crown, Download, Camera, Image } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CheckInDialog from '../components/CheckInDialog';
import PremiumAIChat from '../components/PremiumAIChat';
import HealthcareSummary from '../components/HealthcareSummary';
import { CheckIn } from '../types';

const CheckInPage: React.FC = () => {
  const { user } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showHealthcareSummary, setShowHealthcareSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'photos'>('calendar');

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

  // Get last 7 days of photos
  const last7DaysPhotos = useMemo(() => {
    if (!user) return [];
    
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6); // Include today, so 7 days total
    
    const photosData = [];
    
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      const checkIn = user.checkIns.find(ci => {
        const checkInDate = format(new Date(ci.date), 'yyyy-MM-dd');
        return checkInDate === dateKey;
      });
      
      photosData.unshift({
        date,
        dateKey,
        checkIn,
        hasPhoto: !!checkIn?.photoUrl,
        photoUrl: checkIn?.photoUrl
      });
    }
    
    return photosData;
  }, [user]);

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

  // Get summary period data (last 3 months)
  const summaryData = useMemo(() => {
    if (!user) return { startDate: new Date(), endDate: new Date(), checkIns: [] };
    
    const endDate = new Date();
    const startDate = subDays(endDate, 90); // Last 3 months
    
    const periodCheckIns = user.checkIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.date);
      return checkInDate >= startDate && checkInDate <= endDate;
    });
    
    return { startDate, endDate, checkIns: periodCheckIns };
  }, [user]);

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
          <h1 className="text-2xl font-semibold text-gray-800">History</h1>
          <p className="text-gray-600">
            View your check-in history and add new entries
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Healthcare Summary Button */}
          <button
            onClick={() => setShowHealthcareSummary(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            <span>Healthcare Summary</span>
          </button>
          
          {/* AI Chat Button */}
          <button
            onClick={() => setShowAIChat(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <MessageCircle size={16} />
            <span>AI Chat</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon size={20} />
            <span>Calendar View</span>
          </button>
          
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'photos'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Image size={20} />
            <span>Photo Gallery</span>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
              Last 7 Days
            </span>
          </button>
        </div>

        {/* Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <>
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
                          {checkIn.photoUrl && (
                            <Camera size={12} className="text-blue-500" />
                          )}
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
          </>
        )}

        {/* Photo Gallery Tab Content */}
        {activeTab === 'photos' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Last 7 Days Photo Timeline</h3>
              <p className="text-gray-600">Visual progression of your skin condition over the past week</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {last7DaysPhotos.map((dayData) => (
                <div
                  key={dayData.dateKey}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Date Header */}
                  <div className={`p-3 border-b border-gray-200 ${
                    isToday(dayData.date) ? 'bg-blue-50' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`font-medium ${
                          isToday(dayData.date) ? 'text-blue-700' : 'text-gray-800'
                        }`}>
                          {format(dayData.date, 'EEE, MMM d')}
                        </div>
                        {isToday(dayData.date) && (
                          <div className="text-xs text-blue-600 font-medium">Today</div>
                        )}
                      </div>
                      {dayData.checkIn && (
                        <div className="flex items-center space-x-1">
                          {dayData.hasPhoto && (
                            <Camera size={14} className="text-blue-500" />
                          )}
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo Content */}
                  <div className="aspect-square relative">
                    {dayData.hasPhoto && dayData.photoUrl ? (
                      <img
                        src={dayData.photoUrl}
                        alt={`Check-in photo for ${format(dayData.date, 'MMM d')}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <Camera size={32} className="mb-2" />
                        <span className="text-sm">
                          {dayData.checkIn ? 'No photo added' : 'No check-in'}
                        </span>
                      </div>
                    )}

                    {/* Overlay with check-in info */}
                    {dayData.checkIn && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <div className="text-white text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <span>{dayData.checkIn.conditionEntries.length} conditions</span>
                            {dayData.checkIn.medicationEntries.some(entry => entry.taken) && (
                              <>
                                <span>•</span>
                                <span>Meds taken</span>
                              </>
                            )}
                          </div>
                          {dayData.checkIn.notes && (
                            <div className="text-xs opacity-90 truncate">
                              "{dayData.checkIn.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Click to edit overlay */}
                    <button
                      onClick={() => handleDateClick(dayData.date)}
                      className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
                    >
                      <div className="bg-white/90 rounded-full p-2">
                        {dayData.checkIn ? (
                          <Edit size={16} className="text-gray-700" />
                        ) : (
                          <Plus size={16} className="text-gray-700" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Gallery Stats */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {last7DaysPhotos.filter(d => d.hasPhoto).length}
                </div>
                <div className="text-sm text-gray-600">Photos this week</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {last7DaysPhotos.filter(d => d.checkIn).length}
                </div>
                <div className="text-sm text-gray-600">Check-ins completed</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {Math.round((last7DaysPhotos.filter(d => d.checkIn).length / 7) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Tracking consistency</div>
              </div>
            </div>

            {/* Tips for photo tracking */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📸 Photo Tracking Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Take photos in consistent lighting for better comparison</li>
                <li>• Use the same angle and distance when possible</li>
                <li>• Photos help you and your healthcare provider track visual changes</li>
                <li>• All photos are stored securely and privately</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Legend (only show for calendar view) */}
      {activeTab === 'calendar' && (
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
                <Camera size={16} className="text-blue-500" />
                <span>Has photo</span>
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
      )}

      {/* Statistics (only show for calendar view) */}
      {activeTab === 'calendar' && (
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
      )}

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

      {/* Healthcare Summary Modal */}
      {showHealthcareSummary && (
        <HealthcareSummary
          startDate={summaryData.startDate}
          endDate={summaryData.endDate}
          checkIns={summaryData.checkIns}
          onClose={() => setShowHealthcareSummary(false)}
        />
      )}
    </div>
  );
};

export default CheckInPage;