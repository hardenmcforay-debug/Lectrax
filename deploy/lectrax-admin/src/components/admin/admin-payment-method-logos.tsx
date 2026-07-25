"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Smartphone, Trash2, Upload } from "lucide-react";
import { appFetch } from "@/lib/api/client-fetch";
import { Button } from "@/components/ui/button";
import {
  PAYMENT_METHOD_LOGO_OPTIONS,
  type PaymentMethodLogoId,
} from "@/lib/subscription/payment-method-logo-ids";
import { validateBrandingImageFile } from "@/lib/landing/branding-image-validation";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { buildLandingAssetPublicUrl } from "@/lib/landing/public-asset-url";

type LogoState = {
  imageUrl: string | null;
  updatedAt: string | null;
};

type AdminPaymentMethodLogosProps = {
  initialLogos: Record<PaymentMethodLogoId, LogoState>;
};

function PaymentMethodLogoUpload({
  methodId,
  label,
  state,
  onStateChange,
}: {
  methodId: PaymentMethodLogoId;
  label: string;
  state: LogoState;
  onStateChange: (next: LogoState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(file: File) {
    if (uploading || removing) return;

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
      formData.append("methodId", methodId);

      const response = await appFetch("/api/admin/payment-method-logos", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      const logoUpdatedAt =
        (payload.logo_updated_at as string) ??
        (payload.updated_at as string) ??
        new Date().toISOString();
      const nextUrl = buildLandingAssetPublicUrl(payload.storage_path as string, logoUpdatedAt);
      if (!nextUrl) {
        throw new Error("Could not build logo URL.");
      }

      onStateChange({ imageUrl: nextUrl, updatedAt: logoUpdatedAt });
      setMessage("Logo updated.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? sanitizeErrorMessage(uploadError.message)
          : "Could not upload logo."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (uploading || removing) return;
    setRemoving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await appFetch(
        `/api/admin/payment-method-logos?methodId=${encodeURIComponent(methodId)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Remove failed.");
      }

      onStateChange({ imageUrl: null, updatedAt: null });
      setMessage("Logo removed. The phone icon is shown again.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove logo.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
          {state.imageUrl ? (
            <div className="relative h-12 w-12">
              <Image
                src={state.imageUrl}
                alt={`${label} logo`}
                fill
                unoptimized
                className="object-contain"
                sizes="48px"
              />
            </div>
          ) : (
            <Smartphone className="h-7 w-7 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          {state.updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(state.updatedAt).toLocaleString()}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No custom logo — phone icon is used</p>
          )}
          {message && <p className="text-xs text-emerald-600">{message}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
          size="sm"
          loading={uploading}
          disabled={removing}
          onClick={() => inputRef.current?.click()}
        >
          {!uploading && <Upload className="mr-2 h-4 w-4" />}
          {state.imageUrl ? "Replace logo" : "Upload logo"}
        </Button>
        {state.imageUrl && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={removing}
            disabled={uploading}
            onClick={() => void handleRemove()}
          >
            {!removing && <Trash2 className="mr-2 h-4 w-4" />}
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminPaymentMethodLogos({ initialLogos }: AdminPaymentMethodLogosProps) {
  const [logos, setLogos] = useState(initialLogos);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a company logo for each payment method shown when lecturers upgrade their plan.
        JPEG, PNG, WebP, GIF, or SVG · Max 5 MB. If no logo is uploaded, the phone icon is shown.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PAYMENT_METHOD_LOGO_OPTIONS.map((option) => (
          <PaymentMethodLogoUpload
            key={option.id}
            methodId={option.id}
            label={option.label}
            state={logos[option.id]}
            onStateChange={(next) =>
              setLogos((current) => ({
                ...current,
                [option.id]: next,
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}
