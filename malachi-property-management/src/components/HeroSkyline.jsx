// src/components/HeroSkyline.jsx
// Dusk-blue sky + a single large shingle-style house silhouette for the
// Login/Signup brand panel — glowing windows, a stone-wall foreground, and
// a couple of softly flickering lights for a lived-in, homey feel.

export default function HeroSkyline() {
  return (
    <>
      <div className="hero-bg" aria-hidden="true" />
      <svg
        className="hero-skyline"
        viewBox="0 0 640 800"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="windowGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Distant tree line */}
        <g fill="#0b0e18" opacity="0.55">
          <ellipse cx="30" cy="680" rx="45" ry="65" />
          <ellipse cx="610" cy="700" rx="50" ry="60" />
        </g>

        {/* House silhouette */}
        <g fill="#100c10" opacity="0.94">
          {/* Left tower, tallest */}
          <polygon points="40,800 40,300 150,210 260,300 260,800" />
          {/* Central gable */}
          <polygon points="230,800 230,380 340,300 450,380 450,800" />
          {/* Right wing, lower */}
          <polygon points="420,800 420,480 480,430 540,480 540,800" />
          <polygon points="520,800 520,560 620,560 620,800" />
        </g>

        {/* Arched feature window (the round window from the reference photo) */}
        <path
          d="M 312 320 A 30 30 0 0 1 372 320 L 372 366 L 312 366 Z"
          fill="#f2b579"
          opacity="0.85"
          filter="url(#windowGlow)"
        />

        {/* Lit windows */}
        <g fill="#f2b579">
          {/* Tower */}
          <rect x="80" y="360" width="24" height="32" opacity="0.55" />
          <rect x="196" y="360" width="24" height="32" className="hero-window flicker" style={{ animationDelay: "0.4s" }} />
          <rect x="80" y="450" width="24" height="32" opacity="0.6" />
          <rect x="196" y="450" width="24" height="32" opacity="0.5" />
          <rect x="80" y="540" width="24" height="32" opacity="0.5" />
          <rect x="196" y="540" width="24" height="32" opacity="0.6" />

          {/* Central gable, below the arch */}
          <rect x="256" y="440" width="26" height="34" opacity="0.55" />
          <rect x="400" y="440" width="26" height="34" className="hero-window flicker" style={{ animationDelay: "2s" }} />
          <rect x="256" y="530" width="26" height="34" opacity="0.6" />
          <rect x="400" y="530" width="26" height="34" opacity="0.5" />
          <rect x="256" y="620" width="26" height="34" opacity="0.55" />
          <rect x="400" y="620" width="26" height="34" opacity="0.6" />

          {/* Right wing */}
          <rect x="445" y="520" width="24" height="30" opacity="0.6" />
          <rect x="560" y="610" width="24" height="30" className="hero-window flicker" style={{ animationDelay: "3.4s" }} />
          <rect x="595" y="610" width="24" height="30" opacity="0.5" />
        </g>

        {/* Garage door */}
        <g fill="#050608" opacity="0.7">
          <rect x="540" y="700" width="70" height="100" rx="4" />
        </g>

        {/* Porch light glow at the entrance */}
        <circle cx="150" cy="700" r="24" fill="#f7c98f" opacity="0.28" filter="url(#windowGlow)" />

        {/* Stone wall foreground */}
        <g fill="#0a0c14" opacity="0.9">
          <path d="M 0 800 L 0 745 Q 160 715 320 738 Q 460 758 640 730 L 640 800 Z" />
        </g>
      </svg>
      <div className="hero-scrim" aria-hidden="true" />
    </>
  );
}
