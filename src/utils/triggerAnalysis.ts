export interface TriggerAnalysis {
  factor: string;
  type: 'lifestyle' | 'environmental' | 'medication';
  correlation: number; // -1 to 1, where 1 is strong positive correlation
  confidence: number; // 0 to 1, based on sample size and consistency
  occurrences: number;
  averageSeverityWithFactor: number;
  averageSeverityWithoutFactor: number;
  description: string;
  recommendation?: string;
}

export interface TriggerInsight {
  conditionId: string;
  conditionName: string;
  triggers: TriggerAnalysis[];
  protectiveFactors: TriggerAnalysis[];
  sampleSize: number;
  analysisDate: string;
}

export const analyzeTriggers = (
  checkIns: any[],
  conditionId: string,
  conditionName: string,
  minSampleSize: number = 5
): TriggerInsight => {
  // Filter check-ins that have data for this condition
  const relevantCheckIns = checkIns.filter(checkIn => 
    checkIn.conditionEntries.some((entry: any) => entry.conditionId === conditionId)
  );

  if (relevantCheckIns.length < minSampleSize) {
    return {
      conditionId,
      conditionName,
      triggers: [],
      protectiveFactors: [],
      sampleSize: relevantCheckIns.length,
      analysisDate: new Date().toISOString()
    };
  }

  const analyses: TriggerAnalysis[] = [];

  // Analyze stress levels
  const stressAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'stress',
    'High Stress',
    (value) => value >= 4,
    'Stress levels of 4-5 may worsen symptoms',
    'Consider stress management techniques like meditation, exercise, or therapy'
  );
  if (stressAnalysis) analyses.push(stressAnalysis);

  // Analyze poor sleep
  const sleepAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'sleep',
    'Poor Sleep',
    (value) => value <= 2,
    'Poor sleep quality (1-2) may trigger flare-ups',
    'Aim for 7-9 hours of quality sleep and maintain a consistent sleep schedule'
  );
  if (sleepAnalysis) analyses.push(sleepAnalysis);

  // Analyze good sleep as protective factor
  const goodSleepAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'sleep',
    'Good Sleep',
    (value) => value >= 4,
    'Good sleep quality (4-5) may help reduce symptoms',
    'Continue maintaining good sleep hygiene practices'
  );
  if (goodSleepAnalysis) analyses.push(goodSleepAnalysis);

  // Analyze dehydration
  const dehydrationAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'water',
    'Low Water Intake',
    (value) => value <= 2,
    'Insufficient water intake may worsen skin condition',
    'Aim for 8-10 glasses of water daily to maintain skin hydration'
  );
  if (dehydrationAnalysis) analyses.push(dehydrationAnalysis);

  // Analyze good hydration as protective factor
  const hydrationAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'water',
    'Good Hydration',
    (value) => value >= 4,
    'Good hydration (4-5) may help improve skin condition',
    'Continue maintaining good hydration levels'
  );
  if (hydrationAnalysis) analyses.push(hydrationAnalysis);

  // Analyze poor diet
  const poorDietAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'diet',
    'Poor Diet',
    (value) => value <= 2,
    'Poor diet quality may contribute to inflammation',
    'Consider an anti-inflammatory diet rich in omega-3s, antioxidants, and whole foods'
  );
  if (poorDietAnalysis) analyses.push(poorDietAnalysis);

  // Analyze good diet as protective factor
  const goodDietAnalysis = analyzeLifestyleFactor(
    relevantCheckIns,
    conditionId,
    'diet',
    'Healthy Diet',
    (value) => value >= 4,
    'Healthy diet (4-5) may help reduce inflammation',
    'Continue following an anti-inflammatory diet pattern'
  );
  if (goodDietAnalysis) analyses.push(goodDietAnalysis);

  // Analyze weather patterns
  const weatherAnalyses = analyzeWeatherFactors(relevantCheckIns, conditionId);
  analyses.push(...weatherAnalyses);

  // Analyze medication adherence
  const medicationAnalysis = analyzeMedicationAdherence(relevantCheckIns, conditionId);
  if (medicationAnalysis) analyses.push(medicationAnalysis);

  // Separate triggers (positive correlation) from protective factors (negative correlation)
  const triggers = analyses.filter(a => a.correlation > 0.2 && a.confidence > 0.3);
  const protectiveFactors = analyses.filter(a => a.correlation < -0.2 && a.confidence > 0.3);

  // Sort by correlation strength
  triggers.sort((a, b) => b.correlation - a.correlation);
  protectiveFactors.sort((a, b) => a.correlation - b.correlation);

  return {
    conditionId,
    conditionName,
    triggers,
    protectiveFactors,
    sampleSize: relevantCheckIns.length,
    analysisDate: new Date().toISOString()
  };
};

