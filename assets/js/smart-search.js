/**
 * GARNETA SMART SEARCH + QUICK ACTION
 * Pusat pencarian aplikasi - Compact First, Expand When Needed
 * Tidak mengubah backend, database, API, atau modul yang sudah ada
 */

(function() {
  'use strict';

  // Smart Search State
  const searchState = {
    query: '',
    results: [],
    isOpen: false
  };

  // Initialize Smart Search
  window.initSmartSearch = function() {
    const container = document.getElementById('smart-search-container');
    if (!container) return;

    // Check if data is loaded, if not retry after 500ms
    if (!window.state || !window.state.data || !window.state.data.products) {
      setTimeout(window.initSmartSearch, 500);
      return;
    }

    container.innerHTML = '<div class="smart-search-wrapper">' +
      '<div class="smart-search-input-box">' +
        '<span class="smart-search-icon">🔍</span>' +
        '<input type="text" id="smart-search-input" class="smart-search-input" placeholder="Cari barang, supplier, barcode..." autocomplete="off">' +
        '<span class="smart-search-shortcut">Ctrl+K</span>' +
      '</div>' +
      '<div id="smart-search-dropdown" class="smart-search-dropdown hidden">' +
        '<div id="smart-search-results" class="smart-search-results"></div>' +
      '</div>' +
    '</div>';

    bindEvents();
  };

  function bindEvents() {
    const input = document.getElementById('smart-search-input');
    if (!input) return;

    // Keyboard shortcut Ctrl+K
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    // Realtime search
    input.addEventListener('input', function(e) {
      const query = e.target.value.trim();
      if (query.length < 2) {
        closeDropdown();
        return;
      }
      performSearch(query);
    });

    // Focus shows results if has query
    input.addEventListener('focus', function() {
      if (input.value.trim().length >= 2) {
        performSearch(input.value.trim());
      }
    });

    // Click outside closes dropdown
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.smart-search-wrapper')) {
        closeDropdown();
      }
    });
  }

  function performSearch(query) {
    if (!window.state || !window.state.data) return;

    const results = [];
    const data = window.state.data;
    const lowerQuery = query.toLowerCase();

    // Search products (Barang)
    if (data.products) {
      data.products.forEach(function(p) {
        if ((p.name && p.name.toLowerCase().includes(lowerQuery)) ||
            (p.category && p.category.toLowerCase().includes(lowerQuery)) ||
            (p.barcode && p.barcode.toLowerCase().includes(lowerQuery))) {
          results.push({ type: 'barang', data: p });
        }
      });
    }

    // Search suppliers
    if (data.suppliers) {
      data.suppliers.forEach(function(s) {
        if ((s.name && s.name.toLowerCase().includes(lowerQuery)) ||
            (s.phone && s.phone.toLowerCase().includes(lowerQuery))) {
          results.push({ type: 'supplier', data: s });
        }
      });
    }

    renderResults(results.slice(0, 10), query);
    openDropdown();
  }

  function renderResults(results, query) {
    const container = document.getElementById('smart-search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<div class="smart-search-empty"><span>🔍</span><p>Tidak ada hasil untuk "' + escapeHtml(query) + '"</p></div>';
      return;
    }

    let html = '';
    const barangResults = results.filter(function(r) { return r.type === 'barang'; });
    const supplierResults = results.filter(function(r) { return r.type === 'supplier'; });

    if (barangResults.length > 0) {
      html += '<div class="smart-search-section"><div class="smart-search-section-title">📦 Barang</div>';
      barangResults.forEach(function(r) {
        html += renderBarangQuickCard(r.data);
      });
      html += '</div>';
    }

    if (supplierResults.length > 0) {
      html += '<div class="smart-search-section"><div class="smart-search-section-title">🏭 Supplier</div>';
      supplierResults.forEach(function(r) {
        html += renderSupplierQuickCard(r.data);
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  function renderBarangQuickCard(product) {
    const stockClass = (product.stock || 0) < 10 ? 'stock-low' : (product.stock || 0) < 50 ? 'stock-medium' : 'stock-high';
    const supplier = findSupplierForProduct(product);
    
    return '<div class="quick-action-card">' +
      '<div class="quick-action-header">' +
        '<div class="quick-action-title">📦 ' + escapeHtml(product.name) + '</div>' +
        '<div class="quick-action-category">' + escapeHtml(product.category || 'Umum') + '</div>' +
      '</div>' +
      '<div class="quick-action-info">' +
        '<div class="quick-action-row"><span class="info-label">Kategori:</span><span class="info-value">' + escapeHtml(product.category || 'Umum') + '</span></div>' +
        '<div class="quick-action-row"><span class="info-label">Stok:</span><span class="info-value ' + stockClass + '">' + (product.stock || 0) + ' ' + (product.unit || 'pcs') + '</span></div>' +
        '<div class="quick-action-row"><span class="info-label">Harga Jual:</span><span class="info-value">' + formatRupiah(product.salePrice || 0) + '</span></div>' +
        (supplier ? '<div class="quick-action-row"><span class="info-label">Supplier:</span><span class="info-value">' + escapeHtml(supplier.name) + '</span></div>' : '') +
      '</div>' +
      '<div class="quick-action-buttons">' +
        '<button class="btn primary" onclick="quickActionJual(\'' + product.id + '\')">🛒 Jual</button>' +
        '<button class="btn soft" onclick="quickActionEditBarang(\'' + product.id + '\')">✏️ Edit</button>' +
        '<button class="btn soft" onclick="quickActionLihatSupplier(\'' + product.id + '\')">🏢 Supplier</button>' +
        '<button class="btn soft" onclick="quickActionHistoriBarang(\'' + product.id + '\')">📜 Histori</button>' +
        '<button class="btn soft" onclick="quickActionTambahStok(\'' + product.id + '\')">➕ Stok</button>' +
      '</div>' +
    '</div>';
  }

  function renderSupplierQuickCard(supplier) {
    return '<div class="quick-action-card supplier-card">' +
      '<div class="quick-action-header">' +
        '<div class="quick-action-title">🏭 ' + escapeHtml(supplier.name) + '</div>' +
        '<div class="quick-action-category">Supplier</div>' +
      '</div>' +
      '<div class="quick-action-info">' +
        '<div class="quick-action-row"><span class="info-label">Telepon:</span><span class="info-value">' + escapeHtml(supplier.phone || '-') + '</span></div>' +
        '<div class="quick-action-row"><span class="info-label">Alamat:</span><span class="info-value">' + escapeHtml(supplier.address || '-') + '</span></div>' +
      '</div>' +
      '<div class="quick-action-buttons">' +
        '<button class="btn soft" onclick="quickActionEditSupplier(\'' + supplier.id + '\')">✏️ Edit</button>' +
        '<button class="btn soft" onclick="quickActionLihatBarangSupplier(\'' + supplier.id + '\')">📦 Lihat Barang</button>' +
      '</div>' +
    '</div>';
  }

  function findSupplierForProduct(product) {
    if (!window.state || !window.state.data || !window.state.data.suppliers) return null;
    if (product.supplierId) {
      return window.state.data.suppliers.find(function(s) { return String(s.id) === String(product.supplierId); });
    }
    return null;
  }

  function openDropdown() {
    const dropdown = document.getElementById('smart-search-dropdown');
    if (dropdown) dropdown.classList.remove('hidden');
  }

  function closeDropdown() {
    const dropdown = document.getElementById('smart-search-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  // Quick Action Functions
  window.quickActionJual = function(productId) {
    window.state.route = 'penjualan';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      const select = document.querySelector('select[name="productId"]');
      if (select) select.value = productId;
    }, 100);
  };

  window.quickActionEditBarang = function(productId) {
    window.state.route = 'barang';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      if (window.fillForm) window.fillForm('products', productId);
    }, 100);
  };

  window.quickActionTambahStok = function(productId) {
    window.state.route = 'pembelian';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      const product = window.state.data.products.find(function(p) { return String(p.id) === String(productId); });
      if (product) {
        const productInput = document.querySelector('input[name="product"]');
        if (productInput) productInput.value = product.name;
      }
    }, 100);
  };

  window.quickActionLihatSupplier = function(productId) {
    const product = window.state.data.products.find(function(p) { return String(p.id) === String(productId); });
    if (product && product.supplierId) {
      window.state.route = 'supplier';
      if (window.renderShell) window.renderShell();
      if (window.render) window.render();
      setTimeout(function() {
        if (window.fillForm) window.fillForm('suppliers', product.supplierId);
      }, 100);
    } else {
      alert('Supplier tidak ditemukan untuk barang ini');
    }
  };

  window.quickActionHistoriBarang = function(productId) {
    window.state.route = 'statistik';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      localStorage.setItem('statsProductId', productId);
      const select = document.getElementById('stats-product-filter');
      if (select) {
        select.value = productId;
        select.dispatchEvent(new Event('change'));
      }
    }, 100);
  };

  window.quickActionEditSupplier = function(supplierId) {
    window.state.route = 'supplier';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      if (window.fillForm) window.fillForm('suppliers', supplierId);
    }, 100);
  };

  window.quickActionLihatBarangSupplier = function(supplierId) {
    window.state.route = 'barang';
    if (window.renderShell) window.renderShell();
    if (window.render) window.render();
    setTimeout(function() {
      const supplier = window.state.data.suppliers.find(function(s) { return String(s.id) === String(supplierId); });
      if (supplier) {
        const searchInput = document.getElementById('search-barang-input');
        if (searchInput) {
          searchInput.value = supplier.name;
          if (window.searchBarang) window.searchBarang(supplier.name);
        }
      }
    }, 100);
  };

})();
