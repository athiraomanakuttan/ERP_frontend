import { LabelHTMLAttributes, ReactNode } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children?: ReactNode;
}

export function Label({ className = '', required = false, children, ...rest }: LabelProps) {
  return (
    <label className={`mb-1.5 block text-sm font-medium text-heading ${className}`} {...rest}>
      {children}
      {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
    </label>
  );
}
