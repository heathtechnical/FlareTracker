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
          r="48"
          stroke="#EF7674"
          strokeWidth="4"
          fill="none"
        />
        
        {/* Flame/drop shape - multiple nested curves */}
        <path
          d="M50 20 C35 35, 35 50, 50 65 C65 50, 65 35, 50 20 Z"
          stroke="#EF7674"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M50 28 C40 40, 40 50, 50 60 C60 50, 60 40, 50 28 Z"
          stroke="#EF7674"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M50 36 C45 45, 45 50, 50 55 C55 50, 55 45, 50 36 Z"
          stroke="#EF7674"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Inner drop/flame core */}
        <path
          d="M50 44 C48 47, 48 50, 50 52 C52 50, 52 47, 50 44 Z"
          stroke="#EF7674"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
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