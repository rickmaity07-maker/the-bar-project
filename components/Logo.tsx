/*
  Brand mark: a porthole half full of water, echoing the hero where the wordmark
  sits on the waterline. Plain geometry only, drawn at 32px.
*/
export default function Logo({ tagline }: { tagline: string }) {
  return (
    <span className="flex items-center gap-3 text-foam">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
        <defs>
          <clipPath id="logo-porthole">
            <circle cx="16" cy="16" r="11" />
          </clipPath>
        </defs>
        <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <g clipPath="url(#logo-porthole)">
          <circle cx="16" cy="16" r="11" fill="currentColor" fillOpacity="0.08" />
          <circle cx="20" cy="13.5" r="3.6" className="fill-buoy" fillOpacity="0.55" />
          <path
            d="M4 17c2.7-2.4 5.3 2.4 8 0s5.3-2.4 8 0 5.3 2.4 8 0v12H4z"
            className="fill-buoy"
          />
        </g>
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="display wordmark text-[22px] tracking-[0.14em]">FATHOM</span>
        <span className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.34em] text-foam/60">
          {tagline}
        </span>
      </span>
    </span>
  );
}
