// src/components/BrandMark.jsx
// Skyline-monogram mark: two towers forming the legs of an "M", with a
// small gabled roof nested in the dip — the Malachi Property Management logo.

export default function BrandMark({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="14,82 14,20 50,68 86,20 86,82" />
      <polyline points="38,68 50,54 62,68" />
    </svg>
  );
}
