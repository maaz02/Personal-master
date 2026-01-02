export function WaveBackground() {
  return (
    <div className="wave-container">
      <svg
        className="wave"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,117.3C672,117,768,171,864,197.3C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave-gradient-1)"
        />
        <defs>
          <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsla(217, 91%, 60%, 0.15)" />
            <stop offset="50%" stopColor="hsla(199, 89%, 48%, 0.2)" />
            <stop offset="100%" stopColor="hsla(217, 91%, 60%, 0.15)" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className="wave"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,106.7C672,117,768,171,864,181.3C960,192,1056,160,1152,138.7C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave-gradient-2)"
        />
        <defs>
          <linearGradient id="wave-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsla(199, 89%, 48%, 0.1)" />
            <stop offset="50%" stopColor="hsla(217, 91%, 60%, 0.15)" />
            <stop offset="100%" stopColor="hsla(199, 89%, 48%, 0.1)" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className="wave"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,213.3C672,203,768,149,864,138.7C960,128,1056,160,1152,176C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          fill="url(#wave-gradient-3)"
        />
        <defs>
          <linearGradient id="wave-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsla(217, 91%, 60%, 0.08)" />
            <stop offset="50%" stopColor="hsla(199, 89%, 48%, 0.12)" />
            <stop offset="100%" stopColor="hsla(217, 91%, 60%, 0.08)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
