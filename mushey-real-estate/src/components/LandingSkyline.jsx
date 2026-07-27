// src/components/LandingSkyline.jsx
// Decorative building silhouettes for the homepage hero — tinted with the
// current theme's own colors (currentColor) so it blends with the warm
// gradient wash instead of reintroducing a fixed dark scene. Drifts
// slowly and a couple of windows flicker for a bit of life.

export default function LandingSkyline() {
  return (
    <svg
      className="landing-skyline"
      viewBox="0 0 1400 500"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <g className="landing-skyline-drift" fill="currentColor">
        <polygon points="0,500 0,300 60,300 60,250 100,220 140,250 140,300 200,300 200,500" />
        <polygon points="180,500 180,220 300,220 300,500" />
        <polygon points="280,500 280,340 350,290 420,340 420,500" />
        <polygon points="400,500 400,160 470,160 470,500" />
        <polygon points="460,500 460,270 560,270 560,500" />
        <polygon points="540,500 540,360 610,310 680,360 680,500" />
        <polygon points="660,500 660,200 760,200 760,500" />
        <polygon points="740,500 740,320 850,320 850,500" />
        <polygon points="820,500 820,250 890,200 960,250 960,500" />
        <polygon points="940,500 940,350 1050,350 1050,500" />
        <polygon points="1030,500 1030,230 1130,230 1130,500" />
        <polygon points="1110,500 1110,300 1220,300 1220,500" />
        <polygon points="1200,500 1200,250 1270,200 1340,250 1340,500" />
        <polygon points="1320,500 1320,360 1400,360 1400,500" />

        <g className="landing-skyline-window">
          <rect x="220" y="260" width="18" height="24" />
          <rect x="260" y="260" width="18" height="24" />
          <rect x="680" y="220" width="18" height="24" className="landing-skyline-flicker" style={{ animationDelay: "0.5s" }} />
          <rect x="720" y="220" width="18" height="24" />
          <rect x="960" y="280" width="18" height="24" />
          <rect x="1150" y="250" width="18" height="24" className="landing-skyline-flicker" style={{ animationDelay: "2.6s" }} />
        </g>
      </g>
    </svg>
  );
}
