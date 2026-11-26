type LogoSize = "sm" | "md" | "lg"

interface KamyLogoProps {
  dark?: boolean
  size?: LogoSize
  compact?: boolean
}

export function KamyLogo({ dark = false, size = "md", compact = false }: KamyLogoProps) {
  const fg = dark ? "var(--background)" : "var(--primary)"
  const au = dark ? "#e8c878" : "var(--accent)"
  const h = { sm: 24, md: 32, lg: 46 }[size]
  const sw = Math.max(1.3, h * 0.053)

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
        lineHeight: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <span
          style={{
            fontFamily: "var(--font-cormorant), Georgia, serif",
            fontSize: h,
            fontWeight: 600,
            color: fg,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          kam
        </span>
        {/* Custom SVG 'y' — arms form a ∪ shape, reads as 'u' in "kami"/"kamu" */}
        <svg
          viewBox="0 0 22 34"
          width={h * 0.62}
          height={h * 1.08}
          style={{
            display: "block",
            marginBottom: -(h * 0.074),
            overflow: "visible",
          }}
        >
          <path
            d="M 3 7 C 4 11.5 7.5 17.5 9.2 20.5 Q 11 23.5 12.8 20.5 C 14.5 17.5 18 11.5 19 7"
            stroke={fg}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 11 22 L 11 32"
            stroke={fg}
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {!compact && (
        <span
          style={{
            fontFamily: "var(--font-jakarta), sans-serif",
            fontSize: Math.max(9, h * 0.33),
            fontWeight: 500,
            color: au,
            letterSpacing: "0.22em",
            textTransform: "lowercase",
            paddingLeft: 1,
            lineHeight: 1,
          }}
        >
          jemput
        </span>
      )}
    </div>
  )
}
