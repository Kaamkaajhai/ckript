import { useState } from "react";
import { getProvider } from "../data/externalEventProviders";

/**
 * A ticketing platform's mark.
 *
 * These are lettermark tiles in each platform's recognisable accent colour, drawn here rather than
 * shipped as image files. Two reasons: the real logos are those companies' trademarks and are not
 * ours to redistribute inside this repository, and a drawn mark needs no network request, so the
 * form renders identically offline and under a strict CSP.
 *
 * To use the official artwork instead, drop it at `client/public/brands/<slug>.svg`. This component
 * tries that path first and only falls back to the lettermark when the file 404s — so adding the
 * real logos is a matter of copying files in, with no code change and no list to update.
 */
export default function ProviderMark({ slug, size = 28, className = "" }) {
  const provider = getProvider(slug);
  const [useFallback, setUseFallback] = useState(false);

  if (!provider) return null;

  const style = { width: size, height: size, borderRadius: Math.round(size * 0.24) };

  if (!useFallback) {
    return (
      <img
        src={`/brands/${provider.slug}.svg`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{ ...style, objectFit: "contain" }}
        className={className}
        onError={() => setUseFallback(true)}
      />
    );
  }

  // Scaled to the tile so "BMS" fits where a lone "L" would look lost.
  const fontSize = Math.round(
    size * (provider.initials.length > 2 ? 0.3 : provider.initials.length > 1 ? 0.38 : 0.46),
  );

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: provider.color,
        color: "#fff",
        fontWeight: 700,
        fontSize,
        letterSpacing: "0.02em",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {provider.initials}
    </span>
  );
}
