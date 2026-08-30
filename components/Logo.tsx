export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="EcoPulse"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="64" height="64" rx="16" fill="#2c9b55" />
      <path d="M48 13C29 14 17 22 17 37c0 8 5 14 13 14 13 0 19-13 18-38Z" fill="#a8d96b" />
      <path
        d="M16 51c8-12 16-20 28-27"
        fill="none"
        stroke="#f5f1df"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}
