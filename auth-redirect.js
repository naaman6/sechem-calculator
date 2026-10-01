'use strict';
// ID-token-only OpenID Connect. No client secret, access token or refresh token.
// https://developers.google.com/identity/openid-connect/reference
const RedirectAuth=(()=>{
  const CALLBACK='https://naaman6.github.io/sechem-calculator/';
  const TX='sechem.oidc.transaction',PAUSE='sechem.oidc.pause';
  const ENABLED=false; // Enable only after the exact callback is registered in Google Cloud.
  const enabled=()=>ENABLED&&location.origin==='https://naaman6.github.io';
  let starting=false;
  function pause(){try{sessionStorage.setItem(PAUSE,'1');}catch(_){}}
  function fail(message){
    starting=false;pause();
    $('authStatus').textContent=message;
    $('authRetry').textContent='המשך להזדהות ב־Google';
    $('authRetry').classList.remove('hidden');
  }
  function random(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
  function start(manual=false){
    if(!enabled()||starting||AUTH_VERIFIED||VERIFYING)return;
    try{
      if(!manual&&sessionStorage.getItem(PAUSE)){fail('ההזדהות נעצרה. ניתן להמשיך ל־Google כשמתאים לך.');return;}
      const tx={state:random(),nonce:random(),created:Date.now()};
      sessionStorage.setItem(TX,JSON.stringify(tx));sessionStorage.removeItem(PAUSE);
      const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search=new URLSearchParams({client_id:CONFIG.CLIENT_ID,redirect_uri:CALLBACK,
        response_type:'id_token',scope:'openid email profile',state:tx.state,nonce:tx.nonce}).toString();
      starting=true;$('authStatus').textContent='מעביר להזדהות ב־Google…';
      location.replace(url.href);
    }catch(_){fail('הדפדפן חסם את אחסון מצב ההזדהות. יש לאפשר אחסון עבור האתר ולנסות שוב.');}
  }
  async function consume(){
    const response=new URLSearchParams(location.hash.slice(1));
    if(!response.has('id_token')&&!response.has('error'))return false;
    // Remove the fragment immediately; never log it or persist credentials.
    history.replaceState(null,'',location.pathname+location.search);
    try{
      const stored=sessionStorage.getItem(TX);sessionStorage.removeItem(TX);
      const tx=stored?JSON.parse(stored):null;
      if(!tx||response.get('state')!==tx.state||Date.now()-tx.created>600000||Date.now()<tx.created)
        throw new Error('תהליך ההזדהות פג או לא תואם לבקשה. יש להתחיל מחדש.');
      if(response.has('error'))throw new Error('Google לא השלימה את ההזדהות. לא נשמרו ציונים.');
      const credential=response.get('id_token'),claims=decodeJwt(credential);
      if(claims.nonce!==tx.nonce||claims.aud!==CONFIG.CLIENT_ID||
         !['https://accounts.google.com','accounts.google.com'].includes(claims.iss))
        throw new Error('בדיקת אבטחת ההזדהות נכשלה. יש להתחיל מחדש.');
      await receiveCredential({credential}); // Signature, audience, expiry and email verified on server.
      if(!AUTH_VERIFIED)pause();else sessionStorage.removeItem(PAUSE);
    }catch(e){fail(e.message);}
    return true;
  }
  async function boot(){
    if(!enabled())return false;
    $('authRetry').replaceWith($('authRetry').cloneNode(true));
    $('authRetry').addEventListener('click',()=>start(true));
    if(!(await consume()))start();
    return true;
  }
  return {enabled,start,pause,boot};
})();
