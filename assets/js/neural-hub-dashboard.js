r/**
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

        <!-- Smart Search Hub - Compact dengan Dropdown -->
        <div class="smart-search-hub" id="smart-search-container">
          <div class="smart-search-container" id="smart-search-trigger">
            <div class="smart-search-input-wrapper">
              <span class="smart-search-icon">🔍</span>
              <input type="text" class="smart-search-input" placeholder="Cari barang, supplier, transaksi..." id="neural-search-input" autocomplete="off">
              <span class="smart-search-shortcut">⌘K</span>
            </div>
          </div>
          <!-- Search Results Dropdown -->
          <div id="neural-search-dropdown" class="neural-search-dropdown hidden">
            <div id="neural-search-results" class="neural-search-results"></div>
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
    
    // Initialize search
    initSearch();

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

    // Initialize Smart Search automatically if available
    if (window.initSmartSearch) {
      setTimeout(() => {
        window.initSmartSearch();
      }, 100);
    }

    // Search input - Connect to existing Smart Search (Fallback)
    const searchInput = document.getElementById('neural-search-input');
    const searchContainer = document.getElementById('smart-search-trigger');
    
    if (searchContainer) {
      searchContainer.addEventListener('click', () => {
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
      });
    }
    
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query && window.initSmartSearch) {
            window.initSmartSearch();
            setTimeout(() => {
              const smartSearchInput = document.getElementById('smart-search-input');
              if (smartSearchInput) {
                smartSearchInput.value = query;
                smartSearchInput.focus();
                if (typeof performSearch === 'function') {
                  performSearch(query);
                }
              }
            }, 300);
          }
        }
      });
      
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

  // Search Functions
  function initSearch() {
    const searchInput = document.getElementById('neural-search-input');
    const dropdown = document.getElementById('neural-search-dropdown');
    
    if (!searchInput) return;

    // Real-time search
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        closeSearchDropdown();
        return;
      }
      performNeuralSearch(query);
    });

    // Focus shows results if has query
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2) {
        performNeuralSearch(searchInput.value.trim());
      }
    });

    // Click outside closes dropdown
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.smart-search-hub')) {
        closeSearchDropdown();
      }
    });
  }

  function performNeuralSearch(query) {
    if (!window.state || !window.state.data) {
      console.log('Data not loaded yet');
      return;
    }

    const results = [];
    const data = window.state.data;
    const lowerQuery = query.toLowerCase();

    // Search products (Barang)
    if (data.products) {
      data.products.forEach((p) => {
        if ((p.name && p.name.toLowerCase().includes(lowerQuery)) ||
            (p.category && p.category.toLowerCase().includes(lowerQuery)) ||
            (p.barcode && p.barcode.toLowerCase().includes(lowerQuery))) {
          results.push({ type: 'barang', data: p });
        }
      });
    }

    // Search suppliers
    if (data.suppliers) {
      data.suppliers.forEach((s) => {
        if ((s.name && s.name.toLowerCase().includes(lowerQuery)) ||
            (s.phone && s.phone.toLowerCase().includes(lowerQuery))) {
          results.push({ type: 'supplier', data: s });
        }
      });
    }

    renderSearchResults(results.slice(0, 10), query);
    openSearchDropdown();
  }

  function renderSearchResults(results, query) {
    const container = document.getElementById('neural-search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `<div class="neural-search-empty"><span>🔍</span><p>Tidak ada hasil untuk "${escapeHtml(query)}"</p></div>`;
      return;
    }

    let html = '';
    const barangResults = results.filter((r) => r.type === 'barang');
    const supplierResults = results.filter((r) => r.type === 'supplier');

    if (barangResults.length > 0) {
      html += '<div class="neural-search-section"><div class="neural-search-section-title">📦 Barang</div>';
      barangResults.forEach((r) => {
        html += renderBarangResult(r.data);
      });
      html += '</div>';
    }

    if (supplierResults.length > 0) {
      html += '<div class="neural-search-section"><div class="neural-search-section-title">🏭 Supplier</div>';
      supplierResults.forEach((r) => {
        html += renderSupplierResult(r.data);
      });
      html += '</div>';
    }

    container.innerHTML = html;
    
    // Bind click events
    container.querySelectorAll('.neural-search-item').forEach((item) => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        const id = item.dataset.id;
        handleSearchResultClick(type, id);
      });
    });
  }

  function renderBarangResult(product) {
    const stockClass = (product.stock || 0) < 10 ? 'stock-low' : (product.stock || 0) < 50 ? 'stock-medium' : 'stock-high';
    
    return `
      <div class="neural-search-item" data-type="barang" data-id="${product.id}">
        <div class="neural-search-item-icon">📦</div>
        <div class="neural-search-item-info">
          <div class="neural-search-item-title">${escapeHtml(product.name)}</div>
          <div class="neural-search-item-meta">
            <span class="neural-search-item-category">${escapeHtml(product.category || 'Umum')}</span>
            <span class="neural-search-item-stock ${stockClass}">Stok: ${product.stock || 0}</span>
          </div>
        </div>
        <div class="neural-search-item-price">${formatRupiah(product.salePrice || 0)}</div>
      </div>
    `;
  }

  function renderSupplierResult(supplier) {
    return `
      <div class="neural-search-item" data-type="supplier" data-id="${supplier.id}">
        <div class="neural-search-item-icon">🏭</div>
        <div class="neural-search-item-info">
          <div class="neural-search-item-title">${escapeHtml(supplier.name)}</div>
          <div class="neural-search-item-meta">
            <span class="neural-search-item-phone">${escapeHtml(supplier.phone || '-')}</span>
          </div>
        </div>
      </div>
    `;
  }

  function handleSearchResultClick(type, id) {
    closeSearchDropdown();
    
    if (type === 'barang') {
      window.state.route = 'barang';
      if (window.renderShell) window.renderShell();
      if (window.render) window.render();
      setTimeout(() => {
        if (window.fillForm) window.fillForm('products', id);
      }, 100);
    } else if (type === 'supplier') {
      window.state.route = 'supplier';
      if (window.renderShell) window.renderShell();
      if (window.render) window.render();
      setTimeout(() => {
        if (window.fillForm) window.fillForm('suppliers', id);
      }, 100);
    }
  }

  function openSearchDropdown() {
    const dropdown = document.getElementById('neural-search-dropdown');
    if (dropdown) dropdown.classList.remove('hidden');
  }

  function closeSearchDropdown() {
    const dropdown = document.getElementById('neural-search-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      maximumFractionDigits: 0 
    }).format(Number(value || 0));
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
