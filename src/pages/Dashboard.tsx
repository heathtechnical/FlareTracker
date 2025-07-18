import React from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  Crown,
  Plus,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import ConditionCard from "../components/ConditionCard";
import MedicationCard from "../components/MedicationCard";
import CheckInSummary from "../components/CheckInSummary";
import MedicationAlerts from "../components/MedicationAlerts";
import SeveritySummaryGraph from "../components/SeveritySummaryGraph";
import PremiumAIChat from "../components/PremiumAIChat";
import CheckInDialog from "../components/CheckInDialog";
import {
  getMedicationAlerts,
  getMedicationAdherenceScore,
} from "../utils/medicationUtils";
import { format, subDays } from "date-fns";

const Dashboard: React.FC = () => {
  const { user, getTodayCheckIn } = useApp();
  const [showAIChat, setShowAIChat] = React.useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = React.useState(false);

  if (!user) return null;

  const todayCheckIn = getTodayCheckIn();

  // Get check-ins from the last 30 days for better data coverage
  const recentCheckIns = React.useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return [...user.checkIns]
      .filter((checkIn) => new Date(checkIn.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user.checkIns]);

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = subDays(today, i);
      const dateString = format(checkDate, "yyyy-MM-dd");

      const hasCheckIn = user.checkIns.some((checkIn) => {
        const checkInDate = format(new Date(checkIn.date), "yyyy-MM-dd");
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

  // Calculate overall trend
  const calculateOverallTrend = () => {
    if (recentCheckIns.length < 4) {
      return {
        trend: "insufficient-data",
        message: "Need more data",
        icon: Minus,
      };
    }

    // Split check-ins into two periods: recent (last 7 days) vs previous (8-14 days ago)
    const sevenDaysAgo = subDays(new Date(), 7);
    const fourteenDaysAgo = subDays(new Date(), 14);

    const recentPeriod = recentCheckIns.filter(
      (checkIn) => new Date(checkIn.date) >= sevenDaysAgo
    );

    const previousPeriod = recentCheckIns.filter((checkIn) => {
      const checkInDate = new Date(checkIn.date);
      return checkInDate >= fourteenDaysAgo && checkInDate < sevenDaysAgo;
    });

    if (recentPeriod.length === 0 || previousPeriod.length === 0) {
      return {
        trend: "insufficient-data",
        message: "Need more data",
        icon: Minus,
      };
    }

    // Calculate average severity for each period across all conditions
    const calculatePeriodAverage = (checkIns: typeof recentCheckIns) => {
      let totalSeverity = 0;
      let totalEntries = 0;

      checkIns.forEach((checkIn) => {
        checkIn.conditionEntries.forEach((entry) => {
          if (entry.severity > 0) {
            totalSeverity += entry.severity;
            totalEntries++;
          }
        });
      });

      return totalEntries > 0 ? totalSeverity / totalEntries : 0;
    };

    const recentAverage = calculatePeriodAverage(recentPeriod);
    const previousAverage = calculatePeriodAverage(previousPeriod);

    if (recentAverage === 0 && previousAverage === 0) {
      return { trend: "stable", message: "No symptoms", icon: Minus };
    }

    const difference = previousAverage - recentAverage; // Positive means improvement
    const percentChange =
      previousAverage > 0 ? Math.abs(difference / previousAverage) * 100 : 0;

    if (Math.abs(difference) < 0.3) {
      return { trend: "stable", message: "Stable", icon: Minus };
    } else if (difference > 0) {
      const improvement = "Improving";
      return {
        trend: "improving",
        message: improvement,
        icon: TrendingUp,
      };
    } else {
      const worsening = "Worsening";
      return {
        trend: "worsening",
        message: worsening,
        icon: TrendingDown,
      };
    }
  };

  // Get medication alerts and adherence score
  const medicationAlerts = React.useMemo(() => {
    return getMedicationAlerts(user.medications, user.checkIns);
  }, [user.medications, user.checkIns]);

  const adherenceScore = React.useMemo(() => {
    return getMedicationAdherenceScore(user.medications, user.checkIns, 7);
  }, [user.medications, user.checkIns]);

  const currentStreak = calculateStreak();
  const overallTrend = calculateOverallTrend();

  const handleCheckInSuccess = () => {
    // Refresh the page or update state as needed
    // window.location.reload();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            Welcome back, {user.name}
          </h1>
          <p className="text-neutral-500 mt-1">
            Track your skin health journey with FlareTracker
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          {/* Primary Check-in Button */}
          <button
            onClick={() => setShowCheckInDialog(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <span>Check-In</span>
          </button>

          {/* Premium AI Chat Button */}
          <button
            onClick={() => setShowAIChat(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
          >
            <MessageCircle size={16} />
            <span>AI Chat</span>
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                {todayCheckIn ? "Completed" : "Not completed yet"}
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
              <p className="text-sm text-neutral-500">{currentStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                overallTrend.trend === "improving"
                  ? "bg-success-500/10 text-success-500"
                  : overallTrend.trend === "worsening"
                  ? "bg-error-500/10 text-error-500"
                  : "bg-neutral-500/10 text-neutral-500"
              }`}
            >
              {React.createElement(overallTrend.icon, { size: 20 })}
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-neutral-800">Overall Trend</h3>
              <p className="text-sm text-neutral-500">{overallTrend.message}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                adherenceScore >= 80
                  ? "bg-success-500/10 text-success-500"
                  : adherenceScore >= 60
                  ? "bg-warning-500/10 text-warning-500"
                  : "bg-error-500/10 text-error-500"
              }`}
            >
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

      {/* Severity Summary Graph */}
      <SeveritySummaryGraph days={14} className="mb-6" />

      {/* Medication Alerts */}
      {medicationAlerts.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              Medication Alerts
            </h2>
            <Link
              to="/app/medications"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Manage Medications
              <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          <MedicationAlerts alerts={medicationAlerts} compact={true} />
        </div>
      )}

      {/* Today's Check-in */}
      {todayCheckIn && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-neutral-800">
              Today's Check-In
            </h2>
            <button
              onClick={() => setShowCheckInDialog(true)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Edit
              <ArrowRight size={16} className="ml-1" />
            </button>
          </div>

          <CheckInSummary
            checkIn={todayCheckIn}
            conditions={user.conditions}
            medications={user.medications}
          />
        </div>
      )}

      {/* Recent History */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">
            Recent History
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <ul className="divide-y divide-neutral-200">
            {recentCheckIns.slice(0, 5).map((checkIn) => (
              <li key={checkIn.id} className="p-4 hover:bg-neutral-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <div className="font-medium text-neutral-800">
                      {format(new Date(checkIn.date), "EEEE, MMMM d")}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {checkIn.conditionEntries.length} conditions,{" "}
                      {checkIn.medicationEntries.length} medications
                    </div>
                  </div>
                  <div className="flex self-start sm:self-auto">
                    <Link
                      to={`/app/check-in?date=${checkIn.date.split("T")[0]}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Premium AI Chat Modal */}
      {showAIChat && <PremiumAIChat onClose={() => setShowAIChat(false)} />}

      {/* Check-in Dialog */}
      <CheckInDialog
        isOpen={showCheckInDialog}
        onClose={() => setShowCheckInDialog(false)}
        onSuccess={handleCheckInSuccess}
      />
    </div>
  );
};

export default Dashboard;
