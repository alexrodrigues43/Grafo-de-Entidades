import React from 'react';

interface SemanticoLogoProps {
  variant?: 'black' | 'white';
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SemanticoLogo: React.FC<SemanticoLogoProps> = ({
  variant = 'black',
  className = '',
  showTagline = true,
  size = 'md'
}) => {
  const isWhite = variant === 'white';
  const textColor = isWhite ? '#ffffff' : '#000000';
  const strokeColor = isWhite ? '#ffffff' : '#000000';
  const centerFill = isWhite ? '#302c33' : '#ffffff';
  const yellowColor = '#fdd910';
  const taglineTextColor = '#1a181c';

  const sizeClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16'
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 440 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses[size]} w-auto object-contain transition-transform`}
        aria-label="Semântico - Significado e Sentido"
      >
        {/* Node Graph Icon on the Left */}
        <g id="graph-network-icon">
          {/* Edges */}
          <line x1="30" y1="36" x2="68" y2="76" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
          <line x1="102" y1="42" x2="72" y2="76" stroke={strokeColor} strokeWidth="5.5" strokeLinecap="round" />
          <line x1="36" y1="114" x2="66" y2="82" stroke={strokeColor} strokeWidth="5.5" strokeLinecap="round" />
          <line x1="68" y1="84" x2="70" y2="128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />

          {/* Top-Left Accent Node (Yellow) */}
          <circle cx="30" cy="36" r="14" fill={yellowColor} stroke={strokeColor} strokeWidth="5.5" />

          {/* Top-Right Secondary Node */}
          <circle cx="104" cy="42" r="8" fill={centerFill} stroke={strokeColor} strokeWidth="5" />

          {/* Bottom-Left Node */}
          <circle cx="36" cy="114" r="9" fill={centerFill} stroke={strokeColor} strokeWidth="5" />

          {/* Bottom Node */}
          <circle cx="70" cy="130" r="12" fill={centerFill} stroke={strokeColor} strokeWidth="5.5" />

          {/* Central Main Hub Node */}
          <circle cx="68" cy="78" r="18" fill={centerFill} stroke={strokeColor} strokeWidth="6" />
        </g>

        {/* Brand Text "Semântico" */}
        <g id="brand-text">
          <text
            x="126"
            y="94"
            fill={textColor}
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
            fontWeight="900"
            fontSize="62"
            letterSpacing="-0.03em"
          >
            Semântico
          </text>
        </g>

        {/* Yellow Tagline Banner "Significado e Sentido" */}
        {showTagline && (
          <g id="tagline-banner">
            <rect
              x="124"
              y="108"
              width="310"
              height="36"
              fill={yellowColor}
              rx="2"
            />
            <text
              x="279"
              y="132"
              fill={taglineTextColor}
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
              fontWeight="600"
              fontSize="19"
              letterSpacing="0.22em"
              textAnchor="middle"
            >
              Significado e Sentido
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export const SemanticoIcon: React.FC<{
  size?: number;
  className?: string;
  variant?: 'black' | 'white';
}> = ({ size = 36, className = '', variant = 'black' }) => {
  const isWhite = variant === 'white';
  const strokeColor = isWhite ? '#ffffff' : '#000000';
  const centerFill = isWhite ? '#302c33' : '#ffffff';
  const yellowColor = '#fdd910';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line x1="30" y1="36" x2="68" y2="76" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
      <line x1="102" y1="42" x2="72" y2="76" stroke={strokeColor} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="36" y1="114" x2="66" y2="82" stroke={strokeColor} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="68" y1="84" x2="70" y2="128" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />

      {/* Top-Left Yellow Accent Node */}
      <circle cx="30" cy="36" r="14" fill={yellowColor} stroke={strokeColor} strokeWidth="5.5" />
      <circle cx="104" cy="42" r="8" fill={centerFill} stroke={strokeColor} strokeWidth="5" />
      <circle cx="36" cy="114" r="9" fill={centerFill} stroke={strokeColor} strokeWidth="5" />
      <circle cx="70" cy="130" r="12" fill={centerFill} stroke={strokeColor} strokeWidth="5.5" />
      <circle cx="68" cy="78" r="18" fill={centerFill} stroke={strokeColor} strokeWidth="6" />
    </svg>
  );
};
