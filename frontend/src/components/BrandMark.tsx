// Renders the frozen SaarthiLink icon mark (approved brand package,
// 22 Aug 2026) — a light rounded chip with the navy link mark, cropped
// from the official lockup so it stays legible at small UI sizes on the
// app's dark navy background. The drawing itself is untouched; only the
// crop and container size vary by placement. Do not redraw or recolor —
// swap the source image if the brand package is ever updated.
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/brand/mark-chip.png"
      alt="SaarthiLink"
      className={`${className} rounded-lg object-cover shrink-0`}
    />
  );
}
