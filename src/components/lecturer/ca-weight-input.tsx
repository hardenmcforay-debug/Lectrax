"use client";

import { useEffect, useState, type FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CaWeightInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function clampCaWeight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** "011" -> "11", "" -> "", "0" -> "0" */
function formatWeightDigits(digits: string): string {
  if (digits === "") return "";
  const withoutLeadingZeros = digits.replace(/^0+/, "");
  return withoutLeadingZeros === "" ? "0" : withoutLeadingZeros;
}

function digitsToWeight(digits: string): number {
  if (digits === "") return 0;
  const formatted = formatWeightDigits(digits);
  return clampCaWeight(parseInt(formatted, 10));
}

export function CaWeightInput({ id, value, onChange, disabled, className }: CaWeightInputProps) {
  const normalized = clampCaWeight(value);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!isEditing) {
      setText(normalized === 0 ? "" : String(normalized));
    }
  }, [normalized, isEditing]);

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setIsEditing(true);
    setText(normalized === 0 ? "" : String(normalized));
    requestAnimationFrame(() => {
      event.target.select();
    });
  }

  function handleChange(raw: string) {
    const digits = parseDigits(raw);
    const formatted = formatWeightDigits(digits);
    const next = digitsToWeight(digits);

    setText(formatted);
    onChange(next);
  }

  function handleBlur() {
    setIsEditing(false);
    const next = digitsToWeight(parseDigits(text));
    onChange(next);
    setText(next === 0 ? "" : String(next));
  }

  const displayValue = isEditing ? text : normalized === 0 ? "" : String(normalized);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      disabled={disabled}
      className={cn(className)}
      value={displayValue}
      placeholder="0"
      onFocus={handleFocus}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
    />
  );
}
