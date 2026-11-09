import { STORAGE_KEY, createExampleDocument, normalizeDraft } from './invoice.js';

export function loadSavedDraft(storage){
  try{
    const raw=storage.getItem(STORAGE_KEY);
    if(raw===null)return {document:createExampleDocument(),blocked:false,message:''};
    return {document:normalizeDraft(JSON.parse(raw)),blocked:false,message:''};
  }catch{
    return {document:createExampleDocument(),blocked:true,message:'An existing saved draft could not be read. It has NOT been replaced. Export a copy using your browser tools before choosing to discard it.'};
  }
}
export function saveDraft(storage,document){
  storage.setItem(STORAGE_KEY,JSON.stringify(normalizeDraft(document)));
}
export function removeSavedDraft(storage){
  storage.removeItem(STORAGE_KEY);
}
