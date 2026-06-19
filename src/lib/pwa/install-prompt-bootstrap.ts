/** Inline head bootstrap — captures beforeinstallprompt before React hydrates. */
export const PWA_INSTALL_BOOTSTRAP_SCRIPT = `(function(){var w=window,evt="lectrax-install-prompt-ready",key="lectrax-pwa-installed";function mark(){try{w.localStorage.setItem(key,"1");}catch(e){}}if(w.__lectraxPwaInstallListenersBound)return;w.__lectraxPwaInstallListenersBound=true;w.__lectraxDeferredInstallPrompt=null;w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w.__lectraxDeferredInstallPrompt=e;w.dispatchEvent(new Event(evt));});w.addEventListener("appinstalled",function(){mark();w.__lectraxDeferredInstallPrompt=null;w.dispatchEvent(new Event(evt));});})();`;

export const PWA_INSTALL_PROMPT_READY_EVENT = "lectrax-install-prompt-ready";
