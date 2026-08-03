/**
 * Before React hydrates: installed PWAs that still open `/` (legacy start_url)
 * skip the marketing landing and go straight to Sign In. New installs use
 * manifest start_url `/login`. Authenticated users never reach this HTML —
 * middleware already redirects `/` to their dashboard.
 */
export const PWA_LAUNCH_BOOTSTRAP_SCRIPT = `(function(){try{var w=window,n=w.navigator,q=w.matchMedia;var standalone=false;try{standalone=q("(display-mode: standalone)").matches||q("(display-mode: fullscreen)").matches||q("(display-mode: minimal-ui)").matches||(n&&n.standalone===true);}catch(e){}if(!standalone)return;if(w.location.pathname!=="/")return;w.location.replace("/login");}catch(e){}})();`;
