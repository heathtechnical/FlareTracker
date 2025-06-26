import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  TrendingUp, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CheckInSummary from './CheckInSummary';
import MedicationAlerts from './MedicationAlerts';
import { getMedicationAlerts, getMedicationAdherenceScore } from '../utils/medicationUtils';
import { format, subDays } from 'date-fns';

const DashboardTimeline: React.FC = () => {
  const { user, getTodayCheckIn } = useApp();
  const [showAllCheckIns, setShowAllCheckIns] = useState(false);
  
  if (!user) return null;

  const todayCheckIn = getTodayCheckIn();
  
  // Get recent check-ins for timeline
  const recentCheckIns = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return [...user.checkIns]
      .filter(checkIn => new Date(checkIn.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user.checkIns]);

  // Get medication alerts and adherence score
  const medicationAlerts = useMemo(() => {
    return getMedicationAlerts(user.medications, user.checkIns);
  }, [user.medications, user.checkIns]);

  const adherenceScore = useMemo(() => {
    return getMedicationAdherenceScore(user.medications, user.checkIns, 7);
  }, [user.medications, user.checkIns]);

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(today, i);
      const dateString = format(checkDate, 'yyyy-MM-dd');
      
      const hasCheckIn = user.checkIns.some(checkIn => {
        const checkInDate = format(new Date(checkIn.date), 'yyyy-MM-dd');
        return checkInDate === dateString;
      });
      
      if (hasCheckIn) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const currentStreak = calculateStreak();
  const displayedCheckIns = showAllCheckIns ? recentCheckIns : recentCheckIns.slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {user.name}</h1>
          <p className="text-neutral-500 mt-1">Track your skin health journey</p>
        </div>
        
        {!todayCheckIn && (
          <Link 
            to="/check-in" 
            className="mt-4 md:mt-0 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200"
          >
            <Calendar size={18} className="mr-2" />
            Complete Today's Check-In
          </Link>
        )}
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            {todayCheckIn ? (
              <div className="w-10 h-10 rounded-full bg-success-500/10 flex items-center justify-center text-success-500">
                <CheckCircle size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-warning-500/10 flex items-center justify-center text-warning-500">
                <AlertTriangle size={20} />
              </div>
            )}
            <div className="ml-3">
              <h3 className="font-medium text-neutral-800">Today's Check-In</h3>
              <p className="text-sm text-neutral-500">
                {todayCheckIn ? 'Completed' : 'Not completed yet'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500">
              <Calendar size={20} />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-neutral-800">Current Streak</h3>
              <p className="text-sm text-neutral-500">
                {currentStreak} days
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-secondary-500/10 flex items-center justify-center text-secondary-500">
              <TrendingUp size={20} />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-neutral-800">Conditions</h3>
              <p className="text-sm text-neutral-500">
                {user.conditions.length} tracked
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              adherenceScore >= 80 
                ? 'bg-success-500/10 text-success-500' 
                : adherenceScore >= 60 
                  ? 'bg-warning-500/10 text-warning-500'
                  : 'bg-error-500/10 text-error-500'
            }`}>
              <CheckCircle size={20} />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-neutral-800">Med Adherence</h3>
              <p className="text-sm text-neutral-500">
                {adherenceScore}% (7 days)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Alerts */}
      {medicationAlerts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-800">Medication Alerts</h2>
            <Link 
              to="/medications" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Manage Medications
              <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <MedicationAlerts alerts={medicationAlerts} compact={true} />
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-neutral-800">Recent Check-Ins</h2>
          <div className="flex items-center space-x-3">
            <Link 
              to="/trends" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              View Trends
              <ArrowRight size={16} className="ml-1" />
            </Link>
            <Link 
              to="/check-in" 
              className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Plus size={16} />
              <span>New Check-In</span>
            </Link>
          </div>
        </div>
        
        {recentCheckIns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
            <Calendar size={48} className="text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No check-ins yet</h3>
            <p className="text-neutral-600 mb-6">
              Start tracking your skin health by completing your first check-in.
            </p>
            <Link
              to="/check-in"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Calendar size={18} />
              <span>Complete First Check-In</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedCheckIns.map((checkIn, index) => (
              <div key={checkIn.id} className="relative">
                {/* Timeline connector */}
                {index < displayedCheckIns.length - 1 && (
                  <div className="absolute left-6 top-16 w-0.5 h-8 bg-neutral-200"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center mt-2">
                    <Calendar size={20} className="text-primary-500" />
                  </div>
                  
                  {/* Check-in content */}
                  <div className="flex-1 min-w-0">
                    <CheckInSummary 
                      checkIn={checkIn} 
                      conditions={user.conditions} 
                      medications={user.medications}
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {/* Load more button */}
            {!showAllCheckIns && recentCheckIns.length > 5 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowAllCheckIns(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors mx-auto"
                >
                  <span>Show {recentCheckIns.length - 5} more check-ins</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            )}
            
            {showAllCheckIns && recentCheckIns.length > 5 && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowAllCheckIns(false)}
                  className="text-sm text-neutral-600 hover:text-neutral-800"
                >
                  Show less
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-medium text-neutral-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/check-in"
            className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Calendar size={20} className="text-primary-600" />
            <span className="font-medium text-neutral-800">Daily Check-In</span>
          </Link>
          
          <Link
            to="/conditions"
            className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <TrendingUp size={20} className="text-primary-600" />
            <span className="font-medium text-neutral-800">My Conditions</span>
          </Link>
          
          <Link
            to="/medications"
            className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <CheckCircle size={20} className="text-primary-600" />
            <span className="font-medium text-neutral-800">Medications</span>
          </Link>
          
          <Link
            to="/trends"
            className="flex items-center space-x-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <ArrowRight size={20} className="text-primary-600" />
            <span className="font-medium text-neutral-800">View Trends</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardTimeline;