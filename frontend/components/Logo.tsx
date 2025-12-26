import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 120, showText = true, style }) => {
  const iconSize = size;
  const textSize = size * 0.35;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      {/* Logo Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 120 120"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      >
        {/* Drop shadow */}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="1" dy="1" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Camera body (rounded rectangle) */}
        <rect
          x="25"
          y="20"
          width="70"
          height="55"
          rx="8"
          fill="#1a365d"
        />
        
        {/* Raised top section of camera */}
        <rect
          x="30"
          y="25"
          width="60"
          height="8"
          rx="4"
          fill="#1a365d"
        />
        
        {/* White circular dot (flash/indicator) */}
        <circle cx="85" cy="29" r="3" fill="#FFFFFF" />
        
        {/* Location pin - rectangular body that tapers to point */}
        <rect
          x="50"
          y="75"
          width="20"
          height="18"
          fill="#1a365d"
        />
        {/* Tapered point of location pin */}
        <polygon
          points="60,93 50,105 70,105"
          fill="#1a365d"
        />
        
        {/* Colorful camera aperture in center */}
        <g transform="translate(60, 60)">
          {/* Outer dark blue circle */}
          <circle cx="0" cy="0" r="18" fill="#1a365d" />
          {/* White border */}
          <circle cx="0" cy="0" r="15" fill="#FFFFFF" />
          
          {/* Aperture blades with colors */}
          <g transform="rotate(0)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#FF0000" />
          </g>
          <g transform="rotate(40)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#FF8800" />
          </g>
          <g transform="rotate(80)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#FFDD00" />
          </g>
          <g transform="rotate(120)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#88FF00" />
          </g>
          <g transform="rotate(160)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#00FF00" />
          </g>
          <g transform="rotate(200)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#00FF88" />
          </g>
          <g transform="rotate(240)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#0088FF" />
          </g>
          <g transform="rotate(280)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#0000FF" />
          </g>
          <g transform="rotate(320)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#8800FF" />
          </g>
          <g transform="rotate(360)">
            <path d="M 0 0 L 8 -8 L 15 0 Z" fill="#FF00FF" />
          </g>
        </g>
      </svg>
      
      {/* Text */}
      {showText && (
        <div style={{ 
          marginTop: '10px',
          fontSize: `${textSize}px`,
          fontWeight: '600',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '0.5px'
        }}>
          <span style={{ color: '#1a365d' }}>Event</span>
          <span style={{ color: '#FF6B35' }}>Grapher</span>
        </div>
      )}
    </div>
  );
};

export default Logo;

