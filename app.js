
const $ = s => document.querySelector(s);
const KEY = "drinko-state-v1";

const defaults = {
  settings: {start:"08:00", finish:"22:00", interval:120, glassMl:250, targetMl:2500},
  day: todayKey(),
  glasses: 0,
  due: 1,
  history: [],
  nextAt: null
};

function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function load(){
  let s;
  try{s=JSON.parse(localStorage.getItem(KEY))||structuredClone(defaults)}catch{s=structuredClone(defaults)}
  if(s.day!==todayKey()){
    s.day=todayKey(); s.glasses=0; s.due=1; s.history=[]; s.nextAt=null;
  }
  return s;
}
let state=load();

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function fmtTime(ts){
  if(!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
}
function greeting(){
  const h=new Date().getHours();
  return h<12?"GOOD MORNING":h<18?"GOOD AFTERNOON":"GOOD EVENING";
}
function withinWindow(d=new Date()){
  const [sh,sm]=state.settings.start.split(":").map(Number);
  const [fh,fm]=state.settings.finish.split(":").map(Number);
  const mins=d.getHours()*60+d.getMinutes();
  return mins>=sh*60+sm && mins<=fh*60+fm;
}
function nextWindowStart(){
  const now=new Date();
  const [sh,sm]=state.settings.start.split(":").map(Number);
  const [fh,fm]=state.settings.finish.split(":").map(Number);
  const nowM=now.getHours()*60+now.getMinutes(), startM=sh*60+sm, finishM=fh*60+fm;
  const d=new Date(now);
  if(nowM<startM){ d.setHours(sh,sm,0,0); return d.getTime(); }
  if(nowM>finishM){ d.setDate(d.getDate()+1); d.setHours(sh,sm,0,0); return d.getTime(); }
  return now.getTime();
}
function scheduleNext(from=Date.now()){
  let next = from + state.settings.interval*60000;
  const d=new Date(next);
  const [fh,fm]=state.settings.finish.split(":").map(Number);
  if(d.getHours()*60+d.getMinutes()>fh*60+fm){
    const [sh,sm]=state.settings.start.split(":").map(Number);
    d.setDate(d.getDate()+1); d.setHours(sh,sm,0,0); next=d.getTime();
  }
  state.nextAt=next; save(); render();
}
function drink(count){
  const now=Date.now();
  state.glasses += count;
  state.history.unshift({time:now, count, type:"drank"});
  state.due=1;
  scheduleNext(now);
}
function missed(){
  const now=Date.now();
  state.history.unshift({time:now, count:state.due, type:"missed"});
  // "Double next time", capped at 2 for safety/usability.
  state.due=2;
  scheduleNext(now);
}
function maybeDue(){
  if(!state.nextAt){
    state.nextAt=nextWindowStart();
    if(state.nextAt<=Date.now()) scheduleNext(Date.now()-state.settings.interval*60000);
    else save();
  }
  if(Date.now()>=state.nextAt && withinWindow()){
    notify(`DRINKO 💧`, state.due===1 ? "Have a glass of water now." : "You missed the last one. Have 2 glasses of water now.");
    // Don't repeatedly notify every second; roll the timer forward once.
    state.nextAt = Date.now() + state.settings.interval*60000;
    save(); render();
  }
}
function notify(title, body){
  if("Notification" in window && Notification.permission==="granted"){
    navigator.serviceWorker?.getRegistration().then(reg=>{
      if(reg) reg.showNotification(title,{body,icon:"icon-192.png",badge:"icon-192.png",tag:"drinko-reminder",renotify:true});
      else new Notification(title,{body});
    });
  }
}
function render(){
  $("#greeting").textContent=greeting();
  $("#dueGlasses").textContent=state.due===1?"1 glass":"2 glasses";
  $("#headline").textContent=state.due===1?"Time for some water 💧":"Catch-up time 💧💧";
  $("#glassesToday").textContent=state.glasses;
  const ml=state.glasses*state.settings.glassMl;
  $("#mlToday").textContent=`${ml} ml`;
  $("#targetMl").textContent=state.settings.targetMl;
  $("#progressBar").style.width=`${Math.min(100, (ml/state.settings.targetMl)*100)}%`;
  $("#nextReminder").textContent=fmtTime(state.nextAt);

  $("#history").innerHTML = state.history.length ? state.history.slice(0,12).map(h=>{
    const cls=h.type==="drank"?"ok":"missed";
    const label=h.type==="drank"?`✓ ${h.count} glass${h.count>1?"es":""}`:`✕ missed`;
    return `<div class="history-row"><span>${fmtTime(h.time)}</span><span class="${cls}">${label}</span></div>`;
  }).join("") : `<div class="history-row"><span>No drinks logged yet</span><span>💧</span></div>`;

  $("#startTime").value=state.settings.start;
  $("#finishTime").value=state.settings.finish;
  $("#intervalMins").value=String(state.settings.interval);
  $("#glassMl").value=String(state.settings.glassMl);
  $("#dailyTarget").value=state.settings.targetMl;
}

$("#doneBtn").addEventListener("click",()=>drink(state.due));
$("#addBtn").addEventListener("click",()=>drink(1));
$("#notYetBtn").addEventListener("click",missed);
$("#settingsBtn").addEventListener("click",()=>$("#settingsDialog").showModal());
$("#saveSettings").addEventListener("click",()=>{
  state.settings={
    start:$("#startTime").value,
    finish:$("#finishTime").value,
    interval:Number($("#intervalMins").value),
    glassMl:Number($("#glassMl").value),
    targetMl:Number($("#dailyTarget").value)
  };
  scheduleNext(Date.now());
});
$("#notifyBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){ alert("Notifications are not supported in this browser."); return; }
  const p=await Notification.requestPermission();
  alert(p==="granted" ? "DRINKO notifications are enabled." : "Notifications were not enabled.");
});
$("#resetToday").addEventListener("click",()=>{
  if(confirm("Reset today's DRINKO history?")){
    state.glasses=0;state.due=1;state.history=[];state.nextAt=null;save();render();
  }
});

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(console.error);
}
render();
maybeDue();
setInterval(maybeDue, 30000);
