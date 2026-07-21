// src/components/HeroSkyline.jsx
// Golden-hour gradient + house-silhouette illustration for the Login/Signup
// brand panel. Placeholder for a real property photo — swap the .hero-bg
// background in login.css for an actual photo once one is available.

export default function HeroSkyline() {
  return (
    <>
      <div className="hero-bg" aria-hidden="true" />
      <svg
        className="hero-skyline"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <g fill="#241611" opacity="0.85">
          <polygon points="0,500 0,380 90,380 90,320 150,265 210,320 210,380 300,380 300,500" />
          <polygon points="270,500 270,350 350,350 350,300 415,255 480,300 480,350 560,350 560,500" />
          <rect x="325" y="395" width="28" height="45" fill="#e8955c" opacity="0.45" />
          <polygon points="540,500 540,395 600,395 600,355 650,315 700,355 700,395 790,395 790,500" />
          <rect x="655" y="415" width="24" height="38" fill="#e8955c" opacity="0.45" />
        </g>
      </svg>
      <div className="hero-scrim" aria-hidden="true" />
    </>
  );
}
