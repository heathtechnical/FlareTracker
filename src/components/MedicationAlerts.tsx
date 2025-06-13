import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { MedicationUsageAlert } from '../types';

interface MedicationAlertsProps {
  alerts: MedicationUsageAlert[];
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

const MedicationAlerts: React.FC<MedicationAlertsProps> = ({ 
  alerts, 
  onDismiss,
  compact = false 
}) => {
  if (alerts.length === 0) return null;

  const getAlertIcon = (severity: string) => {
    return <AlertTriangle size={20} className={severity === 'high' ? 'text-red-500' : 'text-orange-500'} />;
  };

  const getAlertStyles = (severity: string) => {
    return severity === 'high' 
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-orange-50 border-orange-200 text-orange-800';
  };

  const displayAlerts = compact ? alerts.slice(0, 2) : alerts;

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert, index) => (
        <div
          key={`${alert.medicationId}-${alert.type}`}
          className={`rounded-lg border p-4 ${getAlertStyles(alert.severity)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getAlertIcon(alert.severity)}
            </div>
            
            <div className="ml-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {alert.type === 'exceeded' && 'Usage Limit Exceeded'}
                  {alert.type === 'warning' && 'Usage Limit Warning'}
                </h4>
                
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(`${alert.medicationId}-${alert.type}`)}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <p className="mt-1 text-sm">{alert.message}</p>
              
              <div className="mt-2 text-xs opacity-75">
                <span className="font-medium">{alert.medicationName}</span>
                <span className="mx-2">•</span>
                <span>{alert.daysUsed}/{alert.maxDays} days used</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {compact && alerts.length > 2 && (
        <div className="text-center">
          <span className="text-sm text-gray-500">
            +{alerts.length - 2} more alerts
          </span>
        </div>
      )}
    </div>
  );
};

export default MedicationAlerts;