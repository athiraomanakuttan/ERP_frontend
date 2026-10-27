export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p data-field-error="true" className="mt-1.5 text-xs text-red-500">{children}</p>;
}
