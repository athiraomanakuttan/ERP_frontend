import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { listCustomers, getCustomer, Customer } from './customerService';
import { ErrorText } from '@/components/atoms/ErrorText';
import { Label } from '@/components/atoms/Label';

interface Props {
  value: string;
  onChange: (id: string, customer?: Customer) => void;
  error?: string;
  required?: boolean;
}

export function CustomerPicker({ value, onChange, error, required }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const selectedQuery = useQuery({ queryKey: ['customer-picker-selected', value], queryFn: () => getCustomer(value), enabled: !!value });
  const optionsQuery = useQuery({
    queryKey: ['customer-picker-options', debounced],
    queryFn: () => listCustomers({ search: debounced || undefined, page: 1, limit: 20 }),
    enabled: open,
  });
  const selected = selectedQuery.data;
  const label = selected ? (selected.companyName || selected.primaryContactName) : '';
  const options = useMemo(() => optionsQuery.data?.items ?? [], [optionsQuery.data]);
  return <div className="relative">
    <Label required={required}>Customer</Label>
    {value && selected ? <div className={`mt-1 flex items-center justify-between rounded-lg border bg-surface px-3 py-2 ${error ? 'border-red-400' : 'border-line'}`}>
      <div className="min-w-0"><p className="truncate text-sm font-medium text-heading">{label}</p><p className="truncate text-xs text-subtle">{selected.email} · {selected.currency}</p></div>
      <button type="button" className="rounded p-1 text-subtle hover:bg-muted" onClick={() => { onChange(''); setSearch(''); setOpen(true); }} aria-label="Clear customer"><X className="h-4 w-4"/></button>
    </div> : <div className="relative mt-1">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-faint"/>
      <input aria-invalid={!!error || undefined} value={search} onFocus={() => setOpen(true)} onChange={e => { setSearch(e.target.value); setOpen(true); }} placeholder="Search customer/company/email/VAT..." className={`w-full rounded-lg border bg-surface py-2 pl-9 pr-3 text-sm text-heading placeholder:text-faint focus:outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-200' : 'border-line focus:border-primary-400 focus:ring-primary-100'}`}/>
      {open && <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-xl">
        {optionsQuery.isLoading && <div className="px-3 py-3 text-sm text-subtle">Loading customers…</div>}
        {!optionsQuery.isLoading && options.map(c => <button type="button" key={c._id} onMouseDown={e=>e.preventDefault()} onClick={() => { onChange(c._id, c); setSearch(''); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted">
          <p className="text-sm font-medium text-heading">{c.companyName || c.primaryContactName}</p>
          <p className="text-xs text-subtle">{c.primaryContactName} · {c.email} · {c.currency}</p>
        </button>)}
        {!optionsQuery.isLoading && !options.length && <div className="px-3 py-3 text-sm text-subtle">No matching customers.</div>}
      </div>}
    </div>}
    <ErrorText>{error}</ErrorText>
  </div>;
}
