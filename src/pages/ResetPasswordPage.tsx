import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { ErrorText } from '@/components/atoms/ErrorText';
import { passwordField, scrollToFirstError } from '@/utils/validation';
import { resetPasswordRequest } from '@/features/auth/authService';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [completed, setCompleted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => resetPasswordRequest(token, password),
    onSuccess: () => setCompleted(true),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passwordResult = passwordField.safeParse(password);
    const nextErrors: typeof errors = {};
    if (!passwordResult.success) nextErrors.password = passwordResult.error.issues[0]?.message;
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !token) { scrollToFirstError(); return; }
    mutation.mutate();
  }

  if (completed) {
    return (
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-heading">Password updated</h1>
        <p className="mt-2 text-sm leading-6 text-subtle">Your password has been reset successfully. You can now sign in with the new password.</p>
        <Link to="/login" className="mt-7 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Go to sign in</Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600"><KeyRound className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-semibold text-heading">Invalid reset link</h1>
        <p className="mt-2 text-sm leading-6 text-subtle">This reset link is missing its security token. Request a new password reset link.</p>
        <Link to="/forgot-password" className="mt-7 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700">Request another link</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-heading">Create a new password</h1>
      <p className="mt-1.5 text-sm leading-6 text-subtle">Use at least 8 characters with uppercase, lowercase, a number and a special character.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="new-password" required>New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hasError={Boolean(errors.password)}
              autoComplete="new-password"
              className="pr-10"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex items-center px-3 text-faint hover:text-subtle" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <ErrorText>{errors.password}</ErrorText>
        </div>

        <div>
          <Label htmlFor="confirm-password" required>Confirm password</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            hasError={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
          />
          <ErrorText>{errors.confirmPassword}</ErrorText>
        </div>

        {mutation.isError && (
          <ErrorText>
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'This reset link is invalid or has expired.'}
          </ErrorText>
        )}
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>Reset password</Button>
      </form>
    </div>
  );
}
