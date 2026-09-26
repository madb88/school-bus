type WeekendBusIllustrationProps = {
  className?: string;
};

/**
 * Pastel weekend bus — no frame/sky fill so it blends into the page background.
 */
export function WeekendBusIllustration({
  className,
}: WeekendBusIllustrationProps) {
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
      className={className}
    >
      {/* Soft clouds — very low contrast so they don’t read as a framed artboard */}
      <ellipse
        cx="78"
        cy="48"
        rx="42"
        ry="16"
        className="fill-[#c9dced]/55 dark:fill-[#2a3d55]/45"
      />
      <ellipse
        cx="348"
        cy="40"
        rx="36"
        ry="14"
        className="fill-[#c9dced]/45 dark:fill-[#2a3d55]/35"
      />

      {/* Distant hills — soft mounds, not a full-bleed panel */}
      <path
        d="M20 200C70 168 120 176 170 186C230 198 280 164 340 174C380 180 400 192 420 200V250C380 242 340 238 300 242C240 248 190 268 130 262C80 258 40 248 0 252V210C8 206 14 204 20 200Z"
        className="fill-[#c5daf0]/50 dark:fill-[#1e334c]/55"
      />
      <path
        d="M0 228C50 206 100 214 150 224C210 238 260 210 320 220C360 226 395 238 420 246V268C380 258 340 254 300 258C240 264 190 282 130 276C80 272 40 262 0 266V228Z"
        className="fill-[#b4cee8]/45 dark:fill-[#243a52]/50"
      />

      {/* Ground line */}
      <path
        d="M48 262H372"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-[#9bbdd8]/70 dark:stroke-[#3a5674]/70"
      />

      {/* Bushes */}
      <ellipse
        cx="72"
        cy="254"
        rx="18"
        ry="12"
        className="fill-[#c5e4d6]/80 dark:fill-[#2a4a4a]/75"
      />
      <ellipse
        cx="96"
        cy="258"
        rx="14"
        ry="10"
        className="fill-[#d2ebe0]/75 dark:fill-[#345656]/70"
      />
      <ellipse
        cx="330"
        cy="256"
        rx="16"
        ry="11"
        className="fill-[#c5e4d6]/80 dark:fill-[#2a4a4a]/75"
      />
      <ellipse
        cx="352"
        cy="260"
        rx="12"
        ry="9"
        className="fill-[#d2ebe0]/75 dark:fill-[#345656]/70"
      />

      {/* Tiny plants */}
      <path
        d="M58 254c0-10 6-16 6-16s6 6 6 16"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-[#a8d4bf]/80 dark:stroke-[#3d6460]/75"
      />
      <path
        d="M362 258c0-9 5-14 5-14s5 5 5 14"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-[#a8d4bf]/80 dark:stroke-[#3d6460]/75"
      />

      {/* Zzz */}
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-[#7aa8c9]/55 dark:stroke-[#4a6478]/70"
      >
        <path d="M168 62h18L172 78h16" strokeWidth="4.5" />
        <path d="M204 38h24L208 60h22" strokeWidth="5.5" />
        <path d="M248 12h30L252 40h28" strokeWidth="6.5" />
      </g>

      {/* Bus */}
      <rect
        x="88"
        y="108"
        width="244"
        height="132"
        rx="28"
        className="fill-[#F07820]"
      />
      <rect
        x="88"
        y="200"
        width="244"
        height="40"
        className="fill-[#B05818]"
      />
      <rect
        x="112"
        y="130"
        width="48"
        height="44"
        rx="10"
        className="fill-[#C9E4F8] dark:fill-[#2a3d55]"
      />
      <rect
        x="186"
        y="130"
        width="48"
        height="44"
        rx="10"
        className="fill-[#C9E4F8] dark:fill-[#2a3d55]"
      />
      <rect
        x="260"
        y="130"
        width="48"
        height="44"
        rx="10"
        className="fill-[#C9E4F8] dark:fill-[#2a3d55]"
      />
      <circle cx="148" cy="258" r="22" className="fill-[#381808] dark:fill-[#1a0c04]" />
      <circle cx="148" cy="258" r="8" className="fill-[#C9D6E6] dark:fill-[#9eb0c4]" />
      <circle cx="272" cy="258" r="22" className="fill-[#381808] dark:fill-[#1a0c04]" />
      <circle cx="272" cy="258" r="8" className="fill-[#C9D6E6] dark:fill-[#9eb0c4]" />
    </svg>
  );
}
