import { InputHTMLAttributes } from 'react';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { ErrorText } from '@/components/atoms/ErrorText';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, className, ...rest }: FormFieldProps) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} required={Boolean(rest.required)}>{label}</Label>}
      <Input id={id} hasError={Boolean(error)} {...rest} />
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
