type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Server-rendered JSON-LD script for public marketing pages. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
