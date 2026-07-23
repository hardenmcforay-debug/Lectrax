"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { appFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import {
  getProductsWithImageUpload,
  type ProductImageUploadSlug,
} from "@/lib/landing/products";
import { validateBrandingImageFile } from "@/lib/landing/branding-image-validation";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { buildLandingAssetPublicUrl } from "@/lib/landing/public-asset-url";

type ProductImageState = {
  imageUrl: string;
  isCustom: boolean;
  updatedAt: string | null;
};

type AdminLandingProductImagesProps = {
  initialImages: Record<ProductImageUploadSlug, ProductImageState>;
};

function publicProductImageUrl(storagePath: string, cacheVersion?: string | number) {
  return buildLandingAssetPublicUrl(storagePath, cacheVersion);
}

function ProductImageUpload({
  productSlug,
  title,
  defaultImage,
  state,
  onStateChange,
}: {
  productSlug: ProductImageUploadSlug;
  title: string;
  defaultImage: string;
  state: ProductImageState;
  onStateChange: (next: ProductImageState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(file: File) {
    const validationError = validateBrandingImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productSlug", productSlug);

      const response = await appFetch("/api/admin/landing-product-images", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const productUpdatedAt =
        (payload.product_updated_at as string) ??
        (payload.updated_at as string) ??
        new Date().toISOString();
      const nextUrl = publicProductImageUrl(payload.storage_path as string, productUpdatedAt);
      if (!nextUrl) {
        throw new Error("Could not build image URL.");
      }

      onStateChange({
        imageUrl: nextUrl,
        isCustom: true,
        updatedAt: productUpdatedAt,
      });
      setMessage("Image updated.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? sanitizeErrorMessage(uploadError.message)
          : "Could not upload image."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setRemoving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await appFetch(
        `/api/admin/landing-product-images?productSlug=${encodeURIComponent(productSlug)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Remove failed.");
      }

      onStateChange({
        imageUrl: defaultImage,
        isCustom: false,
        updatedAt: null,
      });
      setMessage("Default image restored.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove image.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-slate-50">
        <Image
          key={state.imageUrl}
          src={state.imageUrl}
          alt={`${title} cover`}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {!state.isCustom && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/55 px-3 py-2 text-xs text-white">
            Default illustration
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {state.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Updated: {new Date(state.updatedAt).toLocaleString()}
          </p>
        )}
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={uploading || removing}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {state.isCustom ? "Replace" : "Upload"}
          </Button>
          {state.isCustom && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading || removing}
              onClick={() => void handleRemove()}
            >
              {removing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminLandingProductImages({ initialImages }: AdminLandingProductImagesProps) {
  const [images, setImages] = useState(initialImages);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p>
          Upload a hero image for each Products nav page that uses a photo cover (QR Attendance,
          Assignment Management, Continuous Assessment, Performance Analytics, Class Session
          Management). Secure Academic Records uses a built-in illustration. JPEG, PNG, WebP, or GIF
          up to 5 MB. Removing an upload restores the default illustration.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {getProductsWithImageUpload().map((product) => (
          <ProductImageUpload
            key={product.slug}
            productSlug={product.slug}
            title={product.title}
            defaultImage={product.image}
            state={images[product.slug]}
            onStateChange={(next) =>
              setImages((current) => ({
                ...current,
                [product.slug]: next,
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}
