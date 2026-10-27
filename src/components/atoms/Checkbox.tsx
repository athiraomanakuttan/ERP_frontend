import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, className = '', id, ...rest }, ref) => {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-body">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={`h-4 w-4 rounded border-line text-primary-600 accent-[rgb(var(--color-primary-600))] focus:ring-2 focus:ring-primary-200 ${className}`}
        {...rest}
      />
      {label}
    </label>
  );
});
Checkbox.displayName = 'Checkbox';
