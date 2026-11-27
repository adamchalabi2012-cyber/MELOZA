(function(){
'use strict';
const GCID='PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com';
const SC='https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email';
const DR='https://www.googleapis.com/';
const noCfg=GCID.startsWith('PASTE');

Object.assign(T,{
 bio:['البصمة / الوجه','Fingerprint / Face','Empreinte / Visage'],
 bioOn:['تفعيل الفتح بالبصمة أو الوجه','Enable fingerprint / face unlock','Activer empreinte / visage'],
 bioOff:['إيقاف البصمة','Turn off biometrics','Désactiver'],
 bioUse:['فتح بالبصمة / الوجه','Unlock with fingerprint / face','Déverrouiller par empreinte / visage'],
 bioNeedPw:['عيّن كلمة سر أولاً','Set a password first','Définissez d’abord un mot de passe'],
 bioNo:['البصمة غير مدعومة هنا (ربما داخل WebView)','Not supported here (maybe inside a WebView)','Non pris en charge ici'],
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
 gCfg:['ضع Client ID في ملف maestro-addon.js أولاً','Set the Client ID in maestro-addon.js first','Définissez le Client ID d’abord']
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
async function gSignIn(){
 try{
  const tk=await gToken();
  const u=await (await fetch(DR+'oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+tk}})).json();
  ls.s('gmail',u.email||'Google');
  toast(t('saved'));window.openSettings();
 }catch(e){if(e)toast(t('fail'))}
}
function gSignOut(){
 try{if(gTok&&window.google)google.accounts.oauth2.revoke(gTok)}catch(e){}
 gTok='';rmk('gmail');window.openSettings();
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
 }catch(e){if(e)toast(t('fail'))}
}
async function gRestore(){
 try{
  const f=await gFind('maestro.backup');
  if(!f)return toast(t('gNone'));
  toast(t('gDowning'));
  const r=await gf(DR+'drive/v3/files/'+f.id+'?alt=media');
  await bkRestore(await r.blob());
 }catch(e){if(e)toast(t('fail'))}
}

function box(){
 const hasPw=!!ls.g('pw'),on=!!ls.g('pwbio'),mail=ls.g('gmail');
 const chip=(l,fn)=>E('button',{class:'chip',type:'button',txt:l,on:fn});
 const bioBtn=on
  ?chip(t('bioOff'),()=>{rmk('pwbio');window.openSettings()})
  :chip(t('bioOn'),async()=>{
    if(!hasPw)return toast(t('bioNeedPw'));
    if(!await bioAvail())return toast(t('bioNo'));
    try{await bioEnable();toast(t('bioDone'));window.openSettings()}catch(e){toast(t('fail'))}
   });
 return E('div',{},
  E('span',{class:'lb',txt:'👆 '+t('bio')}),E('div',{class:'chips'},bioBtn),
  E('span',{class:'lb',txt:'☁️ '+t('gTitle')}),
  ...(mail
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
if(!noCfg){
 loadGIS().catch(()=>{});
 if(!ls.g('gmail')&&!ls.g('gAsk')&&$('lock').hidden){
  setTimeout(()=>{
   ls.s('gAsk','1');
   sheet('☁️ '+t('gTitle'),[E('p',{class:'hint',txt:t('gWelcome')})],[
    E('button',{type:'button',txt:t('gLater'),on:()=>$('dlg').close()}),
    E('button',{class:'go',type:'button',txt:t('gIn'),on:()=>{$('dlg').close();gSignIn()}})
   ]);
  },800);
 }
}
})();
