/**
 * GARNETA STORE NEURAL DASHBOARD
 * Lapisan dashboard baru yang tidak mengubah sistem yang sudah ada
 */

(function() {
  'use strict';

  const neuralState = {
    enabled: localStorage.getItem('neuralDashboard') === 'true'
  };

  const modules = [
    { id: 'barang', name: 'Barang', icon: '📦', desc: 'Manajemen produk', layer: 1 },
    { id: 'penjualan', name: 'Penjualan', icon: '💵', desc: 'Input transaksi', layer: 1 },
    { id: 'pembelian', name: 'Pembelian', icon: '🛒', desc: 'Restock barang', layer: 2 },
    { id: 'kalkulator', name: 'Kalkulator', icon: '🧮', desc: 'Hitung belanja', layer: 2 },
    { id: 'supplier', name: 'Supplier', icon: '🏭', desc: 'Data supplier', layer: 3 },
    { id: 'laporan', name: 'Laporan', icon: '📈', desc: 'Laporan harian', layer: 3 },
    { id: 'statistik', name: 'Statistik', icon: '📊', desc: 'Analisis data', layer: 3 },
    { id: 'users', name: 'Users', icon: '👤', desc: 'Manajemen user', layer: 4, adminOnly: true },
    { id: 'audit', name: 'Audit', icon: '📋', desc: 'Riwayat aktivitas', layer: 4, adminOnly: true },
    { id: 'settings', name: 'Setting', icon: '⚙️', desc: 'Pengaturan', layer: 4, adminOnly: true }
  ];

  function isSuperAdmin() {
    return window.state && window.state.role === 'Super Admin';
  }

  function getVisibleModules() {
    return modules.filter(m => !m.adminOnly || isSuperAdmin());
  }

  window.toggleNeuralDashboard = function() {
    neuralState.enabled = !neuralState.enabled;
    localStorage.setItem('neuralDashboard', neuralState.enabled);
    location.reload();
  };

  window.navigateToModule = function(moduleId) {
    if (window.state) {
      window.state.route = moduleId;
      if (window.renderShell) window.renderShell();
      if (window.render) window.render();
    }
  };

  window.initNeuralDashboard = function() {
    if (!neuralState.enabled) return;
    
    const content = document.getElementById('content');
    if (!content) return;

    if (window.state && window.state.route === 'dashboard') {
      renderNeuralView(content);
    }
  };

  function renderNeuralView(container) {
    const visibleModules = getVisibleModules();
    const coreModules = visibleModules.filter(m => m.layer === 1);
    const secondaryModules = visibleModules.filter(m => m.layer === 2);
    const supportingModules = visibleModules.filter(m => m.layer === 3);
    const adminModules = visibleModules.filter(m => m.layer === 4);

    let html = '<section class="neural-dashboard">';
    html += '<div class="neural-header"><h1>🧠 Neural Hub</h1><p class="muted">Pusat kendali sistem</p></div>';
    
    // Search
    html += '<div class="neural-search-section">';
    html += '<div class="search-box"><span class="search-icon">🔍</span>';
    html += '<input type="text" id="universal-search" placeholder="Cari barang, supplier... (Ctrl+K)" autocomplete="off">';
    html += '</div><div id="search-results" class="search-dropdown"></div></div>';
    
    // Core
    html += '<div class="neural-section"><h3 class="section-title">⚡ Operasi Utama</h3><div class="neural-nodes">';
    coreModules.forEach(m => { html += renderNode(m, 'node-core'); });
    html += '</div></div>';
    
    // Secondary
    html += '<div class="neural-section"><h3 class="section-title">🔧 Operasi Sekunder</h3><div class="neural-nodes">';
    secondaryModules.forEach(m => { html += renderNode(m, 'node-secondary'); });
    html += '</div></div>';
    
    // Supporting
    html += '<div class="neural-section"><h3 class="section-title">📊 Dukungan</h3><div class="neural-nodes">';
    supportingModules.forEach(m => { html += renderNode(m, 'node-supporting'); });
    html += '</div></div>';
    
    // Admin
    if (adminModules.length) {
      html += '<div class="neural-section"><h3 class="section-title">🔐 Administrasi</h3><div class="neural-nodes">';
      adminModules.forEach(m => { html += renderNode(m, 'node-admin'); });
      html += '</div></div>';
    }
    
    // Toggle
    html += '<div class="neural-footer"><button class="btn soft" onclick="toggleNeuralDashboard()">⬅️ Kembali ke Dashboard Biasa</button></div>';
    html += '</section>';
    
    container.innerHTML = html;
    bindSearch();
  }

  function renderNode(module, cssClass) {
    return '<div class="neural-node ' + cssClass + '" onclick="navigateToModule(\'' + module.id + '\')">' +
      '<div class="node-icon">' + module.icon + '</div>' +
      '<div class="node-info"><div class="node-name">' + module.name + '</div>' +
      '<div class="node-desc">' + module.desc + '</div></div></div>';
  }

  function bindSearch() {
    const searchInput = document.getElementById('universal-search');
    const resultsContainer = document.getElementById('search-results');
    
    if (!searchInput) return;

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('active');
        return;
      }
      performSearch(query, resultsContainer);
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.neural-search-section')) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('active');
      }
    });
  }

  function performSearch(query, container) {
    if (!window.state || !window.state.data) return;

    const results = [];
    const data = window.state.data;

    if (data.products) {
      data.products.forEach(function(p) {
        if (p.name && p.name.toLowerCase().indexOf(query) !== -1) {
          results.push({ type: 'barang', name: p.name, id: p.id });
        }
      });
    }

    if (data.suppliers) {
      data.suppliers.forEach(function(s) {
        if (s.name && s.name.toLowerCase().indexOf(query) !== -1) {
          results.push({ type: 'supplier', name: s.name, id: s.id });
        }
      });
    }

    renderResults(results, container);
  }

  function renderResults(results, container) {
    if (!results.length) {
      container.innerHTML = '<div class="search-empty">Tidak ada hasil</div>';
      container.classList.add('active');
      return;
    }

    let html = '<div class="search-results-list">';
    results.slice(0, 8).forEach(function(r) {
      html += '<div class="search-result-item" onclick="goToResult(\'' + r.type + '\', \'' + r.id + '\')">';
      html += '<div class="result-icon">' + (r.type === 'barang' ? '📦' : '🏭') + '</div>';
      html += '<div class="result-info"><div class="result-name">' + r.name + '</div>';
      html += '<div class="result-type-label">' + r.type + '</div></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
    container.classList.add('active');
  }

  window.goToResult = function(type, id) {
    if (type === 'barang') {
      window.state.route = 'barang';
    } else {
      window.state.route = 'supplier';
    }
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
  };

})();