const analyzeLifestyleFactor = (
  checkIns: any[],
  conditionId: string,
  factorKey: string,
  factorName: string,
  conditionFn: (value: number) => boolean,
  description: string,
  recommendation: string
): TriggerAnalysis | null => {
  const withFactor: number[] = [];
  const withoutFactor: number[] = [];

  checkIns.forEach(checkIn => {
    const conditionEntry = checkIn.conditionEntries.find((entry: any) => entry.conditionId === conditionId);
    if (!conditionEntry || conditionEntry.severity === 0) return;

    const factorValue = checkIn.factors?.[factorKey];
    if (factorValue === undefined || factorValue === 0) return;

    if (conditionFn(factorValue)) {
      withFactor.push(conditionEntry.severity);
    } else {
      withoutFactor.push(conditionEntry.severity);
    }
  });

  if (withFactor.length < 2 || withoutFactor.length < 2) return null;

  const avgWithFactor = withFactor.reduce((sum, val) => sum + val, 0) / withFactor.length;
  const avgWithoutFactor = withoutFactor.reduce((sum, val) => sum + val, 0) / withoutFactor.length;
  
  const correlation = calculateCorrelation(avgWithFactor, avgWithoutFactor);
  const confidence = calculateConfidence(withFactor.length, withoutFactor.length, checkIns.length);

  return {
    factor: factorName,
    type: 'lifestyle',
    correlation,
    confidence,
    occurrences: withFactor.length,
    averageSeverityWithFactor: avgWithFactor,
    averageSeverityWithoutFactor: avgWithoutFactor,
    description,
    recommendation
  };
};

const analyzeWeatherFactors = (checkIns: any[], conditionId: string): TriggerAnalysis[] => {
  const weatherCounts: Record<string, { severities: number[], count: number }> = {};
  let totalSeverities: number[] = [];

  checkIns.forEach(checkIn => {
    const conditionEntry = checkIn.conditionEntries.find((entry: any) => entry.conditionId === conditionId);
    if (!conditionEntry || conditionEntry.severity === 0) return;

    totalSeverities.push(conditionEntry.severity);

    const weather = checkIn.factors?.weather;
    if (weather) {
      if (!weatherCounts[weather]) {
        weatherCounts[weather] = { severities: [], count: 0 };
      }
      weatherCounts[weather].severities.push(conditionEntry.severity);
      weatherCounts[weather].count++;
    }
  });

  if (totalSeverities.length < 5) return [];

  const overallAverage = totalSeverities.reduce((sum, val) => sum + val, 0) / totalSeverities.length;
  const analyses: TriggerAnalysis[] = [];

  Object.entries(weatherCounts).forEach(([weather, data]) => {
    if (data.count < 2) return;

    const avgSeverity = data.severities.reduce((sum, val) => sum + val, 0) / data.severities.length;
    const correlation = (avgSeverity - overallAverage) / 2.5; // Normalize to -1 to 1 range
    const confidence = Math.min(data.count / 5, 1) * 0.8; // Max confidence 0.8 for weather

    const weatherDescriptions: Record<string, { desc: string, rec: string }> = {
      'Humid': {
        desc: 'High humidity may worsen symptoms by increasing moisture and bacterial growth',
        rec: 'Use a dehumidifier, wear breathable fabrics, and shower after sweating'
      },
      'Dry': {
        desc: 'Dry conditions may worsen symptoms by reducing skin moisture',
        rec: 'Use a humidifier, apply moisturizer frequently, and avoid hot showers'
      },
      'Hot': {
        desc: 'Hot weather may trigger flare-ups through increased sweating and heat',
        rec: 'Stay cool, wear loose clothing, and use cooling products'
      },
      'Cold': {
        desc: 'Cold weather may worsen symptoms by reducing skin moisture',
        rec: 'Protect skin from cold, use rich moisturizers, and avoid sudden temperature changes'
      },
      'Windy': {
        desc: 'Windy conditions may irritate sensitive skin',
        rec: 'Protect exposed skin and use barrier creams when outdoors'
      },
      'Rainy': {
        desc: 'Rainy weather may affect symptoms through humidity changes',
        rec: 'Monitor skin response and adjust skincare routine accordingly'
      }
    };

    const info = weatherDescriptions[weather] || {
      desc: `${weather} weather conditions may affect your skin`,
      rec: 'Monitor how this weather affects your skin and adjust care accordingly'
    };

    analyses.push({
      factor: `${weather} Weather`,
      type: 'environmental',
      correlation,
      confidence,
      occurrences: data.count,
      averageSeverityWithFactor: avgSeverity,
      averageSeverityWithoutFactor: overallAverage,
      description: info.desc,
      recommendation: info.rec
    });
  });

  return analyses;
};

