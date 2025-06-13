import React from 'react';
import { SeverityLevel } from '../types';

interface SeverityScaleProps {
  value: SeverityLevel;
  onChange: (value: SeverityLevel) => void;
  labels?: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  readonly?: boolean;
  allowUnselected?: boolean;
}

const SeverityScale: React.FC<SeverityScaleProps> = ({
  value,
  onChange,
  labels = ['Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme'],
  size = 'md',
  showLabels = true,
  readonly = false,
  allowUnselected = false,
}) => {
  const getColorForLevel = (level: number): string => {
    switch (level) {
      case 1: return 'bg-success-500';
      case 2: return 'bg-accent-500';
      case 3: return 'bg-warning-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-error-500';
      default: return 'bg-neutral-300';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  const buttonClasses = getSizeClasses();
  
  const handleClick = (level: SeverityLevel) => {
    if (!readonly) {
      // If allowUnselected is true and the same level is clicked, deselect it
      if (allowUnselected && value === level) {
        onChange(0 as SeverityLevel);
      } else {
        onChange(level);
      }
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              className={`${buttonClasses} rounded-full ${
                value >= level ? getColorForLevel(level) : 'bg-neutral-200'
              } transition-all duration-200 transform ${
                value === level ? 'scale-110 ring-2 ring-offset-1 ring-neutral-300' : ''
              } ${readonly ? 'cursor-default' : 'hover:scale-105'}`}
              onClick={() => handleClick(level as SeverityLevel)}
              disabled={readonly}
              aria-label={`Severity level ${level}: ${labels[level - 1]}`}
            />
          ))}
        </div>
        
        {showLabels && value > 0 && (
          <div className="text-sm font-medium text-neutral-900 ml-4">
            {labels[value - 1]}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeverityScale;