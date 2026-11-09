import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, SUPPORTED_CURRENCIES, MAX_ITEMS, parseMoney, parseRate,
  parseQuantity, calculateTotals, createBlankDocument, createExampleDocument,
  normalizeDraft, documentIssues, plusDays, localISODate, formatMoney, safeFileName
} from '../src/lib/invoice.js';
import { loadSavedDraft, saveDraft, removeSavedDraft } from '../src/lib/storage.js';

const base = () => createExampleDocument(new Date(2026, 0, 15, 12));
const memory = () => {
  const state=new Map();
  return {
    getItem:key=>state.has(key)?state.get(key):null,
    setItem:(key,value)=>state.set(key,value),
    removeItem:key=>state.delete(key),
    put:(key,val)=>state.set(key,val),
    has:key=>state.has(key),
  };
};

test('today helper returns local date in ISO format',()=>{
  assert.equal(localISODate(new Date(2026,0,15,12)),'2026-01-15');
});
test('date offset handles month changes',()=>{
  assert.equal(plusDays('2026-01-30',5),'2026-02-04');
});
test('minor units parse zero exactly',()=>assert.equal(parseMoney('0.00'),0));
test('decimal prices are represented as exact integers',()=>{
  assert.equal(parseMoney('19.99'),1999);
  assert.equal(parseMoney('0.1'),10);
  assert.equal(parseMoney('1000000'),100000000);
});
test('prices reject negative numbers and scientific notation',()=>{
  assert.throws(()=>parseMoney('-1'));
  assert.throws(()=>parseMoney('1e2'));
});
test('prices reject excess decimals and amounts',()=>{
  assert.throws(()=>parseMoney('1.999'));
  assert.throws(()=>parseMoney('1000000.01'));
});
test('quantity parser accepts only allowed whole numbers',()=>{
  assert.equal(parseQuantity('9999'),9999);
  assert.equal(parseQuantity('1'),1);
  assert.throws(()=>parseQuantity('0'));
  assert.throws(()=>parseQuantity('2.5'));
  assert.throws(()=>parseQuantity('10000'));
});
test('rates use basis points',()=>{
  assert.equal(parseRate('5.25'),525);
  assert.equal(parseRate('0'),0);
  assert.equal(parseRate('100'),10000);
});
test('rates reject excessive precision and values',()=>{
  assert.throws(()=>parseRate('100.01'));
  assert.throws(()=>parseRate('1.234'));
  assert.throws(()=>parseRate('-1'));
});
test('fixed-point totals apply discount before tax',()=>{
  const doc=base();
  doc.tax='10';
  const t=calculateTotals(doc);
  assert.equal(t.subtotal,61000);
  assert.equal(t.discountAmount,3050);
  assert.equal(t.taxable,57950);
  assert.equal(t.taxAmount,5795);
  assert.equal(t.total,63745);
});
test('rounding half a minor unit rounds up',()=>{
  const doc=base();
  doc.items=[{id:'a',description:'small',quantity:'1',unitPrice:'0.01'}];
  doc.discount='50';
  doc.tax='0';
  const t=calculateTotals(doc);
  assert.equal(t.discountAmount,1);
  assert.equal(t.total,0);
});
test('unsupported currency is rejected',()=>{
  const doc=base();
  doc.currency='XYZ';
  assert.throws(()=>calculateTotals(doc));
  assert.throws(()=>formatMoney(10,'XYZ'));
});
test('calculations limit items and unsafe amounts',()=>{
  const doc=base();
  doc.items=Array.from({length:MAX_ITEMS+1},(_,i)=>({id:String(i),quantity:'1',unitPrice:'1.00'}));
  assert.throws(()=>calculateTotals(doc));
  assert.throws(()=>calculateTotals({...doc,items:[{id:'x',quantity:'not a number',unitPrice:'10'}]}));
});
test('all supported currencies display a formatted value',()=>{
  for(const currency of SUPPORTED_CURRENCIES)assert.ok(formatMoney(1234,currency).includes('12'));
});
test('blank document starts with editable fields',()=>{
  const doc=createBlankDocument(new Date(2026,0,15,12));
  assert.equal(doc.type,'quote');
  assert.equal(doc.isDemo,false);
  assert.equal(doc.items.length,1);
  assert.equal(doc.dueOn,'2026-01-29');
});
test('sample document is identifiable and is not for payment',()=>{
  const doc=base();
  assert.equal(doc.isDemo,true);
  assert.match(doc.terms,/No payment/);
});
test('normalization preserves a complete v1 draft',()=>{
  const doc=base();
  assert.deepEqual(normalizeDraft(JSON.parse(JSON.stringify(doc))),doc);
});
test('normalization rejects unsupported and duplicated records',()=>{
  assert.throws(()=>normalizeDraft({...base(),version:9}));
  const doc=base();
  doc.items.push({...doc.items[0]});
  assert.throws(()=>normalizeDraft(doc));
});
test('validation catches incomplete fields',()=>{
  const doc=createBlankDocument(new Date(2026,0,15,12));
  assert.ok(documentIssues(doc).some(x=>x.includes('sender')));
  assert.ok(documentIssues(doc).some(x=>x.includes('client')));
  assert.ok(documentIssues(doc).some(x=>x.includes('item')));
});
test('filename strips unsafe characters',()=>{
  const doc=base();
  doc.reference='A/../test?*';
  assert.equal(safeFileName(doc),'quote-A-test');
});
test('draft persists to and reloads from localStorage',()=>{
  const storage=memory(),doc=base();
  saveDraft(storage,doc);
  assert.ok(storage.has(STORAGE_KEY));
  assert.deepEqual(loadSavedDraft(storage).document,doc);
});
test('invalid stored draft is protected from automatic overwrites',()=>{
  const storage=memory();
  storage.put(STORAGE_KEY,'{broken JSON');
  const read=loadSavedDraft(storage);
  assert.equal(read.blocked,true);
  assert.equal(storage.getItem(STORAGE_KEY),'{broken JSON');
  removeSavedDraft(storage);
  assert.equal(storage.getItem(STORAGE_KEY),null);
});
