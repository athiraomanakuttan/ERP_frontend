import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Label } from '@/components/atoms/Label';
import { ErrorText } from '@/components/atoms/ErrorText';
import { FormField } from '@/components/molecules/FormField';
import { CustomerPicker } from '@/features/customers/CustomerPicker';
import { Customer, getCustomer } from '@/features/customers/customerService';
import { createInvoice,getInvoice,nextInvoiceNumber,updateInvoice,InvoicePayload } from '@/features/customers/invoiceService';
import { getAdminSettings } from '@/features/settings/settingsService';
import { TERM_OPTIONS } from '@/features/customers/financeConstants';
import { scrollToFirstError } from '@/utils/validation';

type Row={itemName:string;quantity:number;rate:number;discountType:'percentage'|'amount';discountValue:number};
const today=()=>new Date().toISOString().slice(0,10);
const row=():Row=>({itemName:'',quantity:1,rate:0,discountType:'percentage',discountValue:0});

type Errors=Record<string,string>;
export function InvoiceFormPage(){
 const {id}=useParams(); const nav=useNavigate();
 const settings=useQuery({queryKey:['app-settings'],queryFn:getAdminSettings});
 const existing=useQuery({queryKey:['invoice',id],queryFn:()=>getInvoice(id!),enabled:!!id});
 const [customer,setCustomer]=useState(''); const [selectedCustomer,setSelectedCustomer]=useState<Customer|undefined>();
 const [invoiceNumber,setInvoiceNumber]=useState(''); const [orderNumber,setOrderNumber]=useState(''); const [invoiceDate,setInvoiceDate]=useState(today()); const [terms,setTerms]=useState('due_on_receipt'); const [dueDate,setDueDate]=useState(today()); const [salesPerson,setSalesPerson]=useState('George P Rajan'); const [subject,setSubject]=useState(''); const [items,setItems]=useState<Row[]>([row()]); const [errors,setErrors]=useState<Errors>({}); const [serverError,setServerError]=useState('');
 useEffect(()=>{if(!id&&!invoiceNumber)nextInvoiceNumber().then(setInvoiceNumber).catch(()=>{});},[id,invoiceNumber]);
 useEffect(()=>{if(!id&&settings.data?.defaultSalesPerson)setSalesPerson(settings.data.defaultSalesPerson)},[id,settings.data]);
 useEffect(()=>{const x=existing.data;if(x){const cid=typeof x.customer==='string'?x.customer:(x.customer as any)._id;setCustomer(cid);setSelectedCustomer(typeof x.customer==='string'?undefined:x.customer as Customer);setInvoiceNumber(x.invoiceNumber);setOrderNumber(x.orderNumber||'');setInvoiceDate(x.invoiceDate.slice(0,10));setTerms(x.terms);setDueDate(x.dueDate.slice(0,10));setSalesPerson(x.salesPerson);setSubject(x.subject);setItems(x.items.map(i=>({itemName:i.itemName,quantity:i.quantity,rate:i.rate,discountType:i.discountType,discountValue:i.discountValue})));}},[existing.data]);
 useEffect(()=>{if(customer&&!selectedCustomer)getCustomer(customer).then(setSelectedCustomer).catch(()=>{});},[customer,selectedCustomer]);
 const vat=settings.data?.defaultVatPercent??5;
 const calc=useMemo(()=>{const calculated=items.map(i=>{const gross=i.quantity*i.rate;const d=i.discountType==='percentage'?gross*Math.min(i.discountValue,100)/100:Math.min(i.discountValue,gross);return Math.max(0,gross-d)});const subtotal=calculated.reduce((a,b)=>a+b,0);const vatAmount=subtotal*vat/100;return{calculated,subtotal,vatAmount,grand:subtotal+vatAmount}},[items,vat]);
 const mut=useMutation({mutationFn:(p:InvoicePayload)=>id?updateInvoice(id,p):createInvoice(p),onSuccess:()=>nav('/customers/invoices'),onError:(e:any)=>{setServerError(e.response?.data?.message||'Unable to save invoice');scrollToFirstError();}});
 const validate=()=>{const e:Errors={}; if(!customer)e.customer='Select a customer'; if(invoiceNumber.trim().length<3)e.invoiceNumber='Invoice number is required'; if(!invoiceDate)e.invoiceDate='Invoice date is required'; if(!dueDate)e.dueDate='Due date is required'; if(salesPerson.trim().length<2)e.salesPerson='Sales person is required'; if(subject.trim().length<2)e.subject='Subject is required'; items.forEach((i,idx)=>{if(i.itemName.trim().length<2)e[`items.${idx}.itemName`]='Item name is required';if(!(i.quantity>0))e[`items.${idx}.quantity`]='Quantity must be greater than zero';if(i.rate<0||Number.isNaN(i.rate))e[`items.${idx}.rate`]='Rate cannot be negative';if(i.discountValue<0)e[`items.${idx}.discountValue`]='Discount cannot be negative';if(i.discountType==='percentage'&&i.discountValue>100)e[`items.${idx}.discountValue`]='Percentage cannot exceed 100%';}); setErrors(e); if(Object.keys(e).length){scrollToFirstError();return false;}return true;};
 const submit=()=>{setServerError('');if(!validate())return;mut.mutate({customer,invoiceNumber:invoiceNumber.trim(),orderNumber:orderNumber.trim()||undefined,invoiceDate,terms,dueDate,salesPerson:salesPerson.trim(),subject:subject.trim(),items});};
 const updateRow=(idx:number,key:keyof Row,value:any)=>{setItems(v=>v.map((x,i)=>i===idx?{...x,[key]:value}:x));setErrors(e=>{const n={...e};delete n[`items.${idx}.${String(key)}`];return n;});};
 return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-heading">{id?'Edit Invoice':'Create Invoice'}</h1><p className="text-sm text-subtle">Search customers on demand; only a small paginated result set is loaded while you type.</p></div>
 <div className="grid gap-5 rounded-2xl border border-line bg-surface p-6 shadow-panel md:grid-cols-2 xl:grid-cols-3">
  <CustomerPicker required value={customer} error={errors.customer} onChange={(cid,c)=>{setCustomer(cid);setSelectedCustomer(c);setErrors(e=>({...e,customer:''}));}}/>
  <FormField id="invoiceNumber" required label="Invoice number" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} error={errors.invoiceNumber}/>
  <FormField id="orderNumber" label="Order number" value={orderNumber} onChange={e=>setOrderNumber(e.target.value)}/>
  <FormField id="invoiceDate" required type="date" label="Invoice date" value={invoiceDate} onChange={e=>setInvoiceDate(e.target.value)} error={errors.invoiceDate}/>
  <div><Label required>Terms</Label><Select value={terms} onChange={e=>setTerms(e.target.value)}>{TERM_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></div>
  <FormField id="dueDate" required type="date" label="Due date" value={dueDate} onChange={e=>setDueDate(e.target.value)} error={errors.dueDate}/>
  <FormField id="salesPerson" required label="Sales person" value={salesPerson} onChange={e=>setSalesPerson(e.target.value)} error={errors.salesPerson}/>
  <FormField id="subject" required label="Subject" value={subject} onChange={e=>setSubject(e.target.value)} error={errors.subject} className="xl:col-span-2"/>
  <div><Label>Customer VAT</Label><div className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-heading">{selectedCustomer?.vatNumber||'Not provided'}</div></div>
  <div><Label>Company VAT</Label><div className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-heading">{settings.data?.companyVatNumber||'Not configured'}</div></div>
  <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-line bg-muted/40 p-4"><p className="mb-3 text-sm font-semibold text-heading">Vendor account details</p><div className="grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-subtle">Bank name</p><p className="font-medium text-heading">{settings.data?.companyBankName||'Not configured'}</p></div><div><p className="text-xs text-subtle">Account number</p><p className="font-medium text-heading">{settings.data?.companyBankAccountNumber||'Not configured'}</p></div><div><p className="text-xs text-subtle">Branch</p><p className="font-medium text-heading">{settings.data?.companyBankBranch||'Not configured'}</p></div></div></div>
 </div>
 <div className="rounded-2xl border border-line bg-surface p-6 shadow-panel"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-heading">Invoice items</h2><p className="text-xs text-subtle">Discount is applied before VAT.</p></div><Button size="sm" variant="secondary" onClick={()=>setItems(v=>[...v,row()])}><Plus className="h-3.5 w-3.5"/>Add row</Button></div>
 <div className="space-y-3">{items.map((i,idx)=><div key={idx} className="rounded-xl border border-line bg-muted/30 p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_.7fr_1fr_1fr_1fr_auto]">
   <div><Label required>Item name</Label><Input hasError={!!errors[`items.${idx}.itemName`]} value={i.itemName} onChange={e=>updateRow(idx,'itemName',e.target.value)}/><ErrorText>{errors[`items.${idx}.itemName`]}</ErrorText></div>
   <div><Label required>Quantity</Label><Input hasError={!!errors[`items.${idx}.quantity`]} type="number" min="0.0001" step="0.01" value={i.quantity} onChange={e=>updateRow(idx,'quantity',Number(e.target.value))}/><ErrorText>{errors[`items.${idx}.quantity`]}</ErrorText></div>
   <div><Label required>Rate</Label><Input hasError={!!errors[`items.${idx}.rate`]} type="number" min="0" step="0.001" value={i.rate} onChange={e=>updateRow(idx,'rate',Number(e.target.value))}/><ErrorText>{errors[`items.${idx}.rate`]}</ErrorText></div>
   <div><Label>Discount type</Label><Select value={i.discountType} onChange={e=>updateRow(idx,'discountType',e.target.value)}><option value="percentage">Percentage %</option><option value="amount">Fixed amount</option></Select></div>
   <div><Label>Discount</Label><Input hasError={!!errors[`items.${idx}.discountValue`]} type="number" min="0" step="0.001" value={i.discountValue} onChange={e=>updateRow(idx,'discountValue',Number(e.target.value))}/><ErrorText>{errors[`items.${idx}.discountValue`]}</ErrorText></div>
   <div className="flex items-end gap-2"><div className="min-w-[110px] rounded-lg bg-surface px-3 py-2 text-right text-sm font-semibold text-heading">{calc.calculated[idx].toFixed(3)}</div><button type="button" disabled={items.length===1} onClick={()=>setItems(v=>v.filter((_,x)=>x!==idx))} className="mb-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div>
  </div></div>)}</div>
 <div className="ml-auto mt-6 max-w-sm space-y-2 rounded-xl bg-muted p-4 text-sm"><div className="flex justify-between font-semibold text-heading"><span>Subtotal</span><strong>{calc.subtotal.toFixed(3)}</strong></div><div className="flex justify-between"><span>VAT ({vat}%)</span><strong>{calc.vatAmount.toFixed(3)}</strong></div><div className="flex justify-between border-t border-line pt-2 text-base font-bold text-heading"><span>Grand Total</span><strong>{calc.grand.toFixed(3)} {selectedCustomer?.currency||settings.data?.defaultCurrency||'OMR'}</strong></div></div></div>
 {serverError&&<p data-field-error="true" className="text-sm text-red-600">{serverError}</p>}<div className="flex gap-2"><Button onClick={submit} isLoading={mut.isPending}>{id?'Save draft':'Create draft invoice'}</Button><Button variant="secondary" onClick={()=>nav('/customers/invoices')}>Cancel</Button></div></div>;
}
