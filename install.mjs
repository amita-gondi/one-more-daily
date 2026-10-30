export function initInstallable({modal,toast}) {
  let promptEvent;
  const button=document.querySelector('#install-app');
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;});
  window.addEventListener('appinstalled',()=>{promptEvent=null;button.textContent='App installed';toast('One More is on your device.');});
  button.addEventListener('click',async()=>{
    if(installed()){modal('<h2>One More is installed.</h2><p>Open it from your Home Screen whenever you’re ready to play.</p>');return;}
    if(promptEvent){const event=promptEvent;promptEvent=null;await event.prompt();await event.userChoice;return;}
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const android=/Android/.test(navigator.userAgent);
    const instructions=ios
      ?'<p>Open this game in Safari. Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Turn on <strong>Open as Web App</strong> if it appears, then tap <strong>Add</strong>.</p>'
      :android
      ?'<p>Open this game in Chrome. Open its <strong>⋮ menu</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>'
      :'<p>In Chrome or Edge, choose <strong>Install One More</strong> from the address bar or browser menu. In Safari on Mac, choose <strong>File → Add to Dock</strong>.</p>';
    modal('<h2>Install One More</h2>'+instructions+'<p>You’ll get an app icon that opens straight into the game.</p>');
  });
  // The hosted work preview is owner-private. Offline caching is enabled only
  // on the public deployment, rather than caching an authenticated preview.
  if('serviceWorker' in navigator&&window.isSecureContext&&!location.hostname.endsWith('.chatgpt.site')){
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
  }
}
