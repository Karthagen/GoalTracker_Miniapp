const paths = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  chart: <path d="M4 4v16h16M8 15v-4m5 4V7m5 8V4" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 2 2h3l1-3 3-1 2-3-2-2 1-3-2-3-3 1-2-2Z" />
      <circle cx="11.5" cy="11.5" r="3" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  up: <path d="M6 18 18 6M6 6h12v12" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  edit: <path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z" />,
  leaf: <path d="M20 3C8 2 2 8 5 15s16 5 15-12ZM4 21 15 10" />,
  flame: (
    <path d="M13 2c2 7-5 7-3 11 2-1 3-3 3-3 4 3 6 5 5 8-1 3-6 5-10 2C2 16 6 9 9 6c-1 4 1 5 1 5s4-4 3-9Z" />
  ),
  walk: (
    <>
      <circle cx="14" cy="4" r="2" />
      <path d="m7 22 4-7 3 3v4M4 12l5-1 3-4 3 5 5 1M11 9l-1 6" />
    </>
  ),
  book: (
    <path d="M12 5v16M3 4c4-1 7-1 9 1 2-2 5-2 9-1v15c-4-1-7-1-9 2-2-3-5-3-9-2Z" />
  ),
  water: (
    <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM8 15a4 4 0 0 0 4 4" />
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z" />,
  spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
  heart: (
    <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  star: <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" />,
  trophy: (
    <>
      <path d="M8 4h8v4c0 4-2 6-4 6s-4-2-4-6V4Zm4 10v4m-4 3h8M6 6H3v2c0 3 2 4 5 4m10-6h3v2c0 3-2 4-5 4" />
    </>
  ),
  dumbbell: (
    <path d="M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10M2 10v4m20-4v4" />
  ),
  brain: (
    <path d="M9.5 4A3 3 0 0 0 6 7a3 3 0 0 0-1 5 3 3 0 0 0 4.5 4v3M14.5 4A3 3 0 0 1 18 7a3 3 0 0 1 1 5 3 3 0 0 1-4.5 4v3M12 3v18M8 9h4m4 3h-4" />
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V4h8v3m-13 5h18m-11 0v2h4v-2" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="9" cy="6" rx="5" ry="2.5" />
      <path d="M4 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6m-10 4v4c0 1.4 2.2 2.5 5 2.5 1.1 0 2.1-.2 3-.5m2-6c3 0 6 1 6 2.5V17c0 1.4-2.2 2.5-5 2.5s-5-1.1-5-2.5v-.7" />
    </>
  ),
  home: (
    <path d="m3 11 9-8 9 8M5 9.5V21h14V9.5M9 21v-7h6v7" />
  ),
  music: (
    <path d="M9 18V5l10-2v13M9 8l10-2M6 21c1.7 0 3-1.1 3-2.5S7.7 16 6 16s-3 1.1-3 2.5S4.3 21 6 21Zm10-2c1.7 0 3-1.1 3-2.5S17.7 14 16 14s-3 1.1-3 2.5S14.3 19 16 19Z" />
  ),
  palette: (
    <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 6-6c0-3-4-5-9-5Z M7.5 9h.01M10 6h.01M15 6.5h.01M18 9h.01" />
  ),
  code: <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-2-13-4 16" />,
  camera: (
    <>
      <path d="M4 7h4l2-3h4l2 3h4v13H4Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  apple: (
    <path d="M12 7c-3-3-8-1-8 4 0 6 4 10 7 10 1 0 1.5-.5 2-.5s1 .5 2 .5c3 0 6-5 6-10 0-4-4-7-9-4Zm1-1c0-2 1-4 4-4 0 2-1 4-4 4Z" />
  ),
  bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7Z" />,
  shield: <path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  meditation: (
    <path d="M12 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 1v6m-5-3 5 3 5-3M4 20c2-4 5-5 8-2 3-3 6-2 8 2M8 14l-4 3m12-3 4 3" />
  ),
  bicycle: (
    <>
      <circle cx="6" cy="17" r="4" />
      <circle cx="18" cy="17" r="4" />
      <path d="m6 17 4-8h4l4 8m-12 0h8l-4-8-2-3m6 0h3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
};

export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.target}
    </svg>
  );
}
