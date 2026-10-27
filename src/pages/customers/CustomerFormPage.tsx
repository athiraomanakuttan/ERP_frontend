import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { Select } from '@/components/atoms/Select';
import { Label } from '@/components/atoms/Label';
import { createCustomer,getCustomer,updateCustomer,CustomerPayload } from '@/features/customers/customerService';
import { CURRENCY_CODES } from '@/features/customers/financeConstants';
import { customerFormSchema } from '@/features/customers/customer.schema';
import { getAdminSettings } from '@/features/settings/settingsService';
import { scrollToFirstError,zodFieldErrors } from '@/utils/validation';

const empty:CustomerPayload={customerType:'business',primaryContactName:'',contactNumber:'',companyName:'',email:'',vatNumber:'',currency:'OMR'};
export function CustomerFormPage(){ const {id}=useParams(); const nav=useNavigate(); const settings=useQuery({queryKey:['app-settings'],queryFn:getAdminSettings}); const [form,setForm]=useState<CustomerPayload>(empty); const [errors,setErrors]=useState<Record<string,string>>({});
 const existing=useQuery({queryKey:['customer',id],queryFn:()=>getCustomer(id!),enabled:!!id});
 useEffect(()=>{if(!id&&settings.data?.defaultCurrency)setForm(f=>({...f,currency:settings.data!.defaultCurrency}));},[id,settings.data]);
 useEffect(()=>{if(existing.data)setForm({...existing.data,companyName:existing.data.companyName||'',vatNumber:existing.data.vatNumber||''});},[existing.data]);
 const mut=useMutation({mutationFn:(p:CustomerPayload)=>id?updateCustomer(id,p):createCustomer(p),onSuccess:()=>nav('/customers')});
 const set=(k:keyof CustomerPayload,v:any)=>setForm(f=>({...f,[k]:v}));
 const submit=()=>{const r=customerFormSchema.safeParse(form);if(!r.success){setErrors(zodFieldErrors(r.error));scrollToFirstError();return;}setErrors({});mut.mutate(r.data as CustomerPayload);};
 return <div className="max-w-3xl space-y-6"><div><h1 className="text-2xl font-bold text-heading">{id?'Edit Customer':'Add Customer'}</h1><p className="text-sm text-subtle">Customer details used in invoices and payments.</p></div><div className="grid gap-5 rounded-2xl border border-line bg-surface p-6 shadow-panel md:grid-cols-2">
  <div><Label required>Customer type</Label><Select value={form.customerType} onChange={e=>set('customerType',e.target.value)}><option value="individual">Individual</option><option value="business">Business</option></Select></div>
  <FormField id="primaryContactName" label="Primary contact person" required value={form.primaryContactName} onChange={e=>set('primaryContactName',e.target.value)} error={errors.primaryContactName}/>
  <FormField id="contactNumber" label="Contact number" required value={form.contactNumber} onChange={e=>set('contactNumber',e.target.value)} error={errors.contactNumber}/>
  <FormField id="companyName" label="Company name" required={form.customerType==='business'} value={form.companyName||''} onChange={e=>set('companyName',e.target.value)} error={errors.companyName}/>
  <FormField id="email" type="email" label="Email ID" required value={form.email} onChange={e=>set('email',e.target.value)} error={errors.email}/>
  <FormField id="vatNumber" label="VAT number" required value={form.vatNumber||''} onChange={e=>set('vatNumber',e.target.value)} error={errors.vatNumber}/>
  <div><Label required>Currency</Label><Select value={form.currency} onChange={e=>set('currency',e.target.value)}>{CURRENCY_CODES.map(c=><option key={c} value={c}>{c}{c==='OMR'?' — Omani Rial':''}</option>)}</Select></div>
 </div><div className="flex gap-2"><Button onClick={submit} isLoading={mut.isPending}>{id?'Save changes':'Create customer'}</Button><Button variant="secondary" onClick={()=>nav('/customers')}>Cancel</Button></div>{mut.isError&&<p className="text-sm text-red-600">{(mut.error as any)?.response?.data?.message||'Unable to save customer'}</p>}</div>;
}
