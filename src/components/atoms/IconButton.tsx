import { ButtonHTMLAttributes } from 'react';

export function IconButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-muted hover:text-heading ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
