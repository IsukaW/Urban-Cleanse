import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantClasses = () => {
    const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} text-white focus:ring-green-500` + 
               ` bg-green-600 hover:bg-green-700 active:bg-green-800` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
      case 'secondary':
        return `${baseStyles} bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500` +
               ` disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`;
      case 'success':
        return `${baseStyles} text-white focus:ring-green-500` +
               ` bg-green-600 hover:bg-green-700 active:bg-green-800` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
      case 'danger':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
      case 'info':
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
      default:
        return `${baseStyles} text-white focus:ring-green-500` +
               ` bg-green-600 hover:bg-green-700 active:bg-green-800` +
               ` disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const buttonClasses = `
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${className}
    inline-flex items-center justify-center
    ${loading || disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      style={{
        backgroundColor: variant === 'primary' || variant === 'success' ? '#16a34a' : undefined,
        opacity: disabled || loading ? 0.6 : 1,
        visibility: 'visible'
      }}
      {...props}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;