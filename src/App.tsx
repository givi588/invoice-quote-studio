import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_ITEMS, SUPPORTED_CURRENCIES, calculateTotals, createBlankDocument,
  createExampleDocument, documentIssues, formatMoney, normalizeDraft,
  parseMoney, safeFileName
} from './lib/invoice.ts';
import { loadSavedDraft, removeSavedDraft, saveDraft, type DraftLoadResult } from './lib/storage.ts';
import { isCurrency, type InvoiceDraft, type PartyDetails, type Totals } from './lib/invoice.ts';

function readInitial(): DraftLoadResult {
  if(typeof window==='undefined')return {document:createExampleDocument(),blocked:false,message:''};
  try{return loadSavedDraft(window.localStorage);}
  catch{return {document:createExampleDocument(),blocked:true,message:'Browser storage unavailable. Automatic saving is disabled.'};}
}
function Arrow(){return <span aria-hidden="true">↗</span>;}
interface FieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
  required?: boolean;
}
function Field({label,id,value,onChange,placeholder='',type='text',inputMode,maxLength=200,required=false}: FieldProps){
  return <div className="field"><label htmlFor={id}>{label}{required&&<span className="required"> *</span>}</label><input id={id} name={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={inputMode} maxLength={maxLength}/></div>;
}
interface AreaProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}
function Area({label,id,value,onChange,placeholder='',rows=2,maxLength=1300}: AreaProps){
  return <div className="field"><label htmlFor={id}>{label}</label><textarea id={id} name={id} value={value} onChange={e=>onChange(e.target.value)} rows={rows} maxLength={maxLength} placeholder={placeholder}/></div>;
}
function SectionHeading({number,title,description}: {number: string; title: string; description?: string}){
  return <div className="section-head"><span className="section-count">{number}</span><div><h3>{title}</h3>{description&&<p>{description}</p>}</div></div>;
}
function Party({data}: {data: PartyDetails}){
  return <div className="party-details"><strong>{data.name||'—'}</strong>{data.email&&<span>{data.email}</span>}{data.address&&<span className="pre-line">{data.address}</span>}</div>;
}
function DateLabel({iso}: {iso: string}){
  if(!iso)return '—';
  const d=new Date(iso+'T12:00:00');
  return Number.isNaN(d.getTime())?iso:new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric'}).format(d);
}
function Preview({draft,totals}: {draft: InvoiceDraft; totals: Totals | null}){
  const currency=draft.currency;
  const money=(n: number)=>formatMoney(n,currency);
  return <article className="paper" id="print-area" aria-label="Live document preview">
    <div className="paper-header">
      <div className="paper-logo"><span>IS.</span><small>INVOICE STUDIO</small></div>
      <div className="paper-document-title"><h2>{draft.type==='invoice'?'INVOICE':'PRICE QUOTE'}</h2><p>#{draft.reference||'—'}</p></div>
    </div>
    {draft.isDemo&&<div className="sample-banner"><strong>SAMPLE DOCUMENT</strong> — demonstration only; no payment is due.</div>}
    <div className="paper-parties">
      <section><h3>FROM</h3><Party data={draft.from}/></section>
      <section><h3>BILL TO</h3><Party data={draft.to}/></section>
    </div>
    <div className="paper-meta">
      <div><span>Issue date</span><strong><DateLabel iso={draft.issuedOn}/></strong></div>
      <div><span>{draft.type==='quote'?'Valid until':'Due date'}</span><strong><DateLabel iso={draft.dueOn}/></strong></div>
      <div><span>Currency</span><strong>{currency}</strong></div>
    </div>
    <div className="paper-items"><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{draft.items.map((item,i)=>
      <tr key={item.id}><td>{item.description||<span className="muted">Add a description</span>}</td><td>{item.quantity||'—'}</td><td>{(()=>{try{return money(parseMoney(item.unitPrice));}catch{return '—';}})()}</td><td>{totals?money(totals.lines[i].amount):'—'}</td></tr>
    )}</tbody></table></div>
    <div className="paper-total-box">
      <div><span>Subtotal</span><strong>{totals?money(totals.subtotal):'—'}</strong></div>
      <div><span>Discount ({draft.discount||'0'}%)</span><strong>{totals?'−'+money(totals.discountAmount):'—'}</strong></div>
      <div><span>Tax ({draft.tax||'0'}%)</span><strong>{totals?money(totals.taxAmount):'—'}</strong></div>
      <div className="paper-final"><span>Grand total</span><strong>{totals?money(totals.total):'—'}</strong></div>
    </div>
    {(draft.notes||draft.terms)&&<div className="paper-notes">
      {draft.notes&&<section><h3>NOTES</h3><p className="pre-line">{draft.notes}</p></section>}
      {draft.terms&&<section><h3>TERMS</h3><p className="pre-line">{draft.terms}</p></section>}
    </div>}
    <div className="paper-footer"><span>Prepared with Invoice &amp; Quote Studio</span><span>{draft.type==='invoice'?'Invoice':'Quote'} · {currency}</span></div>
  </article>;
}

