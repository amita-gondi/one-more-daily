export async function initPush({modal}) {
  const menuButton=document.querySelector('#push-notifications');
  if(location.hostname.endsWith('.chatgpt.site'))return;
  let config;
  try{const response=await fetch('./push-config.json',{cache:'no-store'});if(!response.ok)return;config=await response.json();}catch{return;}
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(config.appId||''))return;
  menuButton.hidden=false;
  let ready;
  function prepare(){
    if(ready)return ready;
    ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Couldn’t reach the notification service. Try again.')),20000);
      window.OneSignalDeferred=window.OneSignalDeferred||[];
      window.OneSignalDeferred.push(async api=>{
        try{
          const worker=new URL('push/onesignal/OneSignalSDKWorker.js',location.href);
          await api.init({appId:config.appId,serviceWorkerPath:worker.pathname.slice(1),serviceWorkerParam:{scope:new URL('./',worker).pathname},notifyButton:{enable:false},welcomeNotification:{disable:true},promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false}]}}});
          clearTimeout(timer);resolve(api);
        }catch(error){clearTimeout(timer);reject(error);}
      });
      const script=document.createElement('script');script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.defer=true;
      script.onerror=()=>{clearTimeout(timer);reject(Error('Couldn’t reach the notification service. Try again.'));};
      document.head.append(script);
    });
    return ready;
  }
  menuButton.onclick=async()=>{
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(ios&&!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone){modal('<h2>Add One More first</h2><p>In Safari, tap <strong>Share → Add to Home Screen</strong>. Open One More from its new icon, then choose <strong>Notifications</strong>.</p>');return;}
    if(!('PushManager' in window)){modal('<h2>Try another browser</h2><p>Phone alerts work in an installed Home Screen app on iPhone, or a supported browser such as Chrome on Android.</p>');return;}
    modal('<h2>Daily phone reminder</h2><p>One alert when the new daily puzzles are ready, around 6 a.m. Pacific.</p><p id="push-status" role="status">Connecting…</p><div class="modal-actions"><button id="push-opt" class="primary-button" disabled>Enable notifications</button></div>');
    let api;
    try{api=await prepare();}catch{const status=document.querySelector('#push-status');if(status)status.textContent='Couldn’t connect. Close this and try again later.';return;}
    const button=document.querySelector('#push-opt');if(!button)return;
    const paint=()=>{const enabled=api.User.PushSubscription.optedIn;const status=document.querySelector('#push-status');const action=document.querySelector('#push-opt');if(status)status.textContent=enabled?'Phone reminders are on.':'Reminders are off. You can turn them off again here.';if(action)action.textContent=enabled?'Turn off reminders':'Enable notifications';};
    paint();button.disabled=false;
    button.onclick=async()=>{
      button.disabled=true;
      try{
        if(api.User.PushSubscription.optedIn)await api.User.PushSubscription.optOut();
        else await api.User.PushSubscription.optIn();
        paint();
        if(!api.User.PushSubscription.optedIn&&window.Notification?.permission==='denied')document.querySelector('#push-status').textContent='Notifications are blocked. Allow them in your browser’s site settings to receive reminders.';
      }catch{const status=document.querySelector('#push-status');if(status)status.textContent='Couldn’t change notifications. Please try again.';}
      finally{button.disabled=false;}
    };
  };
}
