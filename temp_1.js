
    // Initialize theme from localStorage
    (function() {
      const savedTheme = localStorage.getItem('garneta_theme') || 'neural';
      const themes = {
        neural: {
          '--neural-bg': '#0b1f24',
          '--neural-surface': '#102a31',
          '--neural-surface-2': '#142f38',
          '--neural-cyan': '#24f0c7',
          '--neural-cyan-glow': 'rgba(36, 240, 199, 0.4)',
          '--neural-mint': '#8df7df',
          '--neural-orange': '#ff7043',
          '--neural-text': '#e8fbff',
          '--neural-text-soft': '#8fb4bd',
          '--neural-glass': 'rgba(16, 42, 49, 0.85)',
          '--neural-glass-border': 'rgba(141, 247, 223, 0.2)'
        },
        cyber: {
          '--neural-bg': '#0a0a0f',
          '--neural-surface': '#12121a',
          '--neural-surface-2': '#1a1a25',
          '--neural-cyan': '#ff00ff',
          '--neural-cyan-glow': 'rgba(255, 0, 255, 0.4)',
          '--neural-mint': '#ff66ff',
          '--neural-orange': '#00ffff',
          '--neural-text': '#ffffff',
          '--neural-text-soft': '#a0a0b0',
          '--neural-glass': 'rgba(18, 18, 26, 0.9)',
          '--neural-glass-border': 'rgba(255, 0, 255, 0.3)'
        },
        dark: {
          '--neural-bg': '#0d0d0d',
          '--neural-surface': '#1a1a1a',
          '--neural-surface-2': '#262626',
          '--neural-cyan': '#60a5fa',
          '--neural-cyan-glow': 'rgba(96, 165, 250, 0.4)',
          '--neural-mint': '#93c5fd',
          '--neural-orange': '#f87171',
          '--neural-text': '#f5f5f5',
          '--neural-text-soft': '#a3a3a3',
          '--neural-glass': 'rgba(26, 26, 26, 0.9)',
          '--neural-glass-border': 'rgba(96, 165, 250, 0.2)'
        },
        ocean: {
          '--neural-bg': '#0c1a2d',
          '--neural-surface': '#132a47',
          '--neural-surface-2': '#1a3a5c',
          '--neural-cyan': '#00d4ff',
          '--neural-cyan-glow': 'rgba(0, 212, 255, 0.4)',
          '--neural-mint': '#7dd3fc',
          '--neural-orange': '#fbbf24',
          '--neural-text': '#e0f2fe',
          '--neural-text-soft': '#94a3b8',
          '--neural-glass': 'rgba(19, 42, 71, 0.9)',
          '--neural-glass-border': 'rgba(0, 212, 255, 0.25)'
        }
      };
      
      const theme = themes[savedTheme];
      if (theme) {
        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      }
    })();
  