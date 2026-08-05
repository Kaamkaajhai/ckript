/*
 * icons.jsx — the Material Symbols renderer used everywhere in the shell.
 *
 * The name → ligature map lives in ./symbols.js; this file exports only the
 * component so Fast Refresh keeps working.
 */
import { SYMBOLS } from "./symbols";

/**
 * <MatIcon name="dashboard" size={24} weight={400} fill={false} />
 *
 * `name` accepts either a semantic key from SYMBOLS or a raw ligature, so a
 * one-off icon does not have to be added to the map first.
 */
export const MatIcon = ({
  name,
  size = 24,
  weight = 400,
  fill = false,
  grade = 0,
  className = "",
  style,
  ...rest
}) => {
  const ligature = SYMBOLS[name] || name;
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size}`,
        ...style,
      }}
      {...rest}
    >
      {ligature}
    </span>
  );
};

export default MatIcon;
