import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Primary UI font — self-hosted by Next.js with font-display: swap
 * so text remains visible during font load (better LCP).
 */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700"],
});
