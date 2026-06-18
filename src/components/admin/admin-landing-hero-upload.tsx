"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateBrandingImageFile } from "@/lib/landing/branding-image-validation";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { getPublicSupabaseUrl } from "@/lib/env/public";

type AdminLandingHeroUploadProps = {
  initialImageUrl: string | null;
  initialUpdatedAt: string | null;
};

function publicHeroUrl(storagePath: string, cacheBust?: number) {
  const base = getPublicSupabaseUrl();
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/landing-assets/${storagePath}`;
  return cacheBust ? `${url}?v=${cacheBust}` : url;
}

export function AdminLandingHeroUpload({
  initialImageUrl,
  initialUpdatedAt,
}: AdminLandingHeroUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      const response = await appFetch("/api/admin/landing-hero", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const nextUrl = publicHeroUrl(payload.storage_path as string, Date.now());
      setImageUrl(nextUrl);
      setUpdatedAt((payload.updated_at as string) ?? new Date().toISOString());
      setMessage("Hero image updated. The landing page will show your new image.");
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
      const response = await appFetch("/api/admin/landing-hero", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Remove failed.");
      }

      setImageUrl(null);
      setUpdatedAt(null);
      setMessage("Hero image removed. The default dashboard preview is shown again.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove image.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-slate-950 p-6">
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <div className="absolute inset-[9%] overflow-hidden rounded-full border border-white/15 hero-gradient">
            <div className="hero-grid absolute inset-0 opacity-40" aria-hidden />
            {imageUrl ? (
              <div className="relative z-[1] h-full w-full">
                <Image
                src={imageUrl}
                alt="Landing hero preview"
                fill
                className="object-cover"
                sizes="320px"
                unoptimized
              />
              </div>
            ) : (
              <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-3 text-white/60">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">No custom hero image yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {updatedAt && (
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-3">
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
          disabled={uploading || removing}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {imageUrl ? "Replace image" : "Upload image"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            disabled={uploading || removing}
            onClick={() => void handleRemove()}
          >
            {removing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Remove image
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        JPEG, PNG, WebP, or GIF · Max 5 MB · Shown inside the glowing circle on the landing page.
      </p>
    </div>
  );
}
