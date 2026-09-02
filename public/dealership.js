// Loaded alongside the existing game; leaves the static entry point and saved race stats intact.
const assetUrl=name=>{const url=new URL(name,import.meta.url);url.search=new URL(import.meta.url).search;return url.href};
const {CLASSES,CARS,STARTER_ID,SAVE_KEY,getCar,credits,normaliseSave,purchaseCar,selectCar,sellCar,resaleValue,awardRace,carArt}=await import(assetUrl('dealership-data.mjs'));
const {tunedCar}=await import(assetUrl('tuning-data.mjs'));
const {customizeCars}=await import(assetUrl('car-customizer.mjs'));
const {createTuneShop}=await import(assetUrl('tune-shop.js'));
const {createChampionship}=await import(assetUrl('championship.js'));
const {createHowToPlay}=await import(assetUrl('how-to-play.js'));
const {installGameAudio}=await import(assetUrl('game-audio.mjs'));
const {recordChampionshipWin}=await import(assetUrl('championship-data.mjs'));
const css=document.createElement('link');css.rel='stylesheet';css.href=assetUrl('dealership.css');document.head.appendChild(css);

let garageSave=normaliseSave(),storageError='',activeClass='starter',selectedId=STARTER_ID,garageId=STARTER_ID,mode='dealership';
let championship;
try{garageSave=normaliseSave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}catch{storageError='Saved garage could not be read. Purchases are paused to protect your save.'}
function freshSave(){
  if(storageError)return false;
  try{garageSave=normaliseSave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));return true}
  catch{storageError='Could not read your saved garage. Please reload before buying or selling.';return false}
}
function persist(next){
  if(storageError)return false;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));garageSave=next;applyCar();return true}
  catch{storageError='Your browser could not save this change. No credits or cars were changed.';return false}
}
function applyCar(){
  const car=tunedCar(getCar(garageSave.selected),garageSave.tuning?.[garageSave.selected]);
  document.getElementById('playerCar').innerHTML=carArt(car);
  document.getElementById('heroCar').innerHTML=carArt(car);
  document.getElementById('cpuCar').innerHTML=carArt(getCar(championship?.opponentId()||'starter-4'));
  for(const id of ['playerCar','heroCar'])customizeCars(document.getElementById(id),garageSave);
  document.dispatchEvent(new CustomEvent('jd:vehicle',{detail:{acceleration:car.acceleration,topSpeed:car.topSpeed,nitroSeconds:car.nitroSeconds}}));
  menuStatus.innerHTML=`<span>DRIVING <b>${car.name}</b></span><span><b>${credits(garageSave.credits)}</b> CR</span>`;
}
const menu=document.querySelector('#menu .menu');
const garageButton=[...menu.querySelectorAll('button')].find(b=>b.textContent.trim()==='GARAGE');
const dealerButton=document.createElement('button');dealerButton.id='dealership-menu';dealerButton.textContent='DEALERSHIP';garageButton.after(dealerButton);
const menuStatus=document.createElement('div');menuStatus.className='garage-menu-status';menu.before(menuStatus);
const panel=document.createElement('section');panel.id='dealership';panel.className='screen hide dealership-screen';
panel.innerHTML=`<header class="dealer-header"><button class="dealer-back" data-action="back">‹ MAIN MENU</button><span class="dealer-brand">JD <b>MOTORWORKS</b></span><div class="dealer-wallet"><span>YOUR CREDITS</span><strong id="dealer-balance"></strong></div></header>
  <div class="dealer-heading"><div><p class="dealer-eyebrow" id="dealer-eyebrow">THE SHOWROOM / 01</p><h1 id="dealer-title">Find your next drive.</h1></div><p id="dealer-intro"></p></div>
  <div id="dealer-alert" role="status" aria-live="polite"></div>
  <div class="dealer-body"><div class="dealer-stage"><div class="dealer-stage-label"><span id="dealer-class-label"></span><span id="dealer-count"></span></div><div class="dealer-car-art" id="dealer-car-art"></div><div class="dealer-floor"></div><div class="dealer-stage-footer"><span>JD CERTIFIED / RACE READY</span><span id="dealer-body-style"></span></div></div>
    <aside class="dealer-details"><p class="dealer-eyebrow" id="dealer-car-class"></p><h2 id="dealer-car-name"></h2><p class="dealer-description" id="dealer-description"></p><div id="dealer-specs" class="dealer-specs"></div><div class="dealer-price"><span id="dealer-price-label">PURCHASE PRICE</span><strong id="dealer-price"></strong></div><div class="dealer-actions" id="dealer-actions"></div><p class="dealer-purchase-note" id="dealer-purchase-note"></p></aside></div>
  <div class="dealer-stock-head"><h2 id="dealer-stock-title">CHOOSE YOUR CAR</h2><span id="dealer-stock-count"></span></div><div id="dealer-stock" class="dealer-stock"></div>
  <nav class="dealer-classes" aria-label="Car classes">${CLASSES.map((c,i)=>`<button data-class="${c.id}"><span>0${i+1}</span><b>${c.name}</b><small>5 CARS</small></button>`).join('')}</nav>
  <footer class="dealer-footnote">IN-GAME CREDITS ONLY · WIN RACES OR SELL CARS TO EARN · SAVED ON THIS DEVICE</footer>`;
