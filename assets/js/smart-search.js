/**
 * GARNETA STORE SMART SEARCH + QUICK ACTION
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
    if (!container) {
      console.log('Smart Search: container not found');
      return;
    }

    // Check if data is loaded
    if (!window.state || !window.state.data) {
      console.log('Smart Search: data not loaded yet, retrying...');
      setTimeout(window.initSmartSearch, 500);
      return;
    }

    // Check if products array exists (even if empty)
    if (!Array.isArray(window.state.data.products)) {
      console.log('Smart Search: products not ready, retrying...');
      setTimeout(window.initSmartSearch, 500);
      return;
    }

    console.log('Smart Search: initializing with', window.state.data.products.length, 'products');

    // Clear container first
    container.innerHTML = '';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'smart-search-wrapper';
    wrapper.innerHTML = 
      '<div class="smart-search-input-box">' +
        '<span class="smart-search-icon">🔍</span>' +
        '<input type="text" id="smart-search-input" class="smart-search-input" placeholder="Cari barang, supplier, barcode..." autocomplete="off">' +
        '<span class="smart-search-shortcut">Ctrl+K</span>' +
      '</div>' +
      '<div id="smart-search-dropdown" class="smart-search-dropdown hidden">' +
        '<div id="smart-search-results" class="smart-search-results"></div>' +
      '</div>';
    
    container.appendChild(wrapper);
    bindEvents();
    console.log('Smart Search: initialized successfully');
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

    // Focus shows results if has query (with flag for click handling)
    let justFocused = false;
    input.addEventListener('focus', function() {
      justFocused = true;
      if (input.value.trim().length >= 2) {
        performSearch(input.value.trim());
      }
      setTimeout(function() { justFocused = false; }, 200);
    });

    // Toggle on click (tutup jika terbuka, buka jika tertutup)
    input.addEventListener('click', function() {
      if (justFocused) return; // Abaikan jika ini klik pertama yang memicu focus
      
      const dropdown = document.getElementById('smart-search-dropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        closeDropdown();
      } else if (input.value.trim().length >= 2) {
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
        const n = String(p.name || '').toLowerCase();
        const c = String(p.category || '').toLowerCase();
        const b = String(p.barcode || '').toLowerCase();
        if (n.includes(lowerQuery) || c.includes(lowerQuery) || b.includes(lowerQuery)) {
          results.push({ type: 'barang', data: p });
        }
      });
    }

    // Search suppliers
    if (data.suppliers) {
      data.suppliers.forEach(function(s) {
        const n = String(s.name || '').toLowerCase();
        const ph = String(s.phone || '').toLowerCase();
        const notes = String(s.notes || '').toLowerCase();
        if (n.includes(lowerQuery) || ph.includes(lowerQuery) || notes.includes(lowerQuery)) {
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
    const grosirStr = product.salePrice ? formatRupiah(product.salePrice) + (product.unit ? ' / ' + escapeHtml(product.unit) : '') : '';
    const ecerStr = product.salePriceEcer ? formatRupiah(product.salePriceEcer) + (product.unitEcer ? ' / ' + escapeHtml(product.unitEcer) : '') : '';
    const priceDisplay = [grosirStr, ecerStr].filter(Boolean).join(' | ') || 'Harga belum diatur';

    return '<div class="quick-action-card compact hover-ninja-container" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 4px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; gap: 8px;">' +
      '<div class="hover-ninja-content" style="flex:1; min-width:0;">' +
        '<div style="font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">📦 ' + escapeHtml(product.name) + '</div>' +
        '<div style="font-size: 0.72rem; color: #999; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + priceDisplay + ' &bull; ' + escapeHtml(product.category || 'Umum') + '</div>' +
      '</div>' +
      '<div class="hover-ninja-actions" style="display:flex; gap:4px;">' +
        '<button class="btn primary" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 6px; min-height: unset; line-height: 1.2;" onclick="quickActionJual(\'' + product.id + '\')">🛒 Jual</button>' +
        '<button class="btn soft" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 6px; min-height: unset; line-height: 1.2; background: rgba(255,255,255,0.05); color: #ccc;" onclick="quickActionEditBarang(\'' + product.id + '\')">✏️ Edit</button>' +
      '</div>' +
    '</div>';
  }

  function renderSupplierQuickCard(supplier) {
    return '<div class="quick-action-card compact hover-ninja-container" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin-bottom: 4px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; gap: 8px;">' +
      '<div class="hover-ninja-content" style="flex:1; min-width:0;">' +
        '<div style="font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem;">🏭 ' + escapeHtml(supplier.name) + '</div>' +
        '<div style="font-size: 0.72rem; color: #999; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(supplier.phone || '-') + '</div>' +
      '</div>' +
      '<div class="hover-ninja-actions" style="display:flex; gap:4px;">' +
        '<button class="btn soft" style="padding: 3px 8px; font-size: 0.7rem; border-radius: 6px; min-height: unset; line-height: 1.2; background: rgba(255,255,255,0.05); color: #ccc;" onclick="quickActionEditSupplier(\'' + supplier.id + '\')">✏️ Edit</button>' +
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
      if (select) {
        select.value = productId;
        select.dispatchEvent(new Event('change'));
      }
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
