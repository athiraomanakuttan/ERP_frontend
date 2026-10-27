import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Paperclip, ReceiptText } from 'lucide-react';
import { listPayments } from './paymentService';

const modeLabel=(v:string)=>({cash:'Cash',bank_remittance:'Bank remittance',bank_transfer:'Bank transfer',cheque:'Cheque'} as Record<string,string>)[v]||v;
export function PaymentHistory({ invoiceId, currency }: { invoiceId:string; currency:string }){
 const [open,setOpen]=useState(false);
 const q=useQuery({queryKey:['payments','invoice',invoiceId],queryFn:()=>listPayments({invoice:invoiceId,limit:50}),enabled:open});
 return <div className="border-t border-line pt-3">
  <button type="button" onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between text-sm font-medium text-heading"><span className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-primary-500"/>Payment history</span>{open?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
  {open&&<div className="mt-3 space-y-2">{q.isLoading&&<p className="text-xs text-subtle">Loading payments…</p>}{(q.data?.items??[]).map(p=><div key={p._id} className="rounded-xl bg-muted p-3 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-heading">{p.paymentId}</p><p className="text-xs text-subtle">{modeLabel(p.paymentMode)} · {new Date(p.paymentDate).toLocaleDateString()}</p></div><p className="font-bold text-heading">{currency} {Number(p.amountReceived).toFixed(3)}</p></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-subtle md:grid-cols-4"><span>Bank charge: {Number(p.bankCharges||0).toFixed(3)}</span><span>Net: {Number(p.netDeposited||0).toFixed(3)}</span><span>Reference: {p.referenceId||'—'}</span><span>Deposited to: {p.depositedTo||'—'}</span></div>{p.notes&&<p className="mt-2 text-xs text-body">{p.notes}</p>}{p.attachmentName&&(p.attachmentDataUrl?<a href={p.attachmentDataUrl} download={p.attachmentName} className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:underline"><Paperclip className="h-3 w-3"/>{p.attachmentName}</a>:<p className="mt-2 flex items-center gap-1 text-xs text-primary-600"><Paperclip className="h-3 w-3"/>{p.attachmentName}</p>)}</div>)}{!q.isLoading&&!q.data?.items.length&&<p className="rounded-lg bg-muted px-3 py-2 text-xs text-subtle">No payments recorded yet.</p>}</div>}
 </div>;
}
