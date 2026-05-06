export function generateEmbedScript(tenantId: string, baseUrl: string, brandColor: string): string {
  const t = JSON.stringify(tenantId);
  const b = JSON.stringify(baseUrl);
  const c = JSON.stringify(brandColor);

  return `(function(){
if(window.__SupportPulse)return;
window.__SupportPulse=true;
var T=${t},B=${b},C=${c};
var mqStyle=document.createElement('style');
mqStyle.textContent='#sp-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:'+C+';border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;z-index:2147483646;transition:transform .15s;padding:0;}#sp-btn:hover{transform:scale(1.08);}#sp-frame{position:fixed;bottom:96px;right:24px;width:400px;height:620px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);border:none;z-index:2147483645;display:none;opacity:0;transition:opacity .2s,transform .2s;transform:translateY(8px);}@media(max-width:480px){#sp-frame{width:calc(100vw - 16px)!important;height:calc(100vh - 96px)!important;bottom:80px!important;right:8px!important;border-radius:12px!important;}}';
document.head.appendChild(mqStyle);
var ICON_CHAT='<svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" fill="#fff"/></svg>';
var ICON_CLOSE='<svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var btn=document.createElement('button');
btn.id='sp-btn';
btn.setAttribute('aria-label','Открыть поддержку');
btn.setAttribute('aria-expanded','false');
btn.innerHTML=ICON_CHAT;
var frame=document.createElement('iframe');
frame.id='sp-frame';
frame.src=B+'/?embed=1&tenantId='+encodeURIComponent(T);
frame.allow='clipboard-write';
frame.setAttribute('title','Поддержка');
document.body.appendChild(btn);
document.body.appendChild(frame);
var isOpen=false;
function openWidget(){
  frame.style.display='block';
  requestAnimationFrame(function(){
    frame.style.opacity='1';
    frame.style.transform='translateY(0)';
  });
  btn.setAttribute('aria-expanded','true');
  btn.innerHTML=ICON_CLOSE;
  isOpen=true;
}
function closeWidget(){
  frame.style.opacity='0';
  frame.style.transform='translateY(8px)';
  setTimeout(function(){frame.style.display='none';},200);
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML=ICON_CHAT;
  isOpen=false;
}
btn.addEventListener('click',function(){isOpen?closeWidget():openWidget();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen)closeWidget();});
})();`;
}
