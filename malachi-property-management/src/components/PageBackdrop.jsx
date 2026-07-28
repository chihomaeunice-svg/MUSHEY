// src/components/PageBackdrop.jsx
// A faint city/property skyline watermark behind every app page's content —
// the same motif as the login hero, toned down to a single-color tint,
// spanning the page width and fading out toward the left so it never
// fights page text or cards. Drifts very slowly for a bit of life; a
// couple of windows flicker, both disabled under prefers-reduced-motion.

export default function PageBackdrop() {
  return (
    <div className="page-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1400 600" preserveAspectRatio="xMaxYMax slice">
        <g className="page-backdrop-drift" fill="currentColor">
          {/* Skyline massing, varied heights, left to right */}
          <polygon points="0,600 0,360 60,360 60,300 100,265 140,300 140,360 200,360 200,600" />
          <polygon points="180,600 180,260 300,260 300,600" />
          <polygon points="280,600 280,400 350,340 420,400 420,600" />
          <polygon points="400,600 400,190 470,190 470,600" />
          <rect x="428" y="160" width="14" height="35" />
          <polygon points="460,600 460,320 560,320 560,600" />
          <polygon points="540,600 540,420 610,360 680,420 680,600" />
          <polygon points="660,600 660,240 760,240 760,600" />
          <polygon points="740,600 740,380 850,380 850,600" />
          <polygon points="820,600 820,300 890,240 960,300 960,600" />
          <polygon points="940,600 940,410 1050,410 1050,600" />
          <polygon points="1030,600 1030,270 1130,270 1130,600" />
          <polygon points="1110,600 1110,360 1220,360 1220,600" />
          <polygon points="1200,600 1200,300 1270,240 1340,300 1340,600" />
          <polygon points="1320,600 1320,420 1400,420 1400,600" />

          {/* Arched feature window echoing the login hero */}
          <path d="M 585 290 A 25 25 0 0 1 635 290 L 635 320 L 585 320 Z" />

          {/* Windows */}
          <rect x="220" y="300" width="20" height="26" />
          <rect x="260" y="300" width="20" height="26" />
          <rect x="220" y="350" width="20" height="26" />
          <rect x="260" y="350" width="20" height="26" />
          <rect x="680" y="260" width="20" height="26" />
          <rect x="720" y="260" width="20" height="26" className="page-backdrop-flicker" style={{ animationDelay: "0.6s" }} />
          <rect x="680" y="310" width="20" height="26" />
          <rect x="960" y="320" width="20" height="26" />
          <rect x="1000" y="320" width="20" height="26" />
          <rect x="960" y="370" width="20" height="26" className="page-backdrop-flicker" style={{ animationDelay: "2.4s" }} />
          <rect x="1150" y="290" width="20" height="26" />
        </g>
      </svg>
    </div>
  );
}
