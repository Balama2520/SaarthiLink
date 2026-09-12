function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ValueBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {value.map((v, i) => <li key={i}>{String(v)}</li>)}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((v, i) => (
          <div key={i} className="rounded-lg border border-border/70 bg-background/60 p-3">
            <ValueBlock value={v} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (entries.length === 0) return null;
    return (
      <div className="space-y-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{humanizeKey(k)}</p>
            <ValueBlock value={v} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Renders an AI/backend JSON payload without assuming an exact schema.
 * Used where the response shape is defined server-side but not pinned down
 * on the frontend (SkillForge pipelines, paper analysis, toolkit outputs).
 * Falls back to plain text if the payload is just a string.
 */
export function JsonResult({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;
  if (typeof data === "string") {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data}</p>;
  }
  return <ValueBlock value={data} />;
}