const analyzeMedicationAdherence = (checkIns: any[], conditionId: string): TriggerAnalysis | null => {
  const withMedication: number[] = [];
  const withoutMedication: number[] = [];

  checkIns.forEach(checkIn => {
    const conditionEntry = checkIn.conditionEntries.find((entry: any) => entry.conditionId === conditionId);
    if (!conditionEntry || conditionEntry.severity === 0) return;

    const takenMedications = checkIn.medicationEntries.filter((entry: any) => entry.taken);
    
    if (takenMedications.length > 0) {
      withMedication.push(conditionEntry.severity);
    } else {
      withoutMedication.push(conditionEntry.severity);
    }
  });

  if (withMedication.length < 2 || withoutMedication.length < 2) return null;

  const avgWithMedication = withMedication.reduce((sum, val) => sum + val, 0) / withMedication.length;
  const avgWithoutMedication = withoutMedication.reduce((sum, val) => sum + val, 0) / withoutMedication.length;
  
  // For medication, we expect negative correlation (medication should reduce severity)
  const correlation = (avgWithoutMedication - avgWithMedication) / 2.5; // Normalize and flip
  const confidence = calculateConfidence(withMedication.length, withoutMedication.length, checkIns.length);

  return {
    factor: 'Medication Adherence',
    type: 'medication',
    correlation,
    confidence,
    occurrences: withMedication.length,
    averageSeverityWithFactor: avgWithMedication,
    averageSeverityWithoutFactor: avgWithoutMedication,
    description: 'Taking prescribed medications as directed',
    recommendation: 'Continue following your medication schedule as prescribed by your healthcare provider'
  };
};

const calculateCorrelation = (avgWith: number, avgWithout: number): number => {
  // Simple correlation based on difference, normalized to -1 to 1 range
  const difference = avgWith - avgWithout;
  return Math.max(-1, Math.min(1, difference / 2.5));
};

const calculateConfidence = (sampleWith: number, sampleWithout: number, totalSample: number): number => {
  // Confidence based on sample size and balance
  const minSample = Math.min(sampleWith, sampleWithout);
  const balance = minSample / Math.max(sampleWith, sampleWithout);
  const coverage = (sampleWith + sampleWithout) / totalSample;
  
  return Math.min(1, (minSample / 5) * balance * coverage);
};

// Helper function to get trigger insights for multiple conditions
export const getTriggersForAllConditions = (
  checkIns: any[],
  conditions: any[]
): TriggerInsight[] => {
  return conditions.map(condition => 
    analyzeTriggers(checkIns, condition.id, condition.name)
  );
};