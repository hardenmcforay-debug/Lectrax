"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

type ProductHeroImageProps = {
  src: string;
};

export function ProductHeroImage({ src }: ProductHeroImageProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative aspect-[16/10] w-full overflow-hidden"
      animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
      transition={
        reducedMotion
          ? undefined
          : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <motion.div
        className="absolute inset-0"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain object-center"
          priority
        />
      </motion.div>
    </motion.div>
  );
}
