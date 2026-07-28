// src/components/BrandMark.jsx
// Malachi Property Management skyline-monogram mark.

export default function BrandMark({ size = 20 }) {
  return (
    <img
      src="/malachi-mark.png"
      alt="Malachi Property Management"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
