// src/components/ui/Select.tsx
import React, { SelectHTMLAttributes } from 'react';

// Define props for the Select component, extending native select attributes
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; // Optional label for the select element
  error?: string; // Optional error message to display
  fullWidth?: boolean; // Optional prop to make the select take full width
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  fullWidth = false,
  className = '',
  id,
  children, // This will render the <option> elements passed as children
  ...props // Capture any other native select attributes
}) => {
  const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            block w-full rounded-md border border-slate-300 shadow-sm
            focus:border-sky-500 focus:ring-sky-500 sm:text-sm
            pr-10 py-2 pl-3 // Padding to accommodate potential dropdown arrow
            ${error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {children} {/* Render options passed to the component */}
        </select>
        {/* Optional: Add a custom dropdown arrow icon if desired, e.g., using lucide-react 'ChevronDown' */}
        {/* <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div> */}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;