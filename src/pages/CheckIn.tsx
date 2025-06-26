import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Save, Plus, Minus, AlertCircle, Moon, CloudRain, Utensils, Droplets, Calendar, ChevronLeft, ChevronRight, CheckCircle, Bot } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SeverityScale from '../components/SeverityScale';
import CalendarComponent from '../components/Calendar';
import AICheckInAssistant from '../components/AICheckInAssistant';
import { CheckIn, ConditionEntry, MedicationEntry, SeverityLevel } from '../types';

const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, addCheckIn, updateCheckIn, getTodayCheckIn } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<Omit<CheckIn, 'id'>>({
    date: new Date().toISOString(),
    conditionEntries: [],
    medicationEntries: [],
    factors: {}
  });
  
  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);
  
  useEffect(() => {
    if (!user) return;
    
    // Check if we're editing a specific date from URL params
    const dateParam = searchParams.get('date');
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    
    // Set the selected date for the date picker
    setSelectedDate(format(targetDate, 'yyyy-MM-dd'));
    
    // Find existing check-in for the target date
    const existingCheckIn = user.checkIns.find(checkIn => {
      const checkInDate = new Date(checkIn.date);
      const targetDateString = format(targetDate, 'yyyy-MM-dd');
      const checkInDateString = format(checkInDate, 'yyyy-MM-dd');
      return checkInDateString === targetDateString;
    });
    
    if (existingCheckIn) {
      // If there is an existing check-in, load it for editing
      const existingConditionIds = existingCheckIn.conditionEntries.map(entry => entry.conditionId);
      const missingConditions = user.conditions.filter(condition => 
        !existingConditionIds.includes(condition.id)
      );
      
      // Add missing conditions with default values (no severity selected)
      const additionalConditionEntries: ConditionEntry[] = missingConditions.map(condition => ({
        conditionId: condition.id,
        severity: 0 as SeverityLevel,
        symptoms: []
      }));
      
      // Get medications for conditions and create entries
      const conditionMedications = user.medications.filter(med => 
        med.active && user.conditions.some(condition => 
          med.conditionIds.includes(condition.id)
        )
      );
      
      const existingMedicationIds = existingCheckIn.medicationEntries.map(entry => entry.medicationId);
      const missingMedications = conditionMedications.filter(med => 
        !existingMedicationIds.includes(med.id)
      );
      
      const additionalMedicationEntries: MedicationEntry[] = missingMedications.map(medication => ({
        medicationId: medication.id,
        taken: false
      }));
      
      setFormData({
        date: existingCheckIn.date,
        conditionEntries: [...existingCheckIn.conditionEntries, ...additionalConditionEntries],
        medicationEntries: [...existingCheckIn.medicationEntries, ...additionalMedicationEntries],
        notes: existingCheckIn.notes,
        photoUrl: existingCheckIn.photoUrl,
        factors: { ...existingCheckIn.factors }
      });
      setIsEditing(true);
    } else {
      // If not, create a new one with defaults for the selected date
      const defaultConditionEntries: ConditionEntry[] = user.conditions.map(condition => ({
        conditionId: condition.id,
        severity: 0 as SeverityLevel,
        symptoms: []
      }));
      
      // Get medications for conditions only
      const conditionMedications = user.medications.filter(med => 
        med.active && user.conditions.some(condition => 
          med.conditionIds.includes(condition.id)
        )
      );
      
      const defaultMedicationEntries: MedicationEntry[] = conditionMedications.map(medication => ({
        medicationId: medication.id,
        taken: false
      }));
      
      // Set the date to the target date
      const targetDateTime = new Date(targetDate);
      targetDateTime.setHours(12, 0, 0, 0);
      
      setFormData({
        date: targetDateTime.toISOString(),
        conditionEntries: defaultConditionEntries,
        medicationEntries: defaultMedicationEntries,
        factors: {
          stress: 0 as SeverityLevel,
          sleep: 0 as SeverityLevel,
          water: 0 as SeverityLevel
        }
      });
      setIsEditing(false);
    }
  }, [user, searchParams]);
  
  const handleDateSelect = (newDate: Date) => {
    const dateString = format(newDate, 'yyyy-MM-dd');
    setSelectedDate(dateString);
    setShowCalendar(false);
    navigate(`/check-in?date=${dateString}`);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validate that all conditions have severity selected (not 0)
    const unratedConditions = formData.conditionEntries.filter(entry => entry.severity === 0);
    if (unratedConditions.length > 0) {
      alert('Please rate the severity for all conditions before saving.');
      return;
    }
    
    // Use the selected date for the check-in
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(12, 0, 0, 0);
    
    const checkInData = {
      ...formData,
      date: selectedDateTime.toISOString()
    };
    
    if (isEditing && user) {
      const existingCheckIn = user.checkIns.find(checkIn => {
        const checkInDate = new Date(checkIn.date);
        const selectedDateString = format(selectedDateTime, 'yyyy-MM-dd');
        const checkInDateString = format(checkInDate, 'yyyy-MM-dd');
        return checkInDateString === selectedDateString;
      });
      
      if (existingCheckIn) {
        updateCheckIn({
          ...checkInData,
          id: existingCheckIn.id
        });
      }
    } else {
      addCheckIn(checkInData);
    }
    
    navigate('/dashboard');
  };
  
  const updateConditionSeverity = (conditionId: string, severity: SeverityLevel) => {
    setFormData(prev => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map(entry => 
        entry.conditionId === conditionId 
          ? { ...entry, severity } 
          : entry
      )
    }));
  };
  
  const updateConditionSymptoms = (conditionId: string, symptom: string, isChecked: boolean) => {
    setFormData(prev => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map(entry => 
        entry.conditionId === conditionId 
          ? { 
              ...entry, 
              symptoms: isChecked 
                ? [...entry.symptoms, symptom]
                : entry.symptoms.filter(s => s !== symptom)
            } 
          : entry
      )
    }));
  };
  
  const updateConditionNotes = (conditionId: string, notes: string) => {
    setFormData(prev => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map(entry => 
        entry.conditionId === conditionId 
          ? { ...entry, notes } 
          : entry
      )
    }));
  };
  
  const updateMedicationTaken = (medicationId: string, taken: boolean) => {
    setFormData(prev => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map(entry => 
        entry.medicationId === medicationId 
          ? { 
              ...entry, 
              taken,
              ...(taken 
                ? { timesTaken: 1, skippedReason: undefined }
                : { timesTaken: undefined })
            } 
          : entry
      )
    }));
  };
  
  const updateMedicationTimesTaken = (medicationId: string, change: number) => {
    setFormData(prev => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map(entry => {
        if (entry.medicationId === medicationId && entry.taken) {
          const currentTimes = entry.timesTaken || 1;
          const newTimes = Math.max(1, currentTimes + change);
          return { ...entry, timesTaken: newTimes };
        }
        return entry;
      })
    }));
  };
  
  const updateMedicationSkippedReason = (medicationId: string, skippedReason: string) => {
    setFormData(prev => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map(entry => 
        entry.medicationId === medicationId && !entry.taken
          ? { ...entry, skippedReason } 
          : entry
      )
    }));
  };
  
  const updateFactor = (factor: keyof CheckIn['factors'], value: any) => {
    setFormData(prev => ({
      ...prev,
      factors: {
        ...prev.factors,
        [factor]: value
      }
    }));
  };

  const handleAIFormUpdate = (updates: any) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  };
  
  // Common symptom options
  const commonSymptoms = [
    'Itchiness', 'Redness', 'Dryness', 'Flaking', 
    'Pain', 'Swelling', 'Burning', 'Bleeding'
  ];
  
  if (!user) return null;

  // Calculate total steps: conditions + lifestyle factors + notes
  const totalSteps = user.conditions.length + 1 + 1; // conditions + lifestyle + notes
  const isLastStep = currentStep === totalSteps - 1;
  
  // Get current condition for condition steps
  const getCurrentCondition = () => {
    if (currentStep < user.conditions.length) {
      return user.conditions[currentStep];
    }
    return null;
  };
  
  const currentCondition = getCurrentCondition();
  const currentConditionEntry = currentCondition 
    ? formData.conditionEntries.find(entry => entry.conditionId === currentCondition.id)
    : null;
  
  // Get medications for current condition
  const getCurrentConditionMedications = () => {
    if (!currentCondition) return [];
    return user.medications.filter(med => 
      med.active && med.conditionIds.includes(currentCondition.id)
    );
  };
  
  const currentConditionMedications = getCurrentConditionMedications();
  
  const canProceed = () => {
    if (currentStep < user.conditions.length) {
      // For condition steps, severity must be selected
      return currentConditionEntry && currentConditionEntry.severity > 0;
    }
    return true; // Lifestyle factors and notes are optional
  };
  
  const nextStep = () => {
    if (canProceed() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const getStepTitle = () => {
    if (currentStep < user.conditions.length) {
      return currentCondition?.name || 'Condition';
    } else if (currentStep === user.conditions.length) {
      return 'Lifestyle Factors';
    } else {
      return 'Additional Notes';
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            {isEditing ? "Edit Check-in" : "Daily Check-in"}
          </h1>
          
          <div className="flex items-center space-x-3">
            {/* AI Assistant Button */}
            <button
              onClick={() => setShowAIAssistant(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Bot size={18} />
              <span>AI Assistant</span>
            </button>
            
            {/* Date selector */}
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 text-gray-700 hover:text-gray-900"
              >
                <Calendar size={16} className="text-gray-500" />
                <span className="font-medium">
                  {selectedDate && format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                </span>
              </button>
              
              {showCalendar && (
                <div className="absolute top-full right-0 mt-2 z-20">
                  <CalendarComponent
                    selectedDate={new Date(selectedDate)}
                    onDateSelect={handleDateSelect}
                    onClose={() => setShowCalendar(false)}
                    maxDate={new Date()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStep + 1) / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-gray-800">{getStepTitle()}</h2>
          {currentCondition && (
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentCondition.color }}
            ></div>
          )}
        </div>

        {/* Condition step */}
        {currentStep < user.conditions.length && currentCondition && currentConditionEntry && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main condition content - takes up 1/2 of the width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How severe was your {currentCondition.name} today? *
                </label>
                <SeverityScale 
                  value={currentConditionEntry.severity}
                  onChange={(value) => updateConditionSeverity(currentCondition.id, value)}
                  showLabels={currentConditionEntry.severity > 0}
                  allowUnselected={true}
                />
                {submitAttempted && currentConditionEntry.severity === 0 && (
                  <p className="text-xs text-red-500 mt-2">Please select a severity level</p>
                )}
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What symptoms did you experience?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {commonSymptoms.map(symptom => (
                    <label key={symptom} className="flex items-center">
                      <input 
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={currentConditionEntry.symptoms.includes(symptom)}
                        onChange={(e) => updateConditionSymptoms(
                          currentCondition.id, 
                          symptom, 
                          e.target.checked
                        )}
                      />
                      <span className="ml-2 text-sm text-gray-700">{symptom}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Condition notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional notes about {currentCondition.name}
                </label>
                <textarea
                  className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any specific observations..."
                  value={currentConditionEntry.notes || ''}
                  onChange={(e) => updateConditionNotes(currentCondition.id, e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Medications sidebar - takes up 1/2 of the width */}
            {currentConditionMedications.length > 0 && (
              <div className="lg:col-span-2">
                <div className="bg-gray-50 rounded-lg p-4 h-fit">
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    Medications for {currentCondition.name}
                  </h4>
                  <div className="space-y-3">
                    {currentConditionMedications.map(medication => {
                      const medicationEntry = formData.medicationEntries.find(
                        e => e.medicationId === medication.id
                      );
                      
                      if (!medicationEntry) return null;
                      
                      return (
                        <div key={medication.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800 text-sm">{medication.name}</h5>
                              <p className="text-xs text-gray-600">{medication.dosage} • {medication.frequency}</p>
                            </div>
                            
                            <div className="flex space-x-2 ml-3">
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  medicationEntry.taken 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                onClick={() => updateMedicationTaken(medication.id, true)}
                              >
                                Taken
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  !medicationEntry.taken 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                                onClick={() => updateMedicationTaken(medication.id, false)}
                              >
                                {medication.frequency === 'As required' ? 'Not taken' : 'Skipped'}
                              </button>
                            </div>
                          </div>
                          
                          {medicationEntry.taken && (
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Times taken
                              </label>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => updateMedicationTimesTaken(medication.id, -1)}
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="mx-2 font-medium text-sm">
                                  {medicationEntry.timesTaken || 1}
                                </span>
                                <button
                                  type="button"
                                  className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => updateMedicationTimesTaken(medication.id, 1)}
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {!medicationEntry.taken && medication.frequency !== 'As required' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Reason for skipping?
                              </label>
                              <select
                                className="w-full px-2 py-1 text-xs text-gray-700 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={medicationEntry.skippedReason || ''}
                                onChange={(e) => updateMedicationSkippedReason(medication.id, e.target.value)}
                              >
                                <option value="">Select a reason</option>
                                <option value="Forgot">Forgot</option>
                                <option value="Side effects">Side effects</option>
                                <option value="Not needed">Not needed</option>
                                <option value="Out of medication">Out of medication</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lifestyle factors step */}
        {currentStep === user.conditions.length && (
          <div className="space-y-6">
            <p className="text-gray-600 mb-6">
              How were these lifestyle factors today? These help identify patterns and triggers.
            </p>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Stress level */}
              <div>
                <div className="flex items-center mb-3">
                  <AlertCircle size={18} className="text-orange-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Stress Level
                  </label>
                </div>
                <SeverityScale 
                  value={(formData.factors.stress || 0) as SeverityLevel}
                  onChange={(value) => updateFactor('stress', value)}
                  labels={['Very Low', 'Low', 'Moderate', 'High', 'Very High']}
                  showLabels={false}
                  allowUnselected={true}
                />
              </div>
              
              {/* Sleep quality */}
              <div>
                <div className="flex items-center mb-3">
                  <Moon size={18} className="text-blue-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Sleep Quality
                  </label>
                </div>
                <SeverityScale 
                  value={(formData.factors.sleep || 0) as SeverityLevel}
                  onChange={(value) => updateFactor('sleep', value)}
                  labels={['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent']}
                  showLabels={false}
                  allowUnselected={true}
                />
              </div>
              
              {/* Water intake */}
              <div>
                <div className="flex items-center mb-3">
                  <Droplets size={18} className="text-blue-400 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Water Intake
                  </label>
                </div>
                <SeverityScale 
                  value={(formData.factors.water || 0) as SeverityLevel}
                  onChange={(value) => updateFactor('water', value)}
                  labels={['Very Low', 'Low', 'Adequate', 'Good', 'Excellent']}
                  showLabels={false}
                  allowUnselected={true}
                />
              </div>
              
              {/* Diet quality */}
              <div>
                <div className="flex items-center mb-3">
                  <Utensils size={18} className="text-green-500 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Diet Quality
                  </label>
                </div>
                <SeverityScale 
                  value={(formData.factors.diet || 0) as SeverityLevel}
                  onChange={(value) => updateFactor('diet', value)}
                  labels={['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent']}
                  showLabels={false}
                  allowUnselected={true}
                />
              </div>
              
              {/* Weather */}
              <div>
                <div className="flex items-center mb-3">
                  <CloudRain size={18} className="text-blue-400 mr-2" />
                  <label className="block text-sm font-medium text-gray-700">
                    Weather
                  </label>
                </div>
                <select
                  className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.factors.weather || ''}
                  onChange={(e) => updateFactor('weather', e.target.value)}
                >
                  <option value="">Select weather</option>
                  <option value="Humid">Humid</option>
                  <option value="Dry">Dry</option>
                  <option value="Hot">Hot</option>
                  <option value="Cold">Cold</option>
                  <option value="Rainy">Rainy</option>
                  <option value="Windy">Windy</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Notes step */}
        {currentStep === totalSteps - 1 && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Any additional observations or notes about your skin today?
            </p>
            
            <textarea
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Any other observations or notes about your skin on this day..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            ></textarea>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            currentStep === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ChevronLeft size={18} />
          <span>Previous</span>
        </button>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={18} />
            <span>{isEditing ? 'Update Check-in' : 'Save Check-in'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              !canProceed()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex justify-center mt-6 space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          ></div>
        ))}
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AICheckInAssistant
          formData={formData}
          onUpdateFormData={handleAIFormUpdate}
          onClose={() => setShowAIAssistant(false)}
        />
      )}
    </div>
  );
};

export default CheckInPage;