(function(){
'use strict';
const GCID='PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com';
const SC='https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const DR='https://www.googleapis.com/';
const noCfg=GCID.startsWith('PASTE');

/* إصلاح: الرسائل كانت تختفي خلف النوافذ المفتوحة (مثل الإعدادات) */
window.toast=function(m){
 const d=E('div',{class:'toast',txt:m});
 (document.querySelector('dialog[open]')||document.body).append(d);
 setTimeout(()=>d.remove(),3200);
};
const why=e=>' ('+((e&&(e.name||e.error||e.type||e.status))||'?')+')';

Object.assign(T,{
 bio:['البصمة / الوجه','Fingerprint / Face','Empreinte / Visage'],
 bioOn:['تفعيل الفتح بالبصمة أو الوجه','Enable fingerprint / face unlock','Activer empreinte / visage'],
 bioOff:['إيقاف البصمة','Turn off biometrics','Désactiver'],
 bioUse:['فتح بالبصمة / الوجه','Unlock with fingerprint / face','Déverrouiller par empreinte / visage'],
 bioNeedPw:['لتفعيل البصمة عيّن كلمة سر أولاً (من قسم «كلمة السر» في الأعلى)','To enable biometrics, set a password first (see “Password” above)','Pour activer la biométrie, définissez d’abord un mot de passe'],
 bioNo:['غير متاح: سجّل بصمتك أو وجهك وفعّل قفل الشاشة في إعدادات الهاتف','Unavailable: set up a screen lock and register your fingerprint / face in phone settings','Indisponible : activez le verrouillage d’écran et enregistrez empreinte / visage'],
 bioDone:['تم تفعيل البصمة ✓','Biometrics enabled ✓','Activé ✓'],
 gTitle:['حساب Google','Google account','Compte Google'],
 gIn:['تسجيل الدخول بـ Google','Sign in with Google','Se connecter avec Google'],
 gOut:['تسجيل الخروج','Sign out','Se déconnecter'],
 gUp:['حفظ نسخة في Drive','Back up to Drive','Sauvegarder sur Drive'],
 gDown:['استرجاع من Drive','Restore from Drive','Restaurer depuis Drive'],
 gLater:['لاحقاً','Later','Plus tard'],
 gWelcome:['سجّل الدخول بحساب Google ليتم حفظ نسخة من بياناتك (الأغاني، القوائم، المفضلة) في Google Drive الخاص بك.','Sign in with Google to keep a copy of your data (songs, playlists, favorites) in your Google Drive.','Connectez-vous avec Google pour garder une copie de vos données dans votre Google Drive.'],
 gNone:['لا توجد نسخة على Drive','No backup on Drive','Aucune sauvegarde'],
 gUping:['جارٍ الرفع…','Uploading…','Envoi…'],
 gDowning:['جارٍ التنزيل…','Downloading…','Téléchargement…'],
 gCfg:['ربط Google غير مفعّل بعد: ينقص Client ID في ملف maestro-addon.js','Google link not set up yet: Client ID missing in maestro-addon.js','Liaison Google non configurée : Client ID manquant dans maestro-addon.js']
});

const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64u=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function bioAvail(){
 try{return !!(window.PublicKeyCredential&&navigator.credentials&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}
 catch(e){return false}
}
async function bioEnable(){
 const c=await navigator.credentials.create({publicKey:{
  challenge:crypto.getRandomValues(new Uint8Array(32)),
  rp:{name:'MAESTRO_EFOOT'},
  user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'maestro',displayName:pname||'MAESTRO'},
  pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
  authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},
  timeout:60000
 }});
 ls.s('pwbio',b64u(c.rawId));
}
async function bioCheck(){
 const id=ls.g('pwbio');if(!id)return false;
 try{
  await navigator.credentials.get({publicKey:{
   challenge:crypto.getRandomValues(new Uint8Array(32)),
   allowCredentials:[{type:'public-key',id:ub64u(id),transports:['internal']}],
   userVerification:'required',timeout:60000
  }});
  return true;
 }catch(e){return false}
}
async function tryBio(){
 if(await bioCheck()){$('lock').hidden=true;$('lkP').value='';$('lkE').textContent=''}
}
const lkBio=E('button',{id:'lkBio',type:'button',hidden:true,on:tryBio});
lkBio.style.cssText='width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:var(--el);color:var(--text);font:800 1rem Cairo,system-ui';
$('lkB').after(lkBio);
Object.assign(T,{
 lkGuest:['الدخول كضيف','Enter as guest','Entrer en invité']
});
const lkGuest=E('button',{id:'lkGuest',type:'button',txt:'👤 '+t('lkGuest'),on:()=>{$('lock').hidden=true;$('lkP').value='';$('lkE').textContent=''}});
lkGuest.style.cssText='width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:var(--el);color:var(--text);font:800 1rem Cairo,system-ui';
lkBio.after(lkGuest);
function syncBio(auto){
 lkBio.textContent='👆 '+t('bioUse');
 const on=!!ls.g('pwbio')&&!!ls.g('pw');
 lkBio.hidden=!on;
 if(auto&&on){setTimeout(()=>$('lkP').blur(),120);setTimeout(tryBio,350)}
}
const _lock=window.lockNow;
window.lockNow=function(){_lock();syncBio(true)};

let gTok='',gExp=0,gTC=null,gRes,gRej;
const loadGIS=()=>new Promise((res,rej)=>{
 if(window.google&&google.accounts)return res();
 const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=res;s.onerror=rej;document.head.append(s);
});
async function gToken(){
 if(gTok&&Date.now()<gExp-6e4)return gTok;
 if(noCfg){toast(t('gCfg'));throw 0}
 await loadGIS();
 return new Promise((res,rej)=>{
  gRes=res;gRej=rej;
  gTC=gTC||google.accounts.oauth2.initTokenClient({
   client_id:GCID,scope:SC,
   callback:r=>{if(r.error)return gRej(r);gTok=r.access_token;gExp=Date.now()+(+r.expires_in||3600)*1e3;gRes(gTok)},
   error_callback:e=>gRej(e)
  });
  gTC.requestAccessToken({prompt:ls.g('gmail')?'':'select_account'});
 });
}
const gf=async(u,o={})=>{
 const tk=await gToken();
 const r=await fetch(u,{...o,headers:{...(o.headers||{}),Authorization:'Bearer '+tk}});
 if(!r.ok)throw r;return r;
};
async function gFind(name){
 const r=await gf(DR+'drive/v3/files?spaces=appDataFolder&fields=files(id)&q='+encodeURIComponent("name='"+name+"'"));
 return (await r.json()).files[0]||null;
}
async function gAuth(){
 const tk=await gToken();
 const r=await fetch(DR+'oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tk}});
 if(!r.ok)throw r;
 const u=await r.json();
 ls.s('gmail',u.email||'Google');
 return u.email;
}
async function gSignIn(){
 try{await gAuth();toast(t('saved'));window.openSettings()}
 catch(e){if(e)toast(t('fail')+why(e))}
}
function gSignOut(){
 try{if(gTok&&window.google)google.accounts.oauth2.revoke(gTok)}catch(e){}
 gTok='';rmk('gmail');ls.s('guest','1');window.openSettings();
}
async function gBackup(){
 try{
  toast(t('gUping'));
  const blob=await bkBuild(),old=await gFind('maestro.backup');
  const init=await gf(DR+'upload/drive/v3/files'+(old?'/'+old.id:'')+'?uploadType=resumable',{
   method:old?'PATCH':'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(old?{}:{name:'maestro.backup',parents:['appDataFolder']})
  });
  await gf(init.headers.get('Location'),{method:'PUT',body:blob});
  toast(t('saved'));
 }catch(e){if(e)toast(t('fail')+why(e))}
}
async function gRestore(){
 try{
  const f=await gFind('maestro.backup');
  if(!f)return toast(t('gNone'));
  toast(t('gDowning'));
  const r=await gf(DR+'drive/v3/files/'+f.id+'?alt=media');
  await bkRestore(await r.blob());
 }catch(e){if(e)toast(t('fail')+why(e))}
}

function box(){
 const hasPw=!!ls.g('pw'),on=!!ls.g('pwbio'),mail=ls.g('gmail');
 const chip=(l,fn)=>E('button',{class:'chip',type:'button',txt:l,on:fn});
 const bioPart=on
  ?E('div',{class:'chips'},chip(t('bioOff'),()=>{rmk('pwbio');window.openSettings()}))
  :hasPw
   ?E('div',{class:'chips'},chip(t('bioOn'),async()=>{
      if(!await bioAvail())return toast(t('bioNo'));
      try{await bioEnable();toast(t('bioDone'));window.openSettings()}catch(e){toast(t('fail')+why(e))}
    }))
   :E('div',{class:'hint',txt:t('bioNeedPw')});
 return E('div',{},
  E('span',{class:'lb',txt:'👆 '+t('bio')}),bioPart,
  E('span',{class:'lb',txt:'☁️ '+t('gTitle')}),
  ...(noCfg
   ?[E('div',{class:'hint',txt:t('gCfg')})]
   :mail
    ?[E('div',{class:'hint',txt:mail}),E('div',{class:'chips'},chip('⤒ '+t('gUp'),gBackup),twoTap('⤓ '+t('gDown'),gRestore,'chip'),chip(t('gOut'),gSignOut))]
    :[E('div',{class:'chips'},chip(t('gIn'),gSignIn))])
 );
}
const _os=window.openSettings;
window.openSettings=function(){
 _os();
 const d=$('dlg'),row=d.querySelector('.row');
 if(row)d.insertBefore(box(),row);
};
$('bG').onclick=window.openSettings;

if(!$('lock').hidden)syncBio(true);
Object.assign(T,{
 gGate:['سجّل الدخول بحساب Google لحفظ نسخة احتياطية من بياناتك في Drive الخاص بك، أو تابع كضيف وسجّل لاحقاً من الإعدادات.','Sign in with Google to keep a backup of your data in your own Drive, or continue as a guest and sign in later from Settings.','Connectez-vous avec Google pour sauvegarder vos données dans votre Drive, ou continuez en invité et connectez-vous plus tard dans les Paramètres.'],
 gGuest:['المتابعة كضيف','Continue as guest','Continuer en invité'],
 gOffline:['يلزم اتصال بالإنترنت لتسجيل الدخول','Internet is required to sign in','Internet requis pour se connecter'],
 hAbout:['مشغّل موسيقى يعمل على جهازك. تسجيل الدخول بـ Google اختياري، ويتيح لك حفظ نسخة احتياطية في حسابك. ملفاتك الصوتية وصورك تبقى على جهازك ولا تُرفع إلا عندما تضغط «حفظ نسخة في Drive».','A music player that runs on your device. Google sign-in is optional and lets you keep a backup in your own account. Your audio files and photos stay on your device and are uploaded only when you tap “Back up to Drive”.','Un lecteur de musique qui fonctionne sur votre appareil. La connexion Google est facultative et permet une sauvegarde dans votre compte. Vos fichiers restent sur l’appareil et ne sont envoyés que lorsque vous touchez « Sauvegarder sur Drive ».']
});
function afterGate(){
 if(!ls.g('helpSeen')){ls.s('helpSeen','1');setTimeout(()=>$('bH').click(),300)}
}
/* الشاشة الأولى: تسجيل الدخول بـ Google أو المتابعة كضيف (تظهر مرة واحدة فقط) */
function gate(){
 if(ls.g('gmail')||ls.g('guest')||$('gate'))return;
 if(!noCfg)loadGIS().catch(()=>{});
 const err=E('div',{class:'err'});
 const btn=E('button',{type:'button',txt:'G  '+t('gIn'),on:go});
 const gst=E('button',{type:'button',txt:t('gGuest'),on:()=>{ls.s('guest','1');g.remove();afterGate()}});
 btn.style.cssText='width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:var(--g);color:#fff;font:800 1rem Cairo,system-ui';
 gst.style.cssText='width:100%;margin-top:10px;padding:13px;border:0;border-radius:14px;background:var(--el);color:var(--text);font:800 1rem Cairo,system-ui';
 const g=E('div',{id:'gate'},E('div',{class:'lk'},E('div',{class:'hlogo',bg:LOGO}),E('div',{id:'gT',style:'font-size:1.25rem;font-weight:800;margin:6px 0 8px',txt:'MAESTRO_EFOOT'}),E('p',{class:'hint',txt:t('gGate')}),err,btn,gst));
 g.style.cssText='position:fixed;inset:0;z-index:101;display:grid;place-items:center;padding:20px;background:linear-gradient(180deg,var(--c2),var(--c1) 55%,var(--bg))';
 document.body.append(g);
 async function go(){
  if(noCfg){err.textContent=t('gCfg');return}
  err.textContent='';btn.disabled=true;
  try{await gAuth();g.remove();afterGate()}
  catch(e){err.textContent=navigator.onLine?t('fail')+why(e):t('gOffline')}
  btn.disabled=false;
 }
}
gate();
})();
