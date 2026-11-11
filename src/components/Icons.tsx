// Ícones em traço contínuo, peso próximo ao SF Symbols "semibold".
type P = React.SVGProps<SVGSVGElement>
const base = { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4.9v14.2a1.1 1.1 0 0 0 1.68.94l11.1-7.1a1.1 1.1 0 0 0 0-1.88L8.68 3.96A1.1 1.1 0 0 0 7 4.9Z" fill="currentColor" />
  </svg>
)

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const InfoIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 11v5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7.8" r="1.25" fill="currentColor" />
  </svg>
)

export const ChevronRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ChevronLeft = (p: P) => (
  <svg {...base} {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" strokeWidth="2" />
    <path d="m15.2 15.2 4.6 4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export const StarIcon = (p: P) => (
  <svg {...base} {...p}>
    <path
      d="m12 3.6 2.47 5.25 5.73.7-4.22 3.95 1.08 5.68L12 16.4l-5.06 2.78 1.08-5.68L3.8 9.55l5.73-.7L12 3.6Z"
      fill="currentColor"
    />
  </svg>
)

export const FilmIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.9" />
    <path d="M3.5 9.5h17M3.5 14.5h17M8 5v14M16 5v14" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
  </svg>
)

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 10.6 12 4.5l7.5 6.1V19a1 1 0 0 1-1 1h-4v-5.5h-5V20h-4a1 1 0 0 1-1-1v-8.4Z" fill="currentColor" />
  </svg>
)

export const StackIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="8" width="16" height="12" rx="2.6" fill="currentColor" />
    <path d="M6.5 5.5h11M8.5 3h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
  </svg>
)

export const TrailerIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
    <path d="m16 10.4 4.1-2.5a.6.6 0 0 1 .9.5v7.2a.6.6 0 0 1-.9.5L16 13.6" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
)

export const ExternalIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------- Player ---------- */

export const PauseIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.3" fill="currentColor" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" fill="currentColor" />
  </svg>
)

/** Seta circular com o número de segundos no meio (voltar/avançar). */
export const SkipIcon = ({ dir, seconds, ...p }: P & { dir: 'back' | 'fwd'; seconds: number }) => (
  <svg {...base} {...p}>
    <g transform={dir === 'fwd' ? 'translate(24 0) scale(-1 1)' : undefined}>
      <path d="M12 4.2a8 8 0 1 1-7.4 4.95" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M12.6 1.6 9.4 4.3l3.2 2.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <text x="12" y="15.6" textAnchor="middle" fontSize="7.4" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">
      {seconds}
    </text>
  </svg>
)

export const SubtitlesIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6.5L8 21v-3.5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M7.5 10h5M14.5 10h2M7.5 13.3h2.2M11.7 13.3h4.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
)

export const GaugeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.2 17.5a8.5 8.5 0 1 1 15.6 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="m12 13.5 4-4.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="12" cy="13.6" r="1.6" fill="currentColor" />
  </svg>
)

export const QualityIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.9" />
    <path d="M7.3 9.5v5M10.3 9.5v5M7.3 12h3M13.2 9.5v5h1.6a2.5 2.5 0 0 0 0-5h-1.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const VolumeIcon = ({ level, ...p }: P & { level: number }) => (
  <svg {...base} {...p}>
    <path d="M4 9.3h3.2L12 5.2v13.6l-4.8-4.1H4a1 1 0 0 1-1-1v-3.4a1 1 0 0 1 1-1Z" fill="currentColor" />
    {level === 0 ? (
      <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    ) : (
      <>
        <path d="M15.3 9.2a4 4 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        {level > 0.5 && <path d="M17.9 6.6a7.6 7.6 0 0 1 0 10.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />}
      </>
    )}
  </svg>
)

export const PipIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.6" stroke="currentColor" strokeWidth="1.9" />
    <rect x="11.5" y="11" width="7" height="5.5" rx="1.2" fill="currentColor" />
  </svg>
)

export const FullscreenIcon = ({ exit, ...p }: P & { exit?: boolean }) => (
  <svg {...base} {...p}>
    {exit ? (
      <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M15 4v3.5A1.5 1.5 0 0 0 16.5 9H20M9 20v-3.5A1.5 1.5 0 0 0 7.5 15H4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    )}
  </svg>
)

export const ReplayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6.3 2.8v4.4h4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------- Landing ---------- */

export const TvIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="2.8" y="4.5" width="18.4" height="12.5" rx="2.4" stroke="currentColor" strokeWidth="1.9" />
    <path d="M8.5 20h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const PhoneIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6.5" y="2.8" width="11" height="18.4" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
    <path d="M10.6 18h2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
)

export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v11m0 0-4.2-4.2M12 15l4.2-4.2M5 19.5h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const HdrIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.2 13.9 9l5.9 1.1-4.6 3.8 1.2 5.9L12 16.9l-4.4 2.9 1.2-5.9-4.6-3.8L10.1 9 12 3.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
)

export const SpeakerIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5.5" y="2.8" width="13" height="18.4" rx="3" stroke="currentColor" strokeWidth="1.9" />
    <circle cx="12" cy="14.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="7.2" r="1.2" fill="currentColor" />
  </svg>
)

export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M17.8 2.9v4.3h-4.3M6.2 21.1v-4.3h4.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const RemoteIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="5" stroke="currentColor" strokeWidth="1.9" />
    <circle cx="12" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10.2 14.2h3.6M10.2 17.2h3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

export const ResumeIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.9" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
