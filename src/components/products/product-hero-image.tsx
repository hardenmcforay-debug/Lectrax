import Image from "next/image";

type ProductHeroImageProps = {
  src: string;
};

function shouldOptimizeProductImage(src: string): boolean {
  // Optimize remote uploads (WebP/AVIF + resize). Keep SVGs/local defaults as-is.
  if (!/^https?:\/\//i.test(src)) return false;
  if (/\.svg(\?|$)/i.test(src)) return false;
  return true;
}

export function ProductHeroImage({ src }: ProductHeroImageProps) {
  const optimize = shouldOptimizeProductImage(src);

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden">
      <div className="landing-float absolute inset-0">
        <Image
          src={src}
          alt=""
          fill
          priority
          fetchPriority="high"
          unoptimized={!optimize}
          sizes="(max-width: 1024px) 100vw, 560px"
          className="object-contain object-center"
        />
      </div>
    </div>
  );
}
