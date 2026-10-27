import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search } from 'lucide-react';
import { Input } from '@/components/atoms/Input';
import { Spinner } from '@/components/atoms/Spinner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchEmployees } from './employeeService';
import { EmployeeRef } from '@/types/entities';

interface EmployeeComboboxProps {
  label: string;
  value?: string; // selected employee id
  initialLabel?: string; // display name when value is set but not yet searched
  onChange: (id: string | undefined) => void;
}

/**
 * Debounced, server-searched picker (spec: reporting manager / team lead).
 * Avoids loading the entire employee list into the browser - only the
 * matching page (max 20, capped server-side) is fetched, and only after
 * the person pauses typing.
 */
export function EmployeeCombobox({ label, value, initialLabel, onChange }: EmployeeComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? '');
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['employee-search', debouncedQuery],
    queryFn: () => searchEmployees(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000, // repeated searches for the same term within 30s reuse cache
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function select(employee: EmployeeRef) {
    const name = `${employee.firstName} ${employee.lastName ?? ''}`.trim();
    setSelectedLabel(name);
    setQuery('');
    setIsOpen(false);
    onChange(employee._id);
  }

  function clear() {
    setSelectedLabel('');
    setQuery('');
    onChange(undefined);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-heading">{label}</label>
      {value && selectedLabel ? (
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <span className="text-body">{selectedLabel}</span>
          <button type="button" onClick={clear} className="text-faint hover:text-body" aria-label="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              placeholder="Type at least 2 characters to search…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-9"
            />
          </div>
          {isOpen && debouncedQuery.trim().length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-floating">
              {isFetching ? (
                <div className="p-3">
                  <Spinner className="mx-auto h-4 w-4" />
                </div>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-faint">No matches</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => select(r)}
                    className="block w-full px-3 py-2 text-left text-sm text-body transition-colors hover:bg-surface-hover"
                  >
                    {r.firstName} {r.lastName ?? ''} <span className="text-faint">— {r.email}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
