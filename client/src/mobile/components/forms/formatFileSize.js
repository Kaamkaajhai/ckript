/*
 * Rounded to a unit a person reads at a glance; a screenplay is never so large
 * that a second decimal place tells the user anything useful.
 *
 * Its own module rather than a second export from FilePicker.jsx, because a
 * component file that also exports a helper breaks fast refresh for the whole
 * file (eslint react-refresh/only-export-components).
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default formatFileSize;
