/**
 * GARNETA SYSTEM - UI Updates
 * Collapse/Expand functionality and Search features
 */

// Collapse/Expand Toggle Function
function toggleCollapse(elementId) {
  const content = document.getElementById(elementId);
  const header = content.previousElementSibling;
  const icon = header.querySelector('.collapse-icon');
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    icon.textContent = '▼';
    header.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    icon.textContent = '▶';
    header.classList.add('collapsed');
  }
}

// Search Functions
function searchBarang(query) {
  if (!query) {
    document.getElementById('search-barang-results').innerHTML = '';
    return;
  }
  
  const products = state.data.products || [];
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(query.toLowerCase())) ||
    (p.barcode && p.barcode.toLowerCase().includes(query.toLowerCase()))
  );
  
  displaySearchResults('search-barang-results', filtered, 'barang');
}

function searchSupplier(query) {
  if (!query) {
    document.getElementById('search-supplier-results').innerHTML = '';
    return;
  }
  
  const suppliers = state.data.suppliers || [];
  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.phone && s.phone.toLowerCase().includes(query.toLowerCase())) ||
    (s.address && s.address.toLowerCase().includes(query.toLowerCase()))
  );
  
  displaySearchResults('search-supplier-results', filtered, 'supplier');
}

function searchPembelian(query) {
  if (!query) {
    document.getElementById('search-pembelian-results').innerHTML = '';
    return;
  }
  
  const purchases = state.data.purchases || [];
  const filtered = purchases.filter(p => 
    (p.supplier && p.supplier.toLowerCase().includes(query.toLowerCase())) ||
    (p.product && p.product.toLowerCase().includes(query.toLowerCase())) ||
    (p.date && p.date.includes(query))
  );
  
  displaySearchResults('search-pembelian-results', filtered, 'pembelian');
}

function searchPenjualan(query) {
  if (!query) {
    document.getElementById('search-penjualan-results').innerHTML = '';
    return;
  }
  
  const sales = state.data.sales || [];
  const filtered = sales.filter(s => 
    (s.product && s.product.toLowerCase().includes(query.toLowerCase())) ||
    (s.date && s.date.includes(query))
  );
  
  displaySearchResults('search-penjualan-results', filtered, 'penjualan');
}

function displaySearchResults(containerId, results, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = '<p class="muted">Tidak ada hasil ditemukan.</p>';
    return;
  }
  
  let html = '<div class="search-results">';
  results.slice(0, 10).forEach(item => {
    html += `<div class="search-result-item" onclick="selectSearchResult('${type}', '${item.id}')">`;
    html += `<div class="search-result-title">${escapeHtml(item.name || item.product || 'Item')}</div>`;
    html += `<div class="search-result-meta">`;
    if (type === 'barang') {
      html += `${item.category || 'Umum'} | Stok: ${item.stock || 0} | ${rupiah(item.salePrice || 0)}`;
    } else if (type === 'supplier') {
      html += `${item.phone || '-'} | ${item.address || '-'}`;
    } else if (type === 'pembelian') {
      html += `${item.date} | ${item.supplier} | ${rupiah(item.total || item.amount || 0)}`;
    } else if (type === 'penjualan') {
      html += `${item.date} | ${item.product} | ${item.qty || 0} unit`;
    }
    html += `</div></div>`;
  });
  if (results.length > 10) {
    html += `<p class="muted">...dan ${results.length - 10} hasil lainnya</p>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function selectSearchResult(type, id) {
  // Fill form with selected item
  fillForm(type === 'barang' ? 'products' : type === 'supplier' ? 'suppliers' : type + 's', id);
}

function clearSearchBarang() {
  document.getElementById('search-barang-input').value = '';
  document.getElementById('search-barang-results').innerHTML = '';
}

function clearSearchSupplier() {
  document.getElementById('search-supplier-input').value = '';
  document.getElementById('search-supplier-results').innerHTML = '';
}

function clearSearchPembelian() {
  document.getElementById('search-pembelian-input').value = '';
  document.getElementById('search-pembelian-results').innerHTML = '';
}

function clearSearchPenjualan() {
  document.getElementById('search-penjualan-input').value = '';
  document.getElementById('search-penjualan-results').innerHTML = '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global Search
function performGlobalSearch() {
  const query = document.getElementById('global-search')?.value;
  if (!query) return;
  
  // Redirect to barang page with search
  state.route = 'barang';
  renderShell();
  render();
  
  // Fill search input
  setTimeout(() => {
    const searchInput = document.getElementById('search-barang-input');
    if (searchInput) {
      searchInput.value = query;
      searchBarang(query);
      // Expand search section
      const searchContent = document.getElementById('barang-search');
      if (searchContent && searchContent.classList.contains('collapsed')) {
        toggleCollapse('barang-search');
      }
    }
  }, 100);
}

// Initialize collapse states
function initCollapseStates() {
  // Set default collapsed states for certain sections
  const defaultCollapsed = ['barang-import', 'barang-scanner', 'supplier-list', 'pembelian-list'];
  defaultCollapsed.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.classList.contains('collapsed')) {
      el.classList.add('collapsed');
      const header = el.previousElementSibling;
      if (header) {
        header.classList.add('collapsed');
        const icon = header.querySelector('.collapse-icon');
        if (icon) icon.textContent = '▶';
      }
    }
  });
}

// Export functions for use in main app
window.toggleCollapse = toggleCollapse;
window.searchBarang = searchBarang;
window.searchSupplier = searchSupplier;
window.searchPembelian = searchPembelian;
window.searchPenjualan = searchPenjualan;
window.clearSearchBarang = clearSearchBarang;
window.clearSearchSupplier = clearSearchSupplier;
window.clearSearchPembelian = clearSearchPembelian;
window.clearSearchPenjualan = clearSearchPenjualan;
window.performGlobalSearch = performGlobalSearch;
window.initCollapseStates = initCollapseStates;
