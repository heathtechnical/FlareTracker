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
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer circle */}
        <circle
          cx="50"
          cy="50"
          r="46"
          stroke="#EF7674"
          strokeWidth="8"
          fill="none"
        />
        
        {/* Main flame/drop shape - outermost */}
        <path
          d="M50 15 C50 15, 30 30, 30 50 C30 65, 40 75, 50 75 C60 75, 70 65, 70 50 C70 30, 50 15, 50 15 Z"
          stroke="#EF7674"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Second flame layer */}
        <path
          d="M50 22 C50 22, 35 35, 35 50 C35 62, 42 68, 50 68 C58 68, 65 62, 65 50 C65 35, 50 22, 50 22 Z"
          stroke="#EF7674"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Third flame layer */}
        <path
          d="M50 29 C50 29, 40 40, 40 50 C40 58, 44 62, 50 62 C56 62, 60 58, 60 50 C60 40, 50 29, 50 29 Z"
          stroke="#EF7674"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Inner flame/drop core */}
        <path
          d="M50 36 C50 36, 45 44, 45 50 C45 54, 47 56, 50 56 C53 56, 55 54, 55 50 C55 44, 50 36, 50 36 Z"
          stroke="#EF7674"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Innermost drop */}
        <ellipse
          cx="50"
          cy="50"
          rx="3"
          ry="4"
          fill="#EF7674"
        />
      </svg>
    </div>
  );

  const LogoText = () => (
    <span className={`${textSizeClasses[size]} font-bold text-gray-800`}>
      FlareTracker
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