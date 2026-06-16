import { API_BASE_URL } from "../../assets/js/api.js";

// Theme definitions
const themes = {
  neural: {
    name: 'Neural Hub',
    description: 'Tema default dengan aksen cyan',
    colors: {
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
    }
  },
  cyber: {
    name: 'Cyber Dashboard',
    description: 'Tema futuristik dengan aksen magenta',
    colors: {
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
    }
  },
  dark: {
    name: 'Dark Minimal',
    description: 'Tema gelap minimalis',
    colors: {
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
    }
  },
  ocean: {
    name: 'Ocean Deep',
    description: 'Tema biru laut yang tenang',
    colors: {
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
  }
};

export function render() {
  const currentTheme = localStorage.getItem('garneta_theme') || 'neural';
  
  return `
    <section class="space-y-6">
      <h2 class="text-xl font-bold">⚙️ Settings</h2>
      
      <!-- Theme Settings -->
      <div class="module-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🎨</span>
          <div>
            <h3 class="text-lg font-bold">Tema Dashboard</h3>
            <p class="text-sm text-gray-400">Pilih tema yang sesuai dengan preferensi Anda</p>
          </div>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          ${Object.entries(themes).map(([key, theme]) => `
            <div class="theme-option ${currentTheme === key ? 'active' : ''}" data-theme="${key}">
              <div class="theme-preview" style="background: ${theme.colors['--neural-bg']}; border-color: ${theme.colors['--neural-cyan']}">
                <div class="theme-preview-accent" style="background: ${theme.colors['--neural-cyan']}"></div>
                <div class="theme-preview-surface" style="background: ${theme.colors['--neural-surface']}"></div>
              </div>
              <div class="theme-info">
                <span class="theme-name font-semibold">${theme.name}</span>
                <span class="theme-desc text-xs text-gray-400">${theme.description}</span>
              </div>
              ${currentTheme === key ? '<span class="theme-check">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- General Settings -->
      <div class="module-card p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">⚡</span>
          <div>
            <h3 class="text-lg font-bold">Pengaturan Umum</h3>
            <p class="text-sm text-gray-400">Konfigurasi dasar aplikasi</p>
          </div>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          <label class="block">
            <span class="text-sm font-semibold">Nama Toko</span>
            <input class="input-field mt-1" value="Toko Grosir Sembako" />
          </label>
          <label class="block">
            <span class="text-sm font-semibold">Minimum Stock Default</span>
            <input type="number" class="input-field mt-1" value="10" />
          </label>
          <label class="block md:col-span-2">
            <span class="text-sm font-semibold">Base URL API</span>
            <input id="api-base-url" class="input-field mt-1" value="${API_BASE_URL}" />
          </label>
        </div>
        <div class="mt-4 flex justify-end">
          <button id="save-settings" class="btn-gradient rounded-md px-4 py-2 text-sm font-semibold">Simpan Settings</button>
        </div>
      </div>
    </section>
  `;
}

export function afterRender() {
  // Theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const themeKey = option.dataset.theme;
      applyTheme(themeKey);
      
      // Update UI
      document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        opt.querySelector('.theme-check')?.remove();
      });
      option.classList.add('active');
      option.insertAdjacentHTML('beforeend', '<span class="theme-check">✓</span>');
    });
  });
  
  // Save general settings
  document.querySelector("#save-settings")?.addEventListener("click", () => {
    const apiUrl = document.querySelector("#api-base-url")?.value?.trim();
    if (!apiUrl) return;

    localStorage.setItem("retail_inventory_api_base_url", apiUrl);
    alert("Settings tersimpan. Halaman akan dimuat ulang.");
    location.reload();
  });
}

// Apply theme to document
function applyTheme(themeKey) {
  const theme = themes[themeKey];
  if (!theme) return;
  
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  localStorage.setItem('garneta_theme', themeKey);
}

// Initialize theme on load
export function initTheme() {
  const savedTheme = localStorage.getItem('garneta_theme') || 'neural';
  applyTheme(savedTheme);
}
