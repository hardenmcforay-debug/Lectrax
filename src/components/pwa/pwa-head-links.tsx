import { PWA_THEME_COLOR } from "@/lib/pwa/detect";
import { pwaIconUrl } from "@/lib/pwa/config";

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
      {APPLE_SPLASH_SCREENS.map(({ href, media }) => (
        <link key={href} rel="apple-touch-startup-image" href={pwaIconUrl(href)} media={media} />
      ))}
      <meta name="msapplication-TileColor" content={PWA_THEME_COLOR} />
      <meta name="msapplication-TileImage" content={pwaIconUrl("/icons/icon-144x144.png")} />
      <link rel="icon" type="image/png" sizes="32x32" href={pwaIconUrl("/favicon-32x32.png")} />
      <link rel="icon" type="image/png" sizes="16x16" href={pwaIconUrl("/favicon-16x16.png")} />
      <link rel="shortcut icon" href={pwaIconUrl("/favicon-32x32.png")} type="image/png" />
      <link rel="apple-touch-icon" sizes="180x180" href={pwaIconUrl("/icons/apple-touch-icon.png")} />
    </>
  );
}
