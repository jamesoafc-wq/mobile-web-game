// v0.48 hybrid preview toggle.
var pmKey48 = 'tdg_course_preview_mode_v047';
var oldMenu48 = renderCourseMenuV045;
function mode48(){try{return localStorage.getItem(pmKey48)||'hybrid'}catch{return'hybrid'}}
function setMode48(v){try{localStorage.setItem(pmKey48,v)}catch{}}
function addHybrid48(){
  var shell=courseMenuV045.firstElementChild;if(!shell)return;
  var row=shell.children[1];if(!row||row.dataset.h48)return;row.dataset.h48='1';
  var b=document.createElement('button');b.type='button';b.textContent='Hybrid';
  b.style.cssText='border:1px solid rgba(238,248,216,.18);border-radius:999px;padding:7px 11px;font:850 11px system-ui;';
  b.onclick=function(){setMode48('hybrid');renderCourseMenuV045();};row.insertBefore(b,row.firstChild);
}
function decorateHybrid48(){
  if(mode48()!=='hybrid')return;
  courseMenuV045.querySelectorAll('button').forEach(function(card,i){
    var svg=card.querySelector('svg');var c=COURSES_V045[i];if(!svg||!c)return;
    var p=svg.parentElement;if(!p||p.dataset.h48)return;p.dataset.h48='1';p.style.height='90px';
    var g=document.createElement('div');g.style.cssText='position:absolute;inset:0;opacity:.7;pointer-events:none;';
    g.style.background='linear-gradient(120deg,'+c.palette[0]+'99,'+c.palette[1]+'44 55%,'+c.palette[2]+'88)';p.appendChild(g);
    var e=document.createElement('div');e.textContent=c.icon;e.style.cssText='position:absolute;left:12px;top:12px;width:45px;height:45px;border-radius:16px;background:rgba(0,0,0,.24);display:grid;place-items:center;font-size:29px;pointer-events:none;';p.appendChild(e);
  });
}
renderCourseMenuV045=function(){var m=mode48(), old=null;if(m==='hybrid'){try{old=localStorage.getItem(pmKey48);localStorage.setItem(pmKey48,'svg')}catch{}}oldMenu48();if(m==='hybrid'){try{old===null?localStorage.removeItem(pmKey48):localStorage.setItem(pmKey48,old)}catch{}}addHybrid48();decorateHybrid48();};
renderCourseMenuV045();
