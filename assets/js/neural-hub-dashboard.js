/**
 * Neural Hub Dashboard - Minimalist Version
 * Logo G Super Besar dengan Menu Overlay
 */

(function() {
  'use strict';

  // Initialize Neural Hub
  function initNeuralHub() {
    createNeuralDashboard();
    setupEventListeners();
  }

  // Create Neural Dashboard HTML - Minimalist dengan Animasi Super Keren
  function createNeuralDashboard() {
    const dashboard = document.getElementById('neural-dashboard-container');
    if (!dashboard) return;

    const isSuperAdmin = window.isSuperAdmin ? window.isSuperAdmin() : false;

    dashboard.innerHTML = `
      <div class="neural-dashboard neural-dashboard-minimal">
        <!-- Logo G Center - SUPER BESAR dengan Animasi Keren -->
        <div class="logo-g-center" id="logo-g-trigger" title="Klik untuk membuka menu">
          <!-- Outer Ring -->
          <div class="logo-g-ring-outer"></div>
          <!-- Ripple Effect -->
          <div class="logo-g-ripple"></div>
          <!-- Particles Container -->
          <div class="logo-g-particles" id="logo-particles"></div>
          <!-- Scan Line -->
          <div class="logo-g-scanline"></div>
          <!-- Logo Image -->
          <img src="/assets/images/garneta-logo-g.svg" alt="Garneta G" class="logo-g-image">
        </div>

        <!-- Smart Search Hub - Compact -->
        <div class="smart-search-hub">
          <div class="smart-search-container" id="smart-search-trigger">
            <div class="smart-search-input-wrapper">
              <span class="smart-search-icon">🔍</span>
              <input type="text" class="smart-search-input" placeholder="Cari barang, supplier, transaksi..." id="neural-search-input" autocomplete="off">
              <span class="smart-search-shortcut">⌘K</span>
            </div>
          </div>
        </div>

        <!-- Hint -->
        <p class="dashboard-hint">Klik logo untuk membuka menu</p>
      </div>

      <!-- Floating Menu Overlay -->
      <div class="menu-overlay" id="menu-overlay">
        <div class="menu-overlay-content">
          <img src="/assets/images/garneta-logo-g.svg" alt="Garneta G" class="menu-overlay-logo" id="menu-close-trigger">
          <div class="menu-grid">
            ${createMenuItem('barang', '📦', 'Barang')}
            ${createMenuItem('penjualan', '💵', 'Penjualan')}
            ${createMenuItem('supplier', '🏭', 'Supplier')}
            ${createMenuItem('pembelian', '🛒', 'Pembelian')}
            ${createMenuItem('kalkulator', '🧮', 'Kalkulator')}
            ${isSuperAdmin ? createMenuItem('laporan', '📈', 'Laporan') : ''}
            ${isSuperAdmin ? createMenuItem('statistik', '📊', 'Statistik') : ''}
            ${isSuperAdmin ? createMenuItem('audit', '📋', 'Audit') : ''}
            ${isSuperAdmin ? createMenuItem('users', '👤', 'Users') : ''}
            ${createMenuItem('settings', '⚙️', 'Setting')}
          </div>
          <span class="menu-close-hint">Klik logo untuk tutup</span>
        </div>
      </div>
    `;
  }

  // Create Menu Item HTML
  function createMenuItem(id, icon, label) {
    return `
      <div class="menu-item" data-route="${id}">
        <span class="menu-item-icon">${icon}</span>
        <span class="menu-item-label">${label}</span>
      </div>
    `;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Initialize particles
    createParticles();
    
    // Initialize gyroscope effect
    initGyroscope();

    // Logo G click - toggle menu
    const logoG = document.getElementById('logo-g-trigger');
    if (logoG) {
      logoG.addEventListener('click', toggleMenu);
    }

    // Menu close trigger
    const menuClose = document.getElementById('menu-close-trigger');
    if (menuClose) {
      menuClose.addEventListener('click', toggleMenu);
    }

    // Menu overlay click outside
    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      menuOverlay.addEventListener('click', (e) => {
        if (e.target === menuOverlay) {
          toggleMenu();
        }
      });
    }

    // Menu item clicks
    document.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.menu-item');
      if (menuItem) {
        const route = menuItem.dataset.route;
        if (route && window.state) {
          window.state.route = route;
          if (window.renderShell) window.renderShell();
          if (window.render) window.render();
          toggleMenu();
        }
      }
    });

    // Search input - Connect to existing Smart Search
    const searchInput = document.getElementById('neural-search-input');
    const searchContainer = document.getElementById('smart-search-trigger');
    
    if (searchContainer) {
      searchContainer.addEventListener('click', () => {
        // Focus on the actual Smart Search input if it exists
        const smartSearchInput = document.getElementById('smart-search-input');
        if (smartSearchInput) {
          smartSearchInput.focus();
          smartSearchInput.select();
        } else {
          // If Smart Search not initialized, initialize it
          if (window.initSmartSearch) {
            window.initSmartSearch();
            setTimeout(() => {
              const newSearchInput = document.getElementById('smart-search-input');
              if (newSearchInput) {
                newSearchInput.focus();
                newSearchInput.select();
              }
            }, 300);
          }
        }
      });
    }
    
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            // Try to use existing Smart Search
            if (window.initSmartSearch) {
              window.initSmartSearch();
              setTimeout(() => {
                const smartSearchInput = document.getElementById('smart-search-input');
                if (smartSearchInput) {
                  smartSearchInput.value = query;
                  smartSearchInput.focus();
                  // Trigger search
                  if (typeof performSearch === 'function') {
                    performSearch(query);
                  }
                }
              }, 300);
            }
          }
        }
      });
      
      // Also trigger on click
      searchInput.addEventListener('click', () => {
        if (window.initSmartSearch) {
          window.initSmartSearch();
          setTimeout(() => {
            const smartSearchInput = document.getElementById('smart-search-input');
            if (smartSearchInput) {
              smartSearchInput.focus();
              smartSearchInput.select();
            }
          }, 300);
        }
      });
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('neural-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }

      if (e.key === 'Escape') {
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay && menuOverlay.classList.contains('active')) {
          toggleMenu();
        }
      }
    });
  }

  // Toggle menu overlay
  function toggleMenu() {
    const menuOverlay = document.getElementById('menu-overlay');
    if (!menuOverlay) return;

    menuOverlay.classList.toggle('active');
  }

  // Create floating particles around logo
  function createParticles() {
    const container = document.getElementById('logo-particles');
    if (!container) return;

    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'logo-g-particle';
      
      // Random position around the logo
      const angle = (i / particleCount) * 360;
      const distance = 120 + Math.random() * 40;
      const tx = Math.cos(angle * Math.PI / 180) * distance;
      const ty = Math.sin(angle * Math.PI / 180) * distance;
      
      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.left = '50%';
      particle.style.top = '50%';
      particle.style.animationDelay = `${i * 0.4}s`;
      particle.style.animationDuration = `${4 + Math.random() * 2}s`;
      
      container.appendChild(particle);
    }
  }

  // Initialize gyroscope 3D effect
  function initGyroscope() {
    const logoG = document.getElementById('logo-g-trigger');
    const logoImage = logoG?.querySelector('.logo-g-image');
    if (!logoG || !logoImage) return;

    // Mouse move effect
    logoG.addEventListener('mousemove', (e) => {
      const rect = logoG.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      // Calculate rotation (limited to ±15 degrees)
      const rotateY = (mouseX / rect.width) * 30;
      const rotateX = -(mouseY / rect.height) * 30;
      
      logoImage.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    });

    // Reset on mouse leave
    logoG.addEventListener('mouseleave', () => {
      logoImage.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });

    // Touch device support
    logoG.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const rect = logoG.getBoundingClientRect();
        const touch = e.touches[0];
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const touchX = touch.clientX - centerX;
        const touchY = touch.clientY - centerY;
        
        const rotateY = (touchX / rect.width) * 20;
        const rotateX = -(touchY / rect.height) * 20;
        
        logoImage.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    });

    logoG.addEventListener('touchend', () => {
      logoImage.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
  }

  // Expose functions globally
  window.NeuralHub = {
    init: initNeuralHub,
    toggleMenu: toggleMenu,
    refresh: createNeuralDashboard
  };

  // Auto-initialize if container exists
  if (document.getElementById('neural-dashboard-container')) {
    initNeuralHub();
  }

})();