export default function App(){
  const [initial]=useState<DraftLoadResult>(readInitial);
  const [draft,setDraft]=useState<InvoiceDraft>(initial.document);
  const [blocked,setBlocked]=useState(initial.blocked);
  const [status,setStatus]=useState(initial.message||'Changes save automatically in this browser.');
  const [importing,setImporting]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const issues=useMemo(()=>documentIssues(draft),[draft]);
  const totals=useMemo(()=>{try{return calculateTotals(draft);}catch{return null;}},[draft]);
  const money=(n: number)=>formatMoney(n,draft.currency);

  useEffect(()=>{
    if(blocked||typeof window==='undefined')return;
    try{saveDraft(window.localStorage,draft);setStatus('Draft saved in this browser.');}
    catch{setStatus('Could not save automatically. Download a JSON backup to keep a copy.');}
  },[draft,blocked]);

  type SimpleField = 'type' | 'currency' | 'reference' | 'issuedOn' | 'dueOn' | 'discount' | 'tax' | 'notes' | 'terms';
  const update=<K extends SimpleField>(key: K, value: InvoiceDraft[K])=>setDraft(current=>({...current,[key]:value}));
  const updateParty=(side: 'from' | 'to', key: keyof PartyDetails, value: string)=>setDraft(current=>({...current,[side]:{...current[side],[key]:value}}));
  const updateItem=(id: string, key: 'description' | 'quantity' | 'unitPrice', value: string)=>setDraft(current=>({...current,items:current.items.map(item=>item.id===id?{...item,[key]:value}:item)}));
  const addItem=()=>{
    setDraft(current=>{
      if(current.items.length>=MAX_ITEMS)return current;
      const id='item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
      return {...current,items:[...current.items,{id,description:'',quantity:'1',unitPrice:'0.00'}]};
    });
  };
  const removeItem=(id: string)=>setDraft(current=>current.items.length<=1?current:{...current,items:current.items.filter(item=>item.id!==id)});
  const replaceDocument=(kind: 'blank' | 'sample')=>{
    if(blocked){setStatus('Resolve unreadable saved data before replacing the draft.');return;}
    if(!window.confirm('Replace your current draft? Download a JSON backup first if you need it.'))return;
    setDraft(kind==='sample'?createExampleDocument():createBlankDocument());
  };
  const discardUnreadable=()=>{
    if(!window.confirm('Discard unreadable saved draft? This action cannot be undone.'))return;
    try{removeSavedDraft(window.localStorage);setBlocked(false);setStatus('Unreadable data discarded. Automatic saving can resume.');}
    catch{setStatus('Could not remove saved draft. Check browser permissions.');}
  };
  const exportJSON=()=>{
    try{
      const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=safeFileName(draft)+'.json';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setStatus('JSON backup downloaded. Keep it somewhere safe.');
    }catch{setStatus('Could not download the backup.');}
  };
  const importJSON=async (event: React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(blocked){setStatus('Resolve unreadable saved data before importing.');return;}
    if(file.size>150000){setStatus('Backup must be smaller than 150 KB.');return;}
    setImporting(true);
    try{
      const imported=normalizeDraft(JSON.parse(await file.text()));
      if(!window.confirm('Replace your current draft with the imported backup?'))return;
      setDraft(imported);setStatus('Backup imported successfully.');
    }catch{setStatus('Invalid or unsupported backup. Existing draft was not replaced.');}
    finally{setImporting(false);}
  };
  const printDocument=()=>{
    if(issues.length){setStatus('Fix all issues listed above the preview before printing.');return;}
    window.print();
  };

  return <div className="application">
    <header className="topbar no-print"><div className="shell header-layout"><a className="brand" href="#top"><span className="brand-symbol">IS.</span><span>Invoice <i>&</i> Quote<small>STUDIO</small></span></a><nav aria-label="Secondary links"><a href="https://github.com/givi588/invoice-quote-studio" target="_blank" rel="noopener noreferrer">Source code <Arrow/></a><a href="https://givi588.github.io/givi-portfolio/" target="_blank" rel="noopener noreferrer">Portfolio <Arrow/></a></nav></div></header>
    <main className="shell" id="top">
      <section className="hero no-print"><div><div className="eyebrow"><span className="eyebrow-dot"/> LOCAL-FIRST DOCUMENT STUDIO</div><h1>Beautiful documents.<br/><em>Built in minutes.</em></h1><p>Create professional-looking quotes and invoices in your browser, with accurate totals and a clean print-ready layout. No account needed.</p></div><div className="hero-pill"><span>100% BROWSER-BASED</span><strong>Your workspace.<br/>Your data.</strong></div></section>
      <section className="workspace" aria-label="Document workspace">
        <div className="workspace-heading no-print"><div><span>DOCUMENT WORKSPACE</span><h2>Make it yours</h2></div><div className="workspace-badge"><span className="online-dot"/> Local-first by design</div></div>
        <div className="workspace-grid">
          <div className="editor no-print">
            <div className="editor-header"><h2>Document editor</h2><p>Fill in the details. The preview updates as you type.</p></div>
            {blocked&&<div className="warning-block" role="alert"><strong>Saved draft cannot be read.</strong><p>The existing data has NOT been overwritten. Export a copy through browser developer tools before discarding if needed.</p><button className="small-button danger" onClick={discardUnreadable}>Discard unreadable draft</button></div>}
            <div className="editor-section">
              <SectionHeading number="01" title="Document setup" description="Choose an invoice or a price estimate."/>
              <div className="type-switch" role="group" aria-label="Document type">
                <button className={draft.type==='quote'?'selected':''} type="button" aria-pressed={draft.type==='quote'} onClick={()=>update('type','quote')}>Quote / Estimate</button>
                <button className={draft.type==='invoice'?'selected':''} type="button" aria-pressed={draft.type==='invoice'} onClick={()=>update('type','invoice')}>Invoice</button>
              </div>
              <div className="two-cols">
                <Field label="Document number" id="reference" value={draft.reference} onChange={v=>update('reference',v)} required maxLength={80}/>
                <div className="field"><label htmlFor="currency">Currency</label><select id="currency" value={draft.currency} onChange={e=>{if(isCurrency(e.target.value))update('currency',e.target.value);}}>{SUPPORTED_CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <Field label="Issue date" id="issuedOn" value={draft.issuedOn} onChange={v=>update('issuedOn',v)} type="date" required/>
                <Field label={draft.type==='quote'?'Valid until':'Due date'} id="dueOn" value={draft.dueOn} onChange={v=>update('dueOn',v)} type="date" required/>
              </div>
            </div>
            <div className="editor-section">
              <SectionHeading number="02" title="Business details" description="Who is sending this document?"/>
              <Field label="Business / sender name" id="senderName" value={draft.from.name} onChange={v=>updateParty('from','name',v)} placeholder="Your business name" required maxLength={120}/>
              <Field label="Email (optional)" id="senderEmail" value={draft.from.email} onChange={v=>updateParty('from','email',v)} placeholder="hello@example.com" maxLength={180}/>
              <Area label="Address (optional)" id="senderAddress" value={draft.from.address} onChange={v=>updateParty('from','address',v)} maxLength={360}/>
            </div>
            <div className="editor-section">
              <SectionHeading number="03" title="Client details" description="Who will receive it?"/>
              <Field label="Client name" id="clientName" value={draft.to.name} onChange={v=>updateParty('to','name',v)} placeholder="Client or company" required maxLength={120}/>
              <Field label="Email (optional)" id="clientEmail" value={draft.to.email} onChange={v=>updateParty('to','email',v)} maxLength={180}/>
              <Area label="Address (optional)" id="clientAddress" value={draft.to.address} onChange={v=>updateParty('to','address',v)} maxLength={360}/>
            </div>
            <div className="editor-section">
              <SectionHeading number="04" title="Items & services" description="Add quantities and unit prices. Up to 40 rows."/>
              <div className="line-list">{draft.items.map((item,i)=><div className="line-editor" key={item.id}>
                <div className="line-editor-heading"><strong>Item {i+1}</strong><button className="delete-button" type="button" disabled={draft.items.length===1} onClick={()=>removeItem(item.id)} aria-label={'Remove item '+(i+1)}>Remove ×</button></div>
                <Field label="Description" id={'desc-'+item.id} value={item.description} onChange={v=>updateItem(item.id,'description',v)} placeholder="Service or product" maxLength={240}/>
                <div className="two-cols"><Field label="Quantity" id={'qty-'+item.id} value={item.quantity} onChange={v=>updateItem(item.id,'quantity',v)} inputMode="numeric" maxLength={20}/><Field label={'Unit price ('+draft.currency+')'} id={'price-'+item.id} value={item.unitPrice} onChange={v=>updateItem(item.id,'unitPrice',v)} inputMode="decimal" maxLength={30}/></div>
              </div>)}</div>
              <button className="add-button" type="button" disabled={draft.items.length>=MAX_ITEMS} onClick={addItem}>+ Add line item</button>
              <div className="two-cols after-items"><Field label="Discount (%)" id="discount" value={draft.discount} onChange={v=>update('discount',v)} inputMode="decimal" maxLength={15}/><Field label="Tax (%)" id="tax" value={draft.tax} onChange={v=>update('tax',v)} inputMode="decimal" maxLength={15}/></div>
              <p className="field-note">Discount is applied before the manually entered tax rate. This is not tax advice.</p>
            </div>
            <div className="editor-section">
              <SectionHeading number="05" title="Finishing touches" description="Optional text shown at the bottom of the document."/>
              <Area label="Notes" id="notes" value={draft.notes} onChange={v=>update('notes',v)} rows={3}/>
              <Area label="Terms" id="terms" value={draft.terms} onChange={v=>update('terms',v)} rows={3}/>
            </div>
            <div className="editor-bottom">
              <button className="small-button" type="button" onClick={()=>replaceDocument('blank')}>+ New blank document</button>
              <button className="small-button subtle" type="button" onClick={()=>replaceDocument('sample')}>Load sample</button>
              <button className="small-button subtle" type="button" onClick={exportJSON}>↓ Export JSON</button>
              <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importJSON} aria-label="Choose JSON backup"/>
              <button className="small-button subtle" type="button" disabled={importing} onClick={()=>fileInput.current?.click()}>{importing?'Importing…':'↑ Import JSON'}</button>
            </div>
          </div>
          <div className="preview-column">
            <div className="preview-toolbar no-print"><div><h2>Live preview</h2><span>Your document updates automatically</span></div><span className="live-pill">LIVE</span></div>
            <div className="preview-background"><Preview draft={draft} totals={totals}/></div>
            <div className="preview-actions no-print">
              {issues.length>0&&<div className="validation" role="status"><strong>Before printing, please fix:</strong><ul>{issues.slice(0,7).map((msg,i)=><li key={i}>{msg}</li>)}{issues.length>7&&<li>…and {issues.length-7} more.</li>}</ul></div>}
              <div className="result-total"><span>Calculated total</span><strong>{totals?money(totals.total):'Check values'}</strong></div>
              <button className="print-button" type="button" onClick={printDocument}>Print / Save as PDF <Arrow/></button>
              <p className="print-help">Choose “Save as PDF” in your browser's print destination. PDF export is performed by your browser, not a server.</p>
              <p className="status" role="status" aria-live="polite">{status}</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="site-footer no-print"><strong>IS.</strong><p>Portfolio demonstration, not official accounting software. Do not store confidential client, payment, or banking data. Drafts are unencrypted in this browser.</p><a href="https://github.com/givi588" target="_blank" rel="noopener noreferrer">Built by Givi <Arrow/></a></footer>
    </main>
  </div>;
}
