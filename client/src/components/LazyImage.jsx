/**
 * LazyImage
 *
 * A drop-in <img> replacement that:
 *  - Uses native loading="lazy" for browser-native deferral
 *  - Shows a shimmer skeleton while the image loads
 *  - Fades in the image smoothly once loaded
 *  - Provides a <picture> with WebP <source> when a webpSrc is passed
 *  - Accepts an onError fallback
 *
 * Props:
 *   src        — original image URL (jpg/png/etc.)
 *   webpSrc    — optional WebP version URL
 *   alt        — alt text
 *   className  — applied to the <img> element
 *   wrapClass  — applied to the wrapper <div>
 *   onError    — called when image fails to load
 *   eager      — set to true to skip lazy loading (e.g. above-the-fold hero)
 */
import { useState } from "react";
import { useDarkMode } from "../context/DarkModeContext";

const LazyImage = ({
  src,
  webpSrc,
  srcSet,
  webpSrcSet,
  sizes,
  alt = "",
  className = "",
  wrapClass = "w-full h-full",
  onError,
  eager = false,
}) => {
  const { isDarkMode: dark } = useDarkMode();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
    setErrored(true);
    setLoaded(true); // hide skeleton
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${wrapClass}`}>
      {/* Shimmer skeleton — visible until image loads */}
      {!loaded && (
        <div
          className={`absolute inset-0 skeleton ${
            dark ? "!bg-none bg-[#0e1c2e]" : ""
          }`}
          aria-hidden="true"
          style={dark ? {
            background: "linear-gradient(90deg, #0e1c2e 25%, #1a3050 37%, #0e1c2e 63%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
          } : undefined}
        />
      )}

      {/* Actual image — uses <picture> for WebP when available */}
      {!errored && (
        <picture className={`block ${wrapClass}`}>
          {webpSrcSet && <source srcSet={webpSrcSet} type="image/webp" sizes={sizes} />}
          {webpSrc && !webpSrcSet && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={`
              transition-opacity duration-500 ease-out
              ${loaded ? "opacity-100" : "opacity-0"}
              ${className}
            `}
          />
        </picture>
      )}
    </div>
  );
};

export default LazyImage;
