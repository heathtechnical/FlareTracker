import React from 'react';
import { AlertTriangle, Shield, TrendingUp, TrendingDown, Info, Lightbulb } from 'lucide-react';
import { TriggerInsight, TriggerAnalysis } from '../utils/triggerAnalysis';

interface TriggerAnalysisProps {
  insights: TriggerInsight[];
  compact?: boolean;
}

const TriggerAnalysisComponent: React.FC<TriggerAnalysisProps> = ({ insights, compact = false }) => {
  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 text-center">
        <Info size={48} className="text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Trigger Analysis Available</h3>
        <p className="text-gray-600">
          Continue logging your daily check-ins to discover patterns and potential triggers.
        </p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 bg-green-100';
    if (confidence >= 0.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0) return <TrendingUp size={16} className="text-red-500" />;
    return <TrendingDown size={16} className="text-green-500" />;
  };

  const renderTriggerItem = (trigger: TriggerAnalysis, isProtective: boolean = false) => (
    <div key={trigger.factor} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          {isProtective ? (
            <Shield size={20} className="text-green-600 mr-2 flex-shrink-0" />
          ) : (
            <AlertTriangle size={20} className="text-red-600 mr-2 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-medium text-gray-800">{trigger.factor}</h4>
            <div className="flex items-center mt-1">
              {getCorrelationIcon(trigger.correlation)}
              <span className="text-sm text-gray-600 ml-1">
                {Math.abs(trigger.correlation * 100).toFixed(0)}% correlation
              </span>
            </div>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(trigger.confidence)}`}>
          {getConfidenceLabel(trigger.confidence)} confidence
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{trigger.description}</p>
      
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-500">With factor:</span>
          <span className="font-medium ml-1">{trigger.averageSeverityWithFactor.toFixed(1)}/5</span>
        </div>
        <div>
          <span className="text-gray-500">Without factor:</span>
          <span className="font-medium ml-1">{trigger.averageSeverityWithoutFactor.toFixed(1)}/5</span>
        </div>
      </div>
      
      {trigger.recommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start">
            <Lightbulb size={16} className="text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">{trigger.recommendation}</p>
          </div>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        Based on {trigger.occurrences} occurrences
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {insights.map(insight => {
        if (insight.sampleSize < 5) {
          return (
            <div key={insight.conditionId} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-800 mb-4">{insight.conditionName}</h3>
              <div className="text-center py-8">
                <Info size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Need more data to analyze triggers. Continue logging check-ins to discover patterns.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {insight.sampleSize} of 5 minimum check-ins recorded
                </p>
              </div>
            </div>
          );
        }

        return (
          <div key={insight.conditionId} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-800">{insight.conditionName}</h3>
                <div className="text-sm text-gray-500">
                  Based on {insight.sampleSize} check-ins
                </div>
              </div>

              {/* Triggers Section */}
              {insight.triggers.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <AlertTriangle size={20} className="text-red-600 mr-2" />
                    <h4 className="text-md font-medium text-gray-800">Potential Triggers</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insight.triggers.slice(0, compact ? 2 : 6).map(trigger => 
                      renderTriggerItem(trigger, false)
                    )}
                  </div>
                </div>
              )}

              {/* Protective Factors Section */}
              {insight.protectiveFactors.length > 0 && (
                <div>
                  <div className="flex items-center mb-4">
                    <Shield size={20} className="text-green-600 mr-2" />
                    <h4 className="text-md font-medium text-gray-800">Protective Factors</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insight.protectiveFactors.slice(0, compact ? 2 : 4).map(factor => 
                      renderTriggerItem(factor, true)
                    )}
                  </div>
                </div>
              )}

              {/* No insights found */}
              {insight.triggers.length === 0 && insight.protectiveFactors.length === 0 && (
                <div className="text-center py-8">
                  <Info size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No significant triggers or protective factors identified yet.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Continue tracking to build more comprehensive insights.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TriggerAnalysisComponent;