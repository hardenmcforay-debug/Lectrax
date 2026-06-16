import { PWA_THEME_COLOR } from "@/lib/pwa/detect";

const APPLE_SPLASH_SCREENS = [
  { href: "/splash/apple-splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px)" },
  { href: "/splash/apple-splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px)" },
  { href: "/splash/apple-splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px)" },
  { href: "/splash/apple-splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px)" },
  { href: "/splash/apple-splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px)" },
  { href: "/splash/apple-splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px)" },
  { href: "/splash/apple-splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px)" },
  { href: "/splash/apple-splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px)" },
  { href: "/splash/apple-splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px)" },
] as const;

export function PwaHeadLinks() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var w=window,mx=1023;function m(){try{var d=document.documentElement,n=w.navigator,q=w.matchMedia;if(q("(display-mode: standalone)").matches||q("(display-mode: fullscreen)").matches||(n&&n.standalone===true)){d.dataset.pwaStandalone="true";}if(w.innerWidth<=mx){d.dataset.portalMobile="true";}else{delete d.dataset.portalMobile;}if(d.querySelector(".portal-shell-root")){d.dataset.portalChrome="ready";}}catch(e){}}m();w.addEventListener("pageshow",m);w.addEventListener("resize",m);w.addEventListener("orientationchange",m);document.addEventListener("visibilitychange",function(){if(!document.hidden)m();});})();`,
        }}
      />
      {APPLE_SPLASH_SCREENS.map(({ href, media }) => (
        <link key={href} rel="apple-touch-startup-image" href={href} media={media} />
      ))}
      <meta name="msapplication-TileColor" content={PWA_THEME_COLOR} />
      <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
    </>
  );
}
