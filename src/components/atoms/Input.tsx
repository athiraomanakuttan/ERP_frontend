import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ hasError, className = '', ...rest }, ref) => {
  return (
    <input
      ref={ref}
      aria-invalid={hasError || undefined}
      className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-heading placeholder:text-faint
        transition-colors focus:outline-none focus:ring-2
        ${hasError ? 'border-red-400 focus:ring-red-200' : 'border-line focus:border-primary-400 focus:ring-primary-100'} ${className}`}
      {...rest}
    />
  );
});
Input.displayName = 'Input';
