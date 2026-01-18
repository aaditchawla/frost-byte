export function SnowflakeMapsLogo() {
  return (
    <div className="flex items-center justify-center">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer shadow circle */}
        <circle cx="100" cy="100" r="85" fill="#E8EAED" opacity="0.5" />
        {/* Main background circle */}
        <circle cx="100" cy="100" r="75" fill="white" />
        {/* Snowflake design in light blue */}
        {/* Center circle - Light Blue */}
        <circle cx="100" cy="100" r="12" fill="#7EC8E3" />
        {/* Main spikes (4 cardinal directions) */}
        {/* Top spike */}
        <path
          d="M100 100 L100 35 L95 45 M100 35 L105 45"
          stroke="#7EC8E3"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Right spike */}
        <path
          d="M100 100 L165 100 L155 95 M165 100 L155 105"
          stroke="#7EC8E3"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom spike */}
        <path
          d="M100 100 L100 165 L95 155 M100 165 L105 155"
          stroke="#7EC8E3"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Left spike */}
        <path
          d="M100 100 L35 100 L45 95 M35 100 L45 105"
          stroke="#7EC8E3"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Diagonal spikes */}
        {/* Top-right */}
        <path
          d="M100 100 L146 54 L140 60 M146 54 L138 58"
          stroke="#7EC8E3"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom-right */}
        <path
          d="M100 100 L146 146 L138 142 M146 146 L140 140"
          stroke="#7EC8E3"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bottom-left */}
        <path
          d="M100 100 L54 146 L60 140 M54 146 L58 138"
          stroke="#7EC8E3"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Top-left */}
        <path
          d="M100 100 L54 54 L58 62 M54 54 L60 60"
          stroke="#7EC8E3"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner decorative elements */}
        {/* Small circles at main spike ends */}
        <circle cx="100" cy="35" r="5" fill="#7EC8E3" />
        <circle cx="165" cy="100" r="5" fill="#7EC8E3" />
        <circle cx="100" cy="165" r="5" fill="#7EC8E3" />
        <circle cx="35" cy="100" r="5" fill="#7EC8E3" />
        {/* Small circles at diagonal spike ends */}
        <circle cx="146" cy="54" r="4" fill="#7EC8E3" />
        <circle cx="146" cy="146" r="4" fill="#7EC8E3" />
        <circle cx="54" cy="146" r="4" fill="#7EC8E3" />
        <circle cx="54" cy="54" r="4" fill="#7EC8E3" />
        {/* Additional decorative snowflake details */}
        {/* Small branches on cardinal spikes */}
        <path
          d="M100 60 L95 65 M100 60 L105 65"
          stroke="#7EC8E3"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M140 100 L135 95 M140 100 L135 105"
          stroke="#7EC8E3"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M100 140 L95 135 M100 140 L105 135"
          stroke="#7EC8E3"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M60 100 L65 95 M60 100 L65 105"
          stroke="#7EC8E3"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
export default SnowflakeMapsLogo;
