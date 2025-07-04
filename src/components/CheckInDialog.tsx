import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Save,
  Plus,
  Minus,
  AlertCircle,
  Moon,
  CloudRain,
  Utensils,
  Droplets,
  ChevronLeft,
  ChevronRight,
  X,
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import SeverityScale from "./SeverityScale";
import {
  CheckIn,
  ConditionEntry,
  MedicationEntry,
  SeverityLevel,
} from "../types";

interface CheckInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedDate?: Date; // New prop for the selected date
}

const CheckInDialog: React.FC<CheckInDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
}) => {
  const { user, addCheckIn, updateCheckIn } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<CheckIn, "id">>({
    date: new Date().toISOString(),
    conditionEntries: [],
    medicationEntries: [],
    factors: {},
  });

  useEffect(() => {
    if (!user || !isOpen) return;

    // Use selectedDate if provided, otherwise use today
    const targetDate = selectedDate || new Date();
    const targetDateString = format(targetDate, "yyyy-MM-dd");

    // Check if there's already a check-in for the target date
    const existingCheckIn = user.checkIns.find((checkIn) => {
      const checkInDate = format(new Date(checkIn.date), "yyyy-MM-dd");
      return checkInDate === targetDateString;
    });

    if (existingCheckIn) {
      // If there is an existing check-in, load it for editing
      const existingConditionIds = existingCheckIn.conditionEntries.map(
        (entry) => entry.conditionId
      );
      const missingConditions = user.conditions.filter(
        (condition) => !existingConditionIds.includes(condition.id)
      );

      // Add missing conditions with default values (no severity selected)
      const additionalConditionEntries: ConditionEntry[] =
        missingConditions.map((condition) => ({
          conditionId: condition.id,
          severity: 0 as SeverityLevel,
          symptoms: [],
        }));

      // Get medications for conditions and create entries
      const conditionMedications = user.medications.filter(
        (med) =>
          med.active &&
          user.conditions.some((condition) =>
            med.conditionIds.includes(condition.id)
          )
      );

      const existingMedicationIds = existingCheckIn.medicationEntries.map(
        (entry) => entry.medicationId
      );
      const missingMedications = conditionMedications.filter(
        (med) => !existingMedicationIds.includes(med.id)
      );

      const additionalMedicationEntries: MedicationEntry[] =
        missingMedications.map((medication) => ({
          medicationId: medication.id,
          taken: false,
        }));

      setFormData({
        date: existingCheckIn.date,
        conditionEntries: [
          ...existingCheckIn.conditionEntries,
          ...additionalConditionEntries,
        ],
        medicationEntries: [
          ...existingCheckIn.medicationEntries,
          ...additionalMedicationEntries,
        ],
        notes: existingCheckIn.notes,
        photoUrl: existingCheckIn.photoUrl,
        factors: { ...existingCheckIn.factors },
      });

      // Set photo preview if existing photo URL
      if (existingCheckIn.photoUrl) {
        setPhotoPreview(existingCheckIn.photoUrl);
      }

      setIsEditing(true);
    } else {
      // If not, create a new one with defaults for the target date
      const defaultConditionEntries: ConditionEntry[] = user.conditions.map(
        (condition) => ({
          conditionId: condition.id,
          severity: 0 as SeverityLevel,
          symptoms: [],
        })
      );

      // Get medications for conditions only
      const conditionMedications = user.medications.filter(
        (med) =>
          med.active &&
          user.conditions.some((condition) =>
            med.conditionIds.includes(condition.id)
          )
      );

      const defaultMedicationEntries: MedicationEntry[] =
        conditionMedications.map((medication) => ({
          medicationId: medication.id,
          taken: false,
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
          water: 0 as SeverityLevel,
        },
      });
      setIsEditing(false);
    }

    // Reset to first step when opening
    setCurrentStep(0);
    setSubmitAttempted(false);
    setPhotoFile(null);
    // setPhotoPreview(null);
  }, [user, isOpen, selectedDate]);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Photo size must be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      setPhotoFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, photoUrl: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    // Validate that all conditions have severity selected (not 0)
    const unratedConditions = formData.conditionEntries.filter(
      (entry) => entry.severity === 0
    );
    if (unratedConditions.length > 0) {
      alert("Please rate the severity for all conditions before saving.");
      return;
    }

    // Use the target date for the check-in
    const targetDate = selectedDate || new Date();
    const targetDateTime = new Date(targetDate);
    targetDateTime.setHours(12, 0, 0, 0);

    let photoUrl = formData.photoUrl;

    // Handle photo upload (in a real app, you'd upload to a cloud service)
    if (photoFile) {
      // For demo purposes, we'll use a data URL
      // In production, you'd upload to a service like Supabase Storage, AWS S3, etc.
      photoUrl = photoPreview;
    }

    const checkInData = {
      ...formData,
      date: targetDateTime.toISOString(),
      photoUrl,
    };

    if (isEditing && user) {
      const targetDateString = format(targetDate, "yyyy-MM-dd");
      const existingCheckIn = user.checkIns.find((checkIn) => {
        const checkInDate = format(new Date(checkIn.date), "yyyy-MM-dd");
        return checkInDate === targetDateString;
      });

      if (existingCheckIn) {
        updateCheckIn({
          ...checkInData,
          id: existingCheckIn.id,
        });
      }
    } else {
      addCheckIn(checkInData);
    }

    onSuccess?.();
    onClose();
  };

  const updateConditionSeverity = (
    conditionId: string,
    severity: SeverityLevel
  ) => {
    setFormData((prev) => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map((entry) =>
        entry.conditionId === conditionId ? { ...entry, severity } : entry
      ),
    }));
  };

  const updateConditionSymptoms = (
    conditionId: string,
    symptom: string,
    isChecked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map((entry) =>
        entry.conditionId === conditionId
          ? {
              ...entry,
              symptoms: isChecked
                ? [...entry.symptoms, symptom]
                : entry.symptoms.filter((s) => s !== symptom),
            }
          : entry
      ),
    }));
  };

  const updateConditionNotes = (conditionId: string, notes: string) => {
    setFormData((prev) => ({
      ...prev,
      conditionEntries: prev.conditionEntries.map((entry) =>
        entry.conditionId === conditionId ? { ...entry, notes } : entry
      ),
    }));
  };

  const updateMedicationTaken = (medicationId: string, taken: boolean) => {
    setFormData((prev) => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map((entry) =>
        entry.medicationId === medicationId
          ? {
              ...entry,
              taken,
              ...(taken
                ? { timesTaken: 1, skippedReason: undefined }
                : { timesTaken: undefined }),
            }
          : entry
      ),
    }));
  };

  const updateMedicationTimesTaken = (medicationId: string, change: number) => {
    setFormData((prev) => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map((entry) => {
        if (entry.medicationId === medicationId && entry.taken) {
          const currentTimes = entry.timesTaken || 1;
          const newTimes = Math.max(1, currentTimes + change);
          return { ...entry, timesTaken: newTimes };
        }
        return entry;
      }),
    }));
  };

  const updateMedicationSkippedReason = (
    medicationId: string,
    skippedReason: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      medicationEntries: prev.medicationEntries.map((entry) =>
        entry.medicationId === medicationId && !entry.taken
          ? { ...entry, skippedReason }
          : entry
      ),
    }));
  };

  const updateFactor = (factor: keyof CheckIn["factors"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      factors: {
        ...prev.factors,
        [factor]: value,
      },
    }));
  };

  // Common symptom options
  const commonSymptoms = [
    "Itchiness",
    "Redness",
    "Dryness",
    "Flaking",
    "Pain",
    "Swelling",
    "Burning",
    "Bleeding",
  ];

  if (!user || !isOpen) return null;

  // Calculate total steps: conditions + lifestyle factors + notes + photo
  const totalSteps = user.conditions.length + 1 + 1 + 1; // conditions + lifestyle + notes + photo
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
    ? formData.conditionEntries.find(
        (entry) => entry.conditionId === currentCondition.id
      )
    : null;

  // Get medications for current condition
  const getCurrentConditionMedications = () => {
    if (!currentCondition) return [];
    return user.medications.filter(
      (med) => med.active && med.conditionIds.includes(currentCondition.id)
    );
  };

  const currentConditionMedications = getCurrentConditionMedications();

  const canProceed = () => {
    if (currentStep < user.conditions.length) {
      // For condition steps, severity must be selected
      return currentConditionEntry && currentConditionEntry.severity > 0;
    }
    return true; // Lifestyle factors, notes, and photo are optional
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
      return currentCondition?.name || "Condition";
    } else if (currentStep === user.conditions.length) {
      return "Lifestyle Factors";
    } else if (currentStep === user.conditions.length + 1) {
      return "Additional Notes";
    } else {
      return "Add Photo (Optional)";
    }
  };

  // Get the display date
  const displayDate = selectedDate || new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ marginTop: 0 }}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? "Edit Check-in" : "Daily Check-in"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(displayDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-gray-100">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-800">
              {getStepTitle()}
            </h3>
            {currentCondition && (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: currentCondition.color }}
              ></div>
            )}
          </div>

          {/* Condition step */}
          {currentStep < user.conditions.length &&
            currentCondition &&
            currentConditionEntry && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Main condition content */}
                <div className="space-y-6">
                  {/* Severity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How severe was your {currentCondition.name} today? *
                    </label>
                    <SeverityScale
                      value={currentConditionEntry.severity}
                      onChange={(value) =>
                        updateConditionSeverity(currentCondition.id, value)
                      }
                      showLabels={currentConditionEntry.severity > 0}
                      allowUnselected={true}
                    />
                    {submitAttempted &&
                      currentConditionEntry.severity === 0 && (
                        <p className="text-xs text-red-500 mt-2">
                          Please select a severity level
                        </p>
                      )}
                  </div>

                  {/* Symptoms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      What symptoms did you experience?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {commonSymptoms.map((symptom) => (
                        <label key={symptom} className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            checked={currentConditionEntry.symptoms.includes(
                              symptom
                            )}
                            onChange={(e) =>
                              updateConditionSymptoms(
                                currentCondition.id,
                                symptom,
                                e.target.checked
                              )
                            }
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {symptom}
                          </span>
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
                      value={currentConditionEntry.notes || ""}
                      onChange={(e) =>
                        updateConditionNotes(
                          currentCondition.id,
                          e.target.value
                        )
                      }
                    ></textarea>
                  </div>
                </div>

                {/* Medications sidebar */}
                {currentConditionMedications.length > 0 && (
                  <div>
                    <div className="bg-gray-50 rounded-lg p-4 h-fit">
                      <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                        Medications for {currentCondition.name}
                      </h4>
                      <div className="space-y-3">
                        {currentConditionMedications.map((medication) => {
                          const medicationEntry =
                            formData.medicationEntries.find(
                              (e) => e.medicationId === medication.id
                            );

                          if (!medicationEntry) return null;

                          return (
                            <div
                              key={medication.id}
                              className="bg-white rounded-lg p-3 border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-800 text-sm">
                                    {medication.name}
                                  </h5>
                                  <p className="text-xs text-gray-600">
                                    {medication.dosage} • {medication.frequency}
                                  </p>
                                </div>

                                <div className="flex space-x-2 ml-3">
                                  <button
                                    type="button"
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      medicationEntry.taken
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                    onClick={() =>
                                      updateMedicationTaken(medication.id, true)
                                    }
                                  >
                                    Taken
                                  </button>
                                  <button
                                    type="button"
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      !medicationEntry.taken
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                    onClick={() =>
                                      updateMedicationTaken(
                                        medication.id,
                                        false
                                      )
                                    }
                                  >
                                    {medication.frequency === "As required"
                                      ? "Not taken"
                                      : "Skipped"}
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
                                      onClick={() =>
                                        updateMedicationTimesTaken(
                                          medication.id,
                                          -1
                                        )
                                      }
                                    >
                                      <Minus size={10} />
                                    </button>
                                    <span className="mx-2 font-medium text-sm">
                                      {medicationEntry.timesTaken || 1}
                                    </span>
                                    <button
                                      type="button"
                                      className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                                      onClick={() =>
                                        updateMedicationTimesTaken(
                                          medication.id,
                                          1
                                        )
                                      }
                                    >
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {!medicationEntry.taken &&
                                medication.frequency !== "As required" && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Reason for skipping?
                                    </label>
                                    <select
                                      className="w-full px-2 py-1 text-xs text-gray-700 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={
                                        medicationEntry.skippedReason || ""
                                      }
                                      onChange={(e) =>
                                        updateMedicationSkippedReason(
                                          medication.id,
                                          e.target.value
                                        )
                                      }
                                    >
                                      <option value="">Select a reason</option>
                                      <option value="Forgot">Forgot</option>
                                      <option value="Side effects">
                                        Side effects
                                      </option>
                                      <option value="Not needed">
                                        Not needed
                                      </option>
                                      <option value="Out of medication">
                                        Out of medication
                                      </option>
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
                How were these lifestyle factors today? These help identify
                patterns and triggers.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    onChange={(value) => updateFactor("stress", value)}
                    labels={[
                      "Very Low",
                      "Low",
                      "Moderate",
                      "High",
                      "Very High",
                    ]}
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
                    onChange={(value) => updateFactor("sleep", value)}
                    labels={["Very Poor", "Poor", "Fair", "Good", "Excellent"]}
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
                    onChange={(value) => updateFactor("water", value)}
                    labels={[
                      "Very Low",
                      "Low",
                      "Adequate",
                      "Good",
                      "Excellent",
                    ]}
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
                    onChange={(value) => updateFactor("diet", value)}
                    labels={["Very Poor", "Poor", "Fair", "Good", "Excellent"]}
                    showLabels={false}
                    allowUnselected={true}
                  />
                </div>
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
                  value={formData.factors.weather || ""}
                  onChange={(e) => updateFactor("weather", e.target.value)}
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
          )}

          {/* Notes step */}
          {currentStep === user.conditions.length + 1 && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Any additional observations or notes about your skin today?
              </p>

              <textarea
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Any other observations or notes about your skin on this day..."
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              ></textarea>
            </div>
          )}

          {/* Photo step */}
          {currentStep === totalSteps - 1 && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Optionally add a photo to visually track your skin condition.
              </p>

              {!photoPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Camera size={48} className="text-gray-400" />
                    </div>

                    <div>
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <span className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload size={18} />
                          <span>Choose Photo</span>
                        </span>
                      </label>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>

                    <p className="text-sm text-gray-500">
                      Upload a photo (JPG, PNG, max 5MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Check-in photo"
                      className="max-w-full max-h-64 rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex space-x-3">
                    <label htmlFor="photo-replace" className="cursor-pointer">
                      <span className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <Upload size={18} />
                        <span>Replace Photo</span>
                      </span>
                    </label>
                    <input
                      id="photo-replace"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle
                    className="text-blue-500 mr-3 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Privacy Note</p>
                    <p>
                      Photos are stored securely and are only visible to you.
                      You can remove them at any time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>

          <div className="flex justify-center space-x-2">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              ></div>
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={18} />
              <span>{isEditing ? "Update Check-in" : "Save Check-in"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                !canProceed()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckInDialog;