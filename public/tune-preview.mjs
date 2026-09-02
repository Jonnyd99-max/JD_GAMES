import {PARTS,cleanTune,buyPart} from './tuning-data.mjs';
export const isVisualPart=category=>['wheels','paint','decal'].includes(category);
// A disposable display copy: previewing never changes the persisted garage.
export function previewPart(save,selection){
 if(!selection||selection.car!==save.selected||!isVisualPart(selection.cat))return null;
 const part=PARTS[selection.cat]?.find(p=>p.id===selection.id);
 if(!part||!save.owned.includes(selection.car))return null;
 const tune=cleanTune(save.tuning?.[selection.car]);
 const purchase=buyPart(save,selection.car,selection.cat,selection.id);
 return {part,canBuy:purchase.ok,error:purchase.error,
  save:{...save,tuning:{...save.tuning,[selection.car]:{...tune,[selection.cat]:selection.id}}}};
}

