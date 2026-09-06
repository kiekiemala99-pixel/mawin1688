export function LineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="3" width="20" height="18" rx="6" fill="currentColor" />
      <path
        d="M7.2 10.2c0-2.1 2.1-3.7 4.8-3.7s4.8 1.6 4.8 3.7-2.1 3.7-4.8 3.7c-.4 0-.8 0-1.2-.1l-2.4 1.4.4-1.8c-.9-.7-1.6-1.7-1.6-3.2z"
        fill="#fff"
      />
    </svg>
  );
}

export function ThaiFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" className={className} aria-hidden>
      <rect width="36" height="24" rx="3" fill="#A51931" />
      <rect y="4" width="36" height="16" fill="#F4F5F8" />
      <rect y="8" width="36" height="8" fill="#2D2A4A" />
    </svg>
  );
}

export function DiamondMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.5 21 9.2 12 21.5 3 9.2 12 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3.4 9.2h17.2M12 2.5 8.2 9.2 12 21.5 15.8 9.2 12 2.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
