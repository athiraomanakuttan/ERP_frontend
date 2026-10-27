export const CURRENCY_CODES = (() => {
  const preferred = ['OMR', 'USD', 'EUR', 'GBP', 'AED', 'INR', 'SAR', 'QAR', 'KWD', 'BHD'];
  const fallback = ['AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHF','CLP','CNY','COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SOS','SRD','SSP','STN','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XOF','XPF','YER','ZAR','ZMW','ZWL'];
  const supported = (Intl as any).supportedValuesOf?.('currency') as string[] | undefined;
  const source = supported?.length ? supported : fallback;
  return [...preferred, ...source.filter((code) => !preferred.includes(code))];
})();

export const TERM_OPTIONS = [
  ['due_on_receipt', 'Due on receipt'],
  ['due_end_of_month', 'Due end of the month'],
  ['net_15', 'Net 15'],
  ['net_45', 'Net 45'],
  ['net_60', 'Net 60'],
] as const;

export const PAYMENT_MODES = [
  ['cash', 'Cash'],
  ['bank_remittance', 'Bank remittance'],
  ['bank_transfer', 'Bank transfer'],
  ['cheque', 'Cheque'],
] as const;
