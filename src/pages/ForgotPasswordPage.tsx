import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { FormField } from '@/components/molecules/FormField';
import { Button } from '@/components/atoms/Button';
import { ErrorText } from '@/components/atoms/ErrorText';
import { emailAddress, scrollToFirstError } from '@/utils/validation';
import { forgotPasswordRequest } from '@/features/auth/authService';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => forgotPasswordRequest(email.trim()),
    onSuccess: () => setSubmitted(true),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = emailAddress.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? 'Enter a valid email address');
      scrollToFirstError();
      return;
    }
    setEmailError('');
    mutation.mutate();
  }

  if (submitted) {
    return (
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-heading">Check your email</h1>
        <p className="mt-2 text-sm leading-6 text-subtle">
          We sent a password reset link to <span className="font-medium text-body">{email}</span>. The link expires in 1 hour.
        </p>
        <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-subtle hover:text-heading">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="text-2xl font-semibold text-heading">Forgot password?</h1>
      <p className="mt-1.5 text-sm leading-6 text-subtle">Enter your work email and we’ll send you a secure reset link.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <FormField
          id="reset-email"
          label="Email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
          autoComplete="email"
          placeholder="you@company.com"
        />
        {mutation.isError && (
          <ErrorText>
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Unable to send reset instructions right now. Please try again.'}
          </ErrorText>
        )}
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>Send reset link</Button>
      </form>
    </div>
  );
}
