import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export function FormErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;

  const safeMessage = sanitizeErrorMessage(message);
  const isGeneric = safeMessage === ERROR_MESSAGES.unknown.description;

  return (
    <p className="text-sm text-destructive" role="alert">
      {isGeneric ? `${ERROR_MESSAGES.form.title}. ${ERROR_MESSAGES.form.description}` : safeMessage}
    </p>
  );
}
