// src/components/ui/Alert.tsx
import React from 'react';
import { Info, XCircle, CheckCircle } from 'lucide-react';

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  className?: string;
  icon?: React.ReactNode; // Optional prop to pass a custom icon
}

const Alert: React.FC<AlertProps> = ({ type, message, className, icon }) => {
  let bgColorClass = '';
  let textColorClass = '';
  let iconComponent = icon;

  switch (type) {
    case 'info':
      bgColorClass = 'bg-blue-50';
      textColorClass = 'text-blue-800';
      if (!icon) iconComponent = <Info className="h-5 w-5 text-blue-500" />;
      break;
    case 'success':
      bgColorClass = 'bg-green-50';
      textColorClass = 'text-green-800';
      if (!icon) iconComponent = <CheckCircle className="h-5 w-5 text-green-500" />;
      break;
    case 'warning':
      bgColorClass = 'bg-yellow-50';
      textColorClass = 'text-yellow-800';
      if (!icon) iconComponent = <Info className="h-5 w-5 text-yellow-500" />; // Or specific warning icon
      break;
    case 'error':
      bgColorClass = 'bg-red-50';
      textColorClass = 'text-red-800';
      if (!icon) iconComponent = <XCircle className="h-5 w-5 text-red-500" />;
      break;
    default:
      bgColorClass = 'bg-gray-50';
      textColorClass = 'text-gray-800';
      if (!icon) iconComponent = <Info className="h-5 w-5 text-gray-500" />;
  }

  return (
    <div className={`p-4 rounded-md ${bgColorClass} ${textColorClass} flex items-center space-x-3 ${className || ''}`}>
      {iconComponent && <div className="flex-shrink-0">{iconComponent}</div>}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export default Alert;