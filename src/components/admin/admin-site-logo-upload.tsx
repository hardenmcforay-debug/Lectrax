"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

type AdminSiteLogoUploadProps = {
  initialLogoUrl: string | null;
  initialUpdatedAt: string | null;
};

function publicLogoUrl(storagePath: string, cacheBust?: number) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/landing-assets/${storagePath}`;
  return cacheBust ? `${url}?v=${cacheBust}` : url;
}

export function AdminSiteLogoUpload({
  initialLogoUrl,
  initialUpdatedAt,
}: AdminSiteLogoUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/site-logo", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const nextUrl = publicLogoUrl(payload.storage_path as string, Date.now());
      setLogoUrl(nextUrl);
      setUpdatedAt((payload.updated_at as string) ?? new Date().toISOString());
      setMessage("Logo updated across the app.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload logo.");
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
      const response = await fetch("/api/admin/site-logo", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Remove failed.");
      }

      setLogoUrl(null);
      setUpdatedAt(null);
      setMessage("Logo removed. The default icon is shown again.");
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove logo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border p-6">
        <p className="text-sm font-medium text-slate-700">Preview on nav backgrounds</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="landing-nav-glass rounded-lg border border-slate-200/60 bg-white/90 px-4 py-3 shadow-sm">
            <Logo logoUrl={logoUrl} iconWithBackground />
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0f3d91] px-4 py-3">
            <Logo logoUrl={logoUrl} iconWithBackground variant="light" />
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <Logo logoUrl={logoUrl} />
          </div>
        </div>
      </div>

      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border bg-white">
        {logoUrl ? (
          <div className="relative h-16 w-16">
            <Image
              src={logoUrl}
              alt="Logo preview"
              fill
              className="object-contain"
              sizes="64px"
              unoptimized={logoUrl.includes(".svg")}
            />
          </div>
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
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
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
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
          {logoUrl ? "Replace logo" : "Upload logo"}
        </Button>
        {logoUrl && (
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
            Remove logo
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        JPEG, PNG, WebP, GIF, or SVG · Max 5 MB · Used in the navbar, sidebar, footer, and auth
        pages.
      </p>
    </div>
  );
}
