import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { FormField } from '@/components/molecules/FormField';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { ErrorText } from '@/components/atoms/ErrorText';
import { Button } from '@/components/atoms/Button';
import { loginSchema } from '@/schemas/auth.schema';
import { scrollToFirstError } from '@/utils/validation';
import { loginRequest } from '@/features/auth/authService';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/features/auth/authSlice';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => loginRequest(email, password),
    onSuccess: (data) => {
      dispatch(setCredentials(data));
      navigate('/dashboard', { replace: true });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'email') errors.email = issue.message;
        if (issue.path[0] === 'password') errors.password = issue.message;
      }
      setFieldErrors(errors);
      scrollToFirstError();
      return;
    }
    setFieldErrors({});
    mutation.mutate();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-heading">Welcome back</h1>
      <p className="mt-1.5 text-sm text-subtle">Sign in with the email and password your admin set up for you.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <FormField
          id="email"
          label="Email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          placeholder="you@company.com"
        />

        <div>
          <Label htmlFor="password" required>Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hasError={Boolean(fieldErrors.password)}
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-faint hover:text-subtle"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <ErrorText>{fieldErrors.password}</ErrorText>
            <Link to="/forgot-password" className="ml-auto shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>
        </div>

        {mutation.isError && (
          <ErrorText>
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Login failed. Please try again.'}
          </ErrorText>
        )}
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Sign in
        </Button>
      </form>
    </div>
  );
}
