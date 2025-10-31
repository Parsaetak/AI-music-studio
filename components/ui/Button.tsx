
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading = false, className = '', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:opacity-60 disabled:pointer-events-none px-5 py-2.5 shadow-lg";

  const variantClasses = {
    primary: 'text-white rainbow-bg transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/40',
    secondary: 'bg-gray-700/50 border border-gray-600 text-gray-200 hover:bg-gray-700/80 transform hover:scale-105',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
