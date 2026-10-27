import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = '', children, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-heading
          transition-colors focus:outline-none focus:ring-2
          ${hasError ? 'border-red-400 focus:ring-red-200' : 'border-line focus:border-primary-400 focus:ring-primary-100'} ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
