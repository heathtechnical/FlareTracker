import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'full',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const LogoIcon = () => (
    <div className={`${iconSizeClasses[size]} relative flex-shrink-0`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer circle - skin layer */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="url(#skinGradient)"
          stroke="url(#borderGradient)"
          strokeWidth="2"
        />
        
        {/* Inner analytical pattern */}
        <g opacity="0.9">
          {/* Data points */}
          <circle cx="12" cy="14" r="1.5" fill="#0EA5E9" />
          <circle cx="20" cy="12" r="1.5" fill="#8B5CF6" />
          <circle cx="28" cy="16" r="1.5" fill="#10B981" />
          <circle cx="15" cy="22" r="1.5" fill="#F59E0B" />
          <circle cx="25" cy="24" r="1.5" fill="#EF4444" />
          <circle cx="20" cy="28" r="1.5" fill="#0EA5E9" />
          
          {/* Connecting lines - analytics visualization */}
          <path
            d="M12 14 L20 12 L28 16 M15 22 L20 28 L25 24"
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          
          {/* Central analysis symbol */}
          <circle
            cx="20"
            cy="20"
            r="3"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <circle
            cx="20"
            cy="20"
            r="1"
            fill="#ffffff"
            opacity="0.9"
          />
        </g>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  const LogoText = () => (
    <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 bg-clip-text text-transparent`}>
      Skin Logger
    </span>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  if (variant === 'text') {
    return <LogoText />;
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <LogoIcon />
      <LogoText />
    </div>
  );
};

export default Logo;