/**
 * Neural Hub Dashboard - Garneta System Control Center
 * Hub and Spoke Architecture with Collapsible Sidebar
 */

(function() {
  'use strict';

  // Neural Hub State
  const neuralHubState = {
    menuOpen: false,
    activeNode: null,
    connections: []
  };

  // Module definitions with layers
  const modules = {
    core: [
      { id: 'barang', icon: '📦', label: 'Barang', badge: 'products' },
      { id: 'penjualan', icon: '💵', label: 'Penjualan', badge: 'todaySales' },
      { id: 'supplier', icon: '🏭', label: 'Supplier', badge: 'suppliers' }
    ],
    business: [
      { id: 'pembelian', icon: '🛒', label: 'Pembelian', super: true },
      { id: 'kalkulator', icon: '🧮', label: 'Kalkulator', super: true },
      { id: 'statistik', icon: '📊', label: 'Statistik', super: true },
      { id: 'laporan', icon: '📑', label: 'Laporan', super: true }
    ],
    system: [
      { id: 'users', icon: '👤', label: 'Users', super: true },
      { id: 'audit', icon: '📋', label: 'Audit', super: true },
      { id: 'settings', icon: '⚙️', label: 'Setting', super: true }
    ]
  };

  // Initialize Neural Hub
  function initNeuralHub() {
    createNeuralDashboard();
    setupEventListeners();
    animateNodes();
  }

  // Create Neural Dashboard HTML
  function createNeuralDashboard() {
    const dashboard = document.getElementById('neural-dashboard-container');
    if (!dashboard) return;

    const isSuperAdmin = window.isSuperAdmin ? window.isSuperAdmin() : false;
    const data = window.state?.data || {};

    dashboard.innerHTML = `
      <div class="neural-dashboard">
        <!-- Smart Search Hub -->
        <div class="smart-search-hub">
          <div class="smart-search-container">
            <div class="smart-search-input-wrapper">
              <span class="smart-search-icon">🔍</span>
              <input type="text" class="smart-search-input" placeholder="Cari barang, supplier, transaksi..." id="neural-search-input">
              <span class="smart-search-shortcut">⌘K</span>
            </div>
          </div>
        </div>

        <!-- Logo G Center -->
        <div class="logo-g-center" id="logo-g-trigger" title="Klik untuk membuka menu">
          <img src="/assets/images/garneta-logo-g.svg" alt="Garneta G" class="logo-g-image">
          <span class="logo-g-menu-hint">Klik untuk menu</span>
        </div>

        <!-- Neural Hub Container -->
        <div class="neural-hub-container">
          <!-- SVG Connection Lines -->
          <svg class="neural-connections" id="neural-connections">
            <!-- Lines will be drawn dynamically -->
          </svg>

          <!-- Layer 1: Core Operations -->
          <div class="neural-layer neural-layer-1" id="layer-1">
            ${modules.core.map(mod => createNodeHTML(mod, data, isSuperAdmin)).join('')}
          </div>

          <!-- Layer 2: Business Tools -->
          ${isSuperAdmin ? `
          <div class="neural-layer neural-layer-2" id="layer-2">
            ${modules.business.map(mod => createNodeHTML(mod, data, isSuperAdmin)).join('')}
          </div>
          ` : ''}

          <!-- Layer 3: System -->
          ${isSuperAdmin ? `
          <div class="neural-layer neural-layer-3" id="layer-3">
            ${modules.system.map(mod => createNodeHTML(mod, data, isSuperAdmin)).join('')}
          </div>
          ` : ''}
        </div>

        <!-- Quick Stats Panel -->
        <div class="quick-stats-panel">
          <div class="quick-stat-item">
            <span class="quick-stat-value">${data.products?.length || 0}</span>
            <span class="quick-stat-label">Total Barang</span>
          </div>
          <div class="quick-stat-item">
            <span class="quick-stat-value">${getLowStockCount(data)}</span>
            <span class="quick-stat-label">Stok Rendah</span>
          </div>
          <div class="quick-stat-item">
            <span class="quick-stat-value">${data.suppliers?.length || 0}</span>
            <span class="quick-stat-label">Supplier</span>
          </div>
          ${isSuperAdmin ? `
          <div class="quick-stat-item">
            <span class="quick-stat-value">${formatCurrency(getTodayProfit(data))}</span>
            <span class="quick-stat-label">Profit Hari Ini</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Floating Menu Overlay -->
      <div class="menu-overlay" id="menu-overlay">
        <div class="menu-overlay-content">
          <img src="/assets/images/garneta-logo-g.svg" alt="Garneta G" class="menu-overlay-logo" id="menu-close-trigger">
          <div class="menu-grid">
            ${[...modules.core, ...modules.business, ...modules.system]
              .filter(mod => !mod.super || isSuperAdmin)
              .map(mod => `
                <div class="menu-item" data-route="${mod.id}">
                  <span class="menu-item-icon">${mod.icon}</span>
                  <span class="menu-item-label">${mod.label}</span>
                </div>
              `).join('')}
          </div>
          <span class="menu-close-hint">Klik logo untuk tutup</span>
        </div>
      </div>
    `;

    // Draw connection lines after DOM is ready
    setTimeout(drawConnectionLines, 100);
  }

  // Create Node HTML
  function createNodeHTML(mod, data, isSuperAdmin) {
    const badge = getBadgeValue(mod.badge, data);
    const superClass = mod.super ? 'super-admin' : '';
    const coreClass = modules.core.find(m => m.id === mod.id) ? 'core' : '';
    
    return `
      <div class="neural-node ${coreClass} ${superClass}" data-route="${mod.id}" title="${mod.label}">
        <span class="neural-node-icon">${mod.icon}</span>
        <span class="neural-node-label">${mod.label}</span>
        ${badge ? `<span class="neural-node-badge">${badge}</span>` : ''}
      </div>
    `;
  }

  // Get badge value
  function getBadgeValue(badgeType, data) {
    if (!badgeType) return '';
    
    switch(badgeType) {
      case 'products':
        return data.products?.length || 0;
      case 'suppliers':
        return data.suppliers?.length || 0;
      case 'todaySales':
        const today = new Date().toISOString().slice(0, 10);
        const todaySales = data.sales?.filter(s => s.date === today)?.length || 0;
        return todaySales > 0 ? todaySales : '';
      default:
        return '';
    }
  }

  // Get low stock count
  function getLowStockCount(data) {
    if (!data.products) return 0;
    return data.products.filter(p => p.stock <= 5).length;
  }

  // Get today's profit
  function getTodayProfit(data) {
    if (!data.sales) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return data.sales
      .filter(s => s.date === today)
      .reduce((sum, s) => sum + (s.profit || 0), 0);
  }

  // Format currency
  function formatCurrency(value) {
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  // Draw connection lines
  function drawConnectionLines() {
    const svg = document.getElementById('neural-connections');
    if (!svg) return;

    const container = svg.parentElement;
    const rect = container.getBoundingClientRect();
    
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);

    // Get all nodes
    const nodes = container.querySelectorAll('.neural-node');
    const nodePositions = [];

    nodes.forEach(node => {
      const nodeRect = node.getBoundingClientRect();
      nodePositions.push({
        id: node.dataset.route,
        x: nodeRect.left - rect.left + nodeRect.width / 2,
        y: nodeRect.top - rect.top + nodeRect.height / 2
      });
    });

    // Draw lines between related nodes
    const connections = [
      ['barang', 'penjualan'],
      ['barang', 'supplier'],
      ['supplier', 'pembelian'],
      ['penjualan', 'laporan'],
      ['pembelian', 'statistik'],
      ['laporan', 'statistik']
    ];

    let svgContent = '';
    connections.forEach(([from, to]) => {
      const fromNode = nodePositions.find(n => n.id === from);
      const toNode = nodePositions.find(n => n.id === to);
      if (fromNode && toNode) {
        svgContent += `<line x1="${fromNode.x}" y1="${fromNode.y}" x2="${toNode.x}" y2="${toNode.y}" class="connection-line" data-from="${from}" data-to="${to}"/>`;
      }
    });

    svg.innerHTML = svgContent;
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

    // Node clicks
    document.addEventListener('click', (e) => {
      const node = e.target.closest('.neural-node');
      if (node) {
        const route = node.dataset.route;
        if (route && window.state) {
          window.state.route = route;
          if (window.renderShell) window.renderShell();
          if (window.render) window.render();
        }
      }

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

      if (e.key === 'Escape' && neuralHubState.menuOpen) {
        toggleMenu();
      }
    });

    // Window resize - redraw connections
    window.addEventListener('resize', () => {
      setTimeout(drawConnectionLines, 100);
    });
  }

  // Toggle menu overlay
  function toggleMenu() {
    const menuOverlay = document.getElementById('menu-overlay');
    if (!menuOverlay) return;

    neuralHubState.menuOpen = !neuralHubState.menuOpen;
    menuOverlay.classList.toggle('active', neuralHubState.menuOpen);
  }

  // Animate nodes on load
  function animateNodes() {
    const nodes = document.querySelectorAll('.neural-node');
    nodes.forEach((node, index) => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(20px) scale(0.9)';
      
      setTimeout(() => {
        node.style.transition = 'all 0.5s ease';
        node.style.opacity = '1';
        node.style.transform = 'translateY(0) scale(1)';
      }, index * 100);
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
