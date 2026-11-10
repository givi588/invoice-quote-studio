/**
 * Local-only estimate calculator. Money is held in integer cents / tetri;
 * tax and discount percentages are held in integer basis points.
 */
export const STORAGE_KEY = 'invoice-quote-studio-v1';
export const SUPPORTED_CURRENCIES = ['USD','EUR','GBP','GEL'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];
export type DocumentType = 'quote' | 'invoice';

export interface PartyDetails {
  name: string;
  email: string;
  address: string;
}
export interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}
export interface InvoiceDraft {
  version: 1;
  isDemo: boolean;
  type: DocumentType;
  reference: string;
  issuedOn: string;
  dueOn: string;
  currency: Currency;
  from: PartyDetails;
  to: PartyDetails;
  items: LineItem[];
  discount: string;
  tax: string;
  notes: string;
  terms: string;
}
export interface CalculatedLine {
  id: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
export interface Totals {
  lines: CalculatedLine[];
  subtotal: number;
  discountAmount: number;
  taxable: number;
  taxAmount: number;
  total: number;
}
export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
export const MAX_ITEMS = 40;
const MAX_PRICE_MINOR = 100_000_000;
const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function localISODate(date: Date = new Date()): string{
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
export function plusDays(iso: string, days: number): string{
  const [y,m,d]=iso.split('-').map(Number);
  return localISODate(new Date(y,m-1,d+days,12));
}
const isObject = (value: unknown): value is Record<string, unknown> => value!==null && typeof value==='object' && !Array.isArray(value);
function text(value: unknown, name: string, limit = 600): string{
  if(typeof value!=='string'||value.length>limit)throw new Error('Invalid '+name);
  return value;
}
function party(info: unknown, name: string): PartyDetails{
  if(!isObject(info))throw new Error('Invalid '+name);
  return {name:text(info.name,name+' name',120),email:text(info.email,name+' email',180),address:text(info.address,name+' address',360)};
}
export function parseMoney(input: string): number{
  if(typeof input!=='string'||!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(input.trim()))throw new Error('Price must be 0 to 1,000,000, with at most two decimals');
  const [whole,fraction='']=input.trim().split('.');
  const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(minor)||minor>MAX_PRICE_MINOR)throw new Error('Price exceeds limit');
  return minor;
}
export function parseQuantity(input: string): number{
  if(typeof input!=='string'||!/^[1-9]\d{0,3}$/.test(input.trim()))throw new Error('Quantity must be 1 to 9999');
  const quantity=Number(input);
  if(quantity>9999)throw new Error('Quantity exceeds limit');
  return quantity;
}
export function parseRate(input: string): number{
  if(typeof input!=='string'||!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(input.trim()))throw new Error('Percentage must be 0-100 with two decimals at most');
  const [whole,fraction='']=input.trim().split('.');
  const basis=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(basis>10000)throw new Error('Percentage exceeds 100');
  return basis;
}
export function formatMoney(minor: number, currency: Currency = 'USD'): string{
  if(!isCurrency(currency)||!Number.isSafeInteger(minor))throw new Error('Invalid money format');
  return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(minor/100);
}
function rateOf(amount: number, basis: number): number{
  return Number((BigInt(amount)*BigInt(basis)+5000n)/10000n);
}
export function calculateTotals(doc: InvoiceDraft): Totals{
  if(!isObject(doc)||!Array.isArray(doc.items)||doc.items.length<1||doc.items.length>MAX_ITEMS)throw new Error('Invalid items');
  if(!isCurrency(doc.currency))throw new Error('Invalid currency');
  let subtotal=0;
  const lines=doc.items.map(item=>{
    const quantity=parseQuantity(item.quantity),unitPrice=parseMoney(item.unitPrice);
    const amount=quantity*unitPrice;
    subtotal+=amount;
    return {id:item.id,quantity,unitPrice,amount};
  });
  if(!Number.isSafeInteger(subtotal))throw new Error('Document total too large');
  const discountAmount=rateOf(subtotal,parseRate(doc.discount));
  const taxable=subtotal-discountAmount;
  const taxAmount=rateOf(taxable,parseRate(doc.tax));
  const total=taxable+taxAmount;
  if(![discountAmount,taxable,taxAmount,total].every(Number.isSafeInteger))throw new Error('Document total too large');
  return {lines,subtotal,discountAmount,taxable,taxAmount,total};
}
export function createBlankDocument(now: Date = new Date()): InvoiceDraft{
  const date=localISODate(now);
  return {
    version:1,isDemo:false,type:'quote',reference:'Q-'+date.slice(0,4)+'-001',
    issuedOn:date,dueOn:plusDays(date,14),currency:'USD',
    from:{name:'',email:'',address:''},to:{name:'',email:'',address:''},
    items:[{id:'item-1',description:'',quantity:'1',unitPrice:'0.00'}],
    discount:'0',tax:'0',notes:'',terms:''
  };
}
export function createExampleDocument(now: Date = new Date()): InvoiceDraft{
  const date=localISODate(now);
  return {...createBlankDocument(now),isDemo:true,reference:'DEMO-Q-'+date.slice(0,4)+'-001',
    from:{name:'Example Creative Studio',email:'hello@example.com',address:'Sample address\nYour city'},
    to:{name:'Sample Client',email:'client@example.com',address:'Client city'},
    items:[
      {id:'item-1',description:'Landing page design & build',quantity:'1',unitPrice:'480.00'},
      {id:'item-2',description:'Website content updates',quantity:'2',unitPrice:'65.00'}
    ],discount:'5',tax:'0',
    notes:'Demo document. Replace sample details before sharing.',
    terms:'Example only. No payment is due for this sample.'
  };
}
export function normalizeDraft(data: unknown): InvoiceDraft{
  if(!isObject(data)||data.version!==1)throw new Error('Unsupported backup format');
  const type = data.type;
  if(type!=='quote' && type!=='invoice')throw new Error('Unsupported document type');
  const currency = data.currency;
  if(!isCurrency(currency))throw new Error('Unsupported currency');
  if(typeof data.isDemo!=='boolean')throw new Error('Invalid sample flag');
  if(!Array.isArray(data.items)||data.items.length<1||data.items.length>MAX_ITEMS)throw new Error('Invalid line item count');
  const ids=new Set();
  const items=data.items.map(item=>{
    if(!isObject(item))throw new Error('Invalid line item');
    const id=text(item.id,'line ID',80);
    if(!id||ids.has(id))throw new Error('Duplicate or missing ID');
    ids.add(id);
    return {id,description:text(item.description,'description',240),quantity:text(item.quantity,'quantity',20),unitPrice:text(item.unitPrice,'price',30)};
  });
  const issuedOn=text(data.issuedOn,'issue date',10),dueOn=text(data.dueOn,'due date',10);
  if((issuedOn&&!VALID_DATE.test(issuedOn))||(dueOn&&!VALID_DATE.test(dueOn)))throw new Error('Invalid date format');
  return {
    version:1,isDemo:data.isDemo,type,reference:text(data.reference,'reference',80),
    issuedOn,dueOn,currency,from:party(data.from,'sender'),to:party(data.to,'recipient'),
    items,discount:text(data.discount,'discount',15),tax:text(data.tax,'tax',15),
    notes:text(data.notes,'notes',1300),terms:text(data.terms,'terms',1300)
  };
}
function realDate(value: string): boolean{
  if(!VALID_DATE.test(value))return false;
  const [y,m,d]=value.split('-').map(Number),dt=new Date(y,m-1,d,12);
  return dt.getFullYear()===y&&dt.getMonth()+1===m&&dt.getDate()===d;
}
export function documentIssues(doc: InvoiceDraft): string[]{
  const issues=[];
  if(!doc.reference.trim())issues.push('Add a document number.');
  if(!doc.from.name.trim())issues.push('Add your business or sender name.');
  if(!doc.to.name.trim())issues.push('Add a client name.');
  if(!realDate(doc.issuedOn))issues.push('Choose a valid issue date.');
  if(!realDate(doc.dueOn))issues.push('Choose a valid end date.');
  if(realDate(doc.issuedOn)&&realDate(doc.dueOn)&&doc.dueOn<doc.issuedOn)issues.push('End date must not precede issue date.');
  doc.items.forEach((item,i)=>{
    if(!item.description.trim())issues.push('Give item '+(i+1)+' a description.');
    try{parseQuantity(item.quantity);}catch{issues.push('Check item '+(i+1)+' quantity.');}
    try{parseMoney(item.unitPrice);}catch{issues.push('Check item '+(i+1)+' price.');}
  });
  try{parseRate(doc.discount);}catch{issues.push('Discount must be between 0 and 100%.');}
  try{parseRate(doc.tax);}catch{issues.push('Tax must be between 0 and 100%.');}
  return issues;
}
export function safeFileName(doc: InvoiceDraft): string{
  const kind=doc.type==='invoice'?'invoice':'quote';
  const ref=doc.reference.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,50).replace(/^-+|-+$/g,'')||'draft';
  return kind+'-'+ref;
}