document.body.appendChild(panel);
const dialog=document.createElement('dialog');dialog.className='dealer-confirm';
dialog.innerHTML='<form method="dialog"><button class="dealer-dialog-close" value="cancel" aria-label="Cancel">×</button><p class="dealer-eyebrow">JD MOTORWORKS</p><h2 id="dealer-confirm-title"></h2><p id="dealer-confirm-detail"></p><div class="dealer-confirm-actions"><button value="cancel">CANCEL</button><button type="button" id="dealer-confirm-submit"></button></div></form>';
document.body.appendChild(dialog);
let pending=null,returnFocus=null;
const el=id=>document.getElementById(id);
const owned=id=>garageSave.owned.includes(id);
function announce(message){el('dealer-alert').textContent=storageError||message||''}
function render(message=''){
  if(mode==='garage'&&!owned(garageId))garageId=garageSave.selected;
  const base=getCar(mode==='garage'?garageId:selectedId),car=owned(base.id)?tunedCar(base,garageSave.tuning?.[base.id]):base,carClass=CLASSES.find(c=>c.id===car.classId);
  const category=CLASSES.find(c=>c.id===activeClass);
  panel.classList.toggle('garage-mode',mode==='garage');
  el('dealer-balance').textContent=credits(garageSave.credits)+' CR';
  el('dealer-eyebrow').textContent=mode==='garage'?'YOUR COLLECTION / '+garageSave.owned.length+' OWNED':'THE SHOWROOM / 0'+(CLASSES.indexOf(category)+1);
  el('dealer-title').textContent=mode==='garage'?'Your garage. Your grid.':'Find your next drive.';
  el('dealer-intro').textContent=mode==='garage'?'Select your next race car, or sell one to fund your next upgrade. Your original car is always yours.':category.description;
  el('dealer-class-label').textContent=carClass.name.toUpperCase();
  el('dealer-count').textContent=owned(car.id)?(garageSave.selected===car.id?'SELECTED FOR RACING':'IN YOUR GARAGE'):'AVAILABLE TO PURCHASE';
  el('dealer-body-style').textContent=car.body.toUpperCase();
  el('dealer-car-art').innerHTML=carArt(car);
  el('dealer-car-class').textContent=carClass.tag;
  el('dealer-car-name').textContent=car.name;
  el('dealer-description').textContent=car.body+' · '+car.drive+' · 5-speed manual';
  el('dealer-specs').innerHTML=`<div><span>POWER</span><b>${car.hp} <small>HP</small></b></div><div><span>WEIGHT</span><b>${credits(car.weight)} <small>KG</small></b></div><div><span>GEARING LIMIT</span><b>${car.topSpeed} <small>MPH</small></b></div><div><span>ACCELERATION</span><b>${car.acceleration.toFixed(2)}<small>× STOCK</small></b></div>`;
  el('dealer-price-label').textContent=mode==='garage'?'RESALE VALUE':'PURCHASE PRICE';
  el('dealer-price').textContent=car.id===STARTER_ID?(mode==='garage'?'KEEP FOREVER':'ALREADY OWNED'):credits(mode==='garage'?resaleValue(car):car.price)+' CR';
  const actions=el('dealer-actions');actions.replaceChildren();
  const action=(text,name,disabled=false,secondary=false)=>{const b=document.createElement('button');b.textContent=text;b.dataset.action=name;b.disabled=disabled;b.className=secondary?'dealer-secondary':'dealer-primary';actions.appendChild(b)};
  if(owned(car.id)){
    action(garageSave.selected===car.id?'SELECTED FOR RACING ✓':'SELECT FOR RACING','select',garageSave.selected===car.id||!!storageError);
    if(mode==='garage'&&car.id!==STARTER_ID)action('SELL CAR · '+credits(resaleValue(car))+' CR','sell',!!storageError,true);
  }else action(garageSave.credits>=car.price?'BUY & SELECT →':'NEED '+credits(car.price-garageSave.credits)+' MORE CR','buy',garageSave.credits<car.price||!!storageError);
  if(mode==='garage')action('VISIT DEALERSHIP →','dealership',false,true);
  el('dealer-purchase-note').textContent=mode==='garage'?'Resale is 60% of the original price. Selling your selected car returns you to the JD-R S1.':'Win prizes rise from 1,500 to 7,500 CR through the championships, plus clean-driving bonuses. Buying a car selects it for your next race.';
  el('dealer-stock-title').textContent=mode==='garage'?'YOUR OWNED CARS':'CHOOSE YOUR '+category.name.toUpperCase();
  const stock=mode==='garage'?CARS.filter(c=>owned(c.id)):CARS.filter(c=>c.classId===activeClass);
  el('dealer-stock-count').textContent=stock.length+' CARS';
  el('dealer-stock').innerHTML=stock.map(c=>`<button class="dealer-car-card ${c.id===car.id?'is-selected':''}" data-car="${c.id}" aria-pressed="${c.id===car.id}"><span class="dealer-card-status">${garageSave.selected===c.id?'RACING':owned(c.id)?'OWNED':c.body.toUpperCase()}</span>${carArt(c)}<strong>${c.name}</strong><span>${owned(c.id)?'IN YOUR GARAGE':credits(c.price)+' CR'}</span></button>`).join('');
  panel.querySelectorAll('[data-class]').forEach(button=>{const isActive=button.dataset.class===activeClass;button.classList.toggle('is-active',isActive);button.setAttribute('aria-pressed',String(isActive))});
  customizeCars(panel,garageSave);
  announce(message);
}
function open(modeToOpen){
  freshSave();mode=modeToOpen;garageId=garageSave.selected;
  window.show('dealership');render();window.scrollTo(0,0);el('dealer-title').tabIndex=-1;el('dealer-title').focus({preventScroll:true});
}
function confirmAction(type){
  const car=getCar(mode==='garage'?garageId:selectedId);pending={type,id:car.id};returnFocus=document.activeElement;
  el('dealer-confirm-title').textContent=(type==='buy'?'Buy ':'Sell ')+car.name+'?';
  el('dealer-confirm-detail').textContent=type==='buy'?`${credits(car.price)} CR will be deducted from your ${credits(garageSave.credits)} CR balance. This car will be added to your garage and selected for racing.`:`Receive ${credits(resaleValue(car))} CR and remove this car from your garage.${garageSave.selected===car.id?' Your JD-R S1 will become your selected race car.':''}`;
  el('dealer-confirm-submit').textContent=type==='buy'?'CONFIRM PURCHASE':'CONFIRM SALE';dialog.showModal();
}
dialog.addEventListener('close',()=>{pending=null;if(returnFocus?.isConnected)returnFocus.focus()});
el('dealer-confirm-submit').addEventListener('click',()=>{
  if(!pending)return;
  const task=pending;pending=null;
  if(!freshSave()){dialog.close();render();return}
  const result=task.type==='buy'?purchaseCar(garageSave,task.id):sellCar(garageSave,task.id);
  const succeeded=result.ok&&persist(result.save);
  if(succeeded&&task.type==='buy')document.dispatchEvent(new CustomEvent('jd:purchase'));
  dialog.close();
  render(succeeded?(task.type==='buy'?getCar(task.id).name+' purchased and selected.':getCar(task.id).name+' sold for '+credits(resaleValue(getCar(task.id)))+' CR.'):result.error||storageError);
  panel.querySelector('.dealer-actions button:not(:disabled)')?.focus();
});
panel.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.class){activeClass=button.dataset.class;selectedId=CARS.find(c=>c.classId===activeClass).id;render();panel.querySelector(`[data-class="${activeClass}"]`).focus();return}
  if(button.dataset.car){if(mode==='garage')garageId=button.dataset.car;else selectedId=button.dataset.car;render();panel.querySelector(`[data-car="${button.dataset.car}"]`)?.focus();return}
  switch(button.dataset.action){
    case 'back':window.showMenu();(mode==='garage'?garageButton:dealerButton).focus();break;
    case 'dealership':open('dealership');break;
    case 'buy':case 'sell':confirmAction(button.dataset.action);break;
    case 'select':{
      if(!freshSave()){render();break}
      const result=selectCar(garageSave,mode==='garage'?garageId:selectedId);
      const ok=result.ok&&persist(result.save);render(ok?getCar(garageSave.selected).name+' selected for your next race.':result.error||storageError);break;
    }
  }
});
dealerButton.onclick=()=>open('dealership');garageButton.onclick=()=>open('garage');
const rewardNotice=document.createElement('p');rewardNotice.className='garage-reward';rewardNotice.setAttribute('role','status');document.querySelector('#results .result .stats').after(rewardNotice);
document.addEventListener('jd:race-start',()=>{freshSave();applyCar();rewardNotice.textContent=''});
document.addEventListener('jd:race-finished',e=>{
  const attempt=championship?.takeAttempt();
  if(!freshSave()){rewardNotice.textContent=storageError;return}
  const result=awardRace(garageSave,{...e.detail,opponentId:attempt?.opponentId});
  const progress=attempt?recordChampionshipWin(result.save,{...attempt,win:e.detail.win}):{save:result.save,newWin:false,licence:null};
  const saved=persist(progress.save);
  rewardNotice.textContent=saved?`+${credits(result.reward)} CR ${e.detail.win?'WON':'FINISH REWARD (25%)'} · BALANCE ${credits(garageSave.credits)} CR`:storageError;
  if(saved)championship?.showResult(progress);
});
// Preserve normal race key handling; showroom keys must not shift gears in the background.
window.addEventListener('keydown',e=>{if(panel.classList.contains('hide'))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','KeyW'].includes(e.code))e.stopImmediatePropagation()},true);
createTuneShop({getSave:()=>garageSave,getError:()=>storageError,freshSave,persist});
championship=createChampionship({getSave:()=>garageSave,getError:()=>storageError,freshSave,persist});
createHowToPlay();
installGameAudio();
applyCar();
