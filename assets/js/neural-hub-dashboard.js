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

  // Create Neural Dashboard HTML - Minimalist
  function createNeuralDashboard() {
    const dashboard = document.getElementById('neural-dashboard-container');
    if (!dashboard) return;

    const isSuperAdmin = window.isSuperAdmin ? window.isSuperAdmin() : false;

    dashboard.innerHTML = `
      <div class="neural-dashboard neural-dashboard-minimal">
        <!-- Logo G Center - SUPER BESAR -->
        <div class="logo-g-center" id="logo-g-trigger" title="Klik untuk membuka menu">
          <img src="/assets/images/garneta-logo-g.svg" alt="Garneta G" class="logo-g-image">
        </div>

        <!-- Smart Search Hub - Compact -->
        <div class="smart-search-hub">
          <div class="smart-search-container">
            <div class="smart-search-input-wrapper">
              <span class="smart-search-icon">🔍</span>
              <input type="text" class="smart-search-input" placeholder="Cari barang, supplier, transaksi..." id="neural-search-input">
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

    // Search input
    const searchInput = document.getElementById('neural-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query && window.performSearch) {
            window.performSearch(query);
          }
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
