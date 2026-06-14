/**
 * GARNETA NEURAL HUB - Interactive JavaScript
 * AI Command Center Dashboard Functionality
 */

// Neural Hub State Management
const NeuralHub = {
  role: 'Super Admin', // 'Karyawan', 'Admin', 'Super Admin'
  currentModule: 'dashboard',
  searchQuery: '',
  
  // Module definitions with priority levels
  modules: {
    'cari-barang': { name: 'Cari Barang', icon: '🔍', priority: 1, group: 'master' },
    'barang': { name: 'Barang', icon: '📦', priority: 1, group: 'master' },
    'penjualan': { name: 'Penjualan', icon: '💵', priority: 1, group: 'transaksi' },
    'pembelian': { name: 'Pembelian', icon: '🛒', priority: 2, group: 'transaksi' },
    'kalkulator': { name: 'Kalkulator', icon: '🧮', priority: 2, group: 'tools' },
    'supplier': { name: 'Supplier', icon: '🏭', priority: 3, group: 'master' },
    'laporan': { name: 'Laporan', icon: '📈', priority: 3, group: 'analitik' },
    'statistik': { name: 'Statistik', icon: '📊', priority: 3, group: 'analitik' },
    'users': { name: 'Users', icon: '👤', priority: 4, group: 'sistem' },
    'audit': { name: 'Audit Log', icon: '📋', priority: 4, group: 'sistem' },
    'setting': { name: 'Setting', icon: '⚙️', priority: 4, group: 'sistem' },
    'scanner': { name: 'Scanner', icon: '📷', priority: 2, group: 'tools' }
  },

  // Role-based access control
  accessControl: {
    'Karyawan': ['cari-barang', 'barang', 'penjualan', 'pembelian', 'kalkulator'],
    'Admin': ['cari-barang', 'barang', 'penjualan', 'pembelian', 'kalkulator', 'supplier', 'laporan', 'statistik'],
    'Super Admin': ['cari-barang', 'barang', 'penjualan', 'pembelian', 'kalkulator', 'supplier', 'laporan', 'statistik', 'users', 'audit', 'setting', 'scanner']
  },

  // Initialize Neural Hub
  init() {
    this.loadRole();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.animateEntrance();
  },

  // Load user role from localStorage
  loadRole() {
    const savedRole = localStorage.getItem('gnh_role');
    if (savedRole) {
      this.role = savedRole;
    }
    this.updateUIForRole();
  },

  // Update UI based on role
  updateUIForRole() {
    const allowedModules = this.accessControl[this.role] || [];
    
    // Update role badge
    const roleBadge = document.querySelector('.role-badge');
    if (roleBadge) {
      roleBadge.textContent = this.role;
    }
    
    // Filter visible modules
    document.querySelectorAll('.neural-card').forEach(card => {
      const moduleId = this.getModuleIdFromCard(card);
      if (moduleId && !allowedModules.includes(moduleId)) {
        card.style.display = 'none';
      }
    });
    
    // Filter sidebar items
    document.querySelectorAll('.nav-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      const hasAccess = allowedModules.some(module => {
        const mod = this.modules[module];
        return mod && text.includes(mod.name.toLowerCase());
      });
      if (!hasAccess && this.role !== 'Super Admin') {
        item.style.display = 'none';
      }
    });
  },

  // Get module ID from card element
  getModuleIdFromCard(card) {
    const title = card.querySelector('.card-title')?.textContent;
    for (const [id, mod] of Object.entries(this.modules)) {
      if (mod.name === title) return id;
    }
    return null;
  },

  // Setup event listeners
  setupEventListeners() {
    // Neural card clicks
    document.querySelectorAll('.neural-card').forEach(card => {
      card.addEventListener('click', (e) => this.handleCardClick(e));
      card.addEventListener('mouseenter', (e) => this.handleCardHover(e));
      card.addEventListener('mouseleave', (e) => this.handleCardLeave(e));
    });
    
    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e));
      searchInput.addEventListener('focus', () => this.highlightSearch());
    }
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => this.handleNavClick(e));
    });
  },

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.focus();
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  },

  // Handle card click
  handleCardClick(e) {
    const card = e.currentTarget;
    const title = card.querySelector('.card-title')?.textContent;
    
    // Add click animation
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      card.style.transform = '';
    }, 150);
    
    // Navigate to module
    this.navigateToModule(title);
  },

  // Handle card hover
  handleCardHover(e) {
    const card = e.currentTarget;
    const moduleId = this.getModuleIdFromCard(card);
    
    // Highlight connections
    this.highlightConnections(moduleId);
    
    // Play subtle sound (optional)
    // this.playHoverSound();
  },

  // Handle card leave
  handleCardLeave(e) {
    this.removeHighlightConnections();
  },

  // Highlight connections between nodes
  highlightConnections(moduleId) {
    // Visual feedback for related modules
    const relatedModules = this.getRelatedModules(moduleId);
    document.querySelectorAll('.neural-card').forEach(card => {
      const cardId = this.getModuleIdFromCard(card);
      if (relatedModules.includes(cardId)) {
        card.style.opacity = '1';
      } else if (cardId !== moduleId) {
        card.style.opacity = '0.5';
      }
    });
  },

  // Remove connection highlights
  removeHighlightConnections() {
    document.querySelectorAll('.neural-card').forEach(card => {
      card.style.opacity = '1';
    });
  },

  // Get related modules
  getRelatedModules(moduleId) {
    const relations = {
      'cari-barang': ['barang', 'penjualan'],
      'barang': ['cari-barang', 'penjualan', 'pembelian', 'supplier'],
      'penjualan': ['cari-barang', 'barang', 'laporan'],
      'pembelian': ['barang', 'supplier', 'kalkulator'],
      'supplier': ['pembelian', 'barang'],
      'laporan': ['penjualan', 'statistik'],
      'statistik': ['laporan', 'barang'],
      'kalkulator': ['pembelian'],
      'users': ['audit', 'setting'],
      'audit': ['users', 'setting'],
      'setting': ['users', 'audit']
    };
    return relations[moduleId] || [];
  },

  // Navigate to module
  navigateToModule(moduleName) {
    console.log(`Navigating to: ${moduleName}`);
    
    // Map module names to actual routes
    const routeMap = {
      'Cari Barang': '/modules/pencarian/',
      'Barang': '/modules/barang/',
      'Penjualan': '/modules/penjualan/',
      'Pembelian': '/modules/pembelian/',
      'Kalkulator': '/modules/kalkulator-belanja/',
      'Supplier': '/modules/supplier/',
      'Laporan': '/modules/laporan/',
      'Statistik': '/modules/statistik/',
      'Users': '/modules/users/',
      'Audit Log': '/modules/audit/',
      'Setting': '/modules/settings/',
      'Scanner': '/modules/scanner/'
    };
    
    const route = routeMap[moduleName];
    if (route) {
      window.location.href = route;
    } else {
      console.warn(`No route found for module: ${moduleName}`);
    }
  },

  // Handle search input
  handleSearch(e) {
    const query = e.target.value.toLowerCase();
    this.searchQuery = query;
    
    document.querySelectorAll('.neural-card').forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase();
      const desc = card.querySelector('.card-desc')?.textContent.toLowerCase();
      
      if (title.includes(query) || desc.includes(query)) {
        card.style.display = 'block';
        card.style.opacity = '1';
      } else {
        card.style.opacity = '0.3';
      }
    });
  },

  // Highlight search box
  highlightSearch() {
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
      searchBox.style.borderColor = '#24f0c7';
      searchBox.style.boxShadow = '0 0 30px rgba(36, 240, 199, 0.2)';
    }
  },

  // Handle navigation click
  handleNavClick(e) {
    const item = e.currentTarget;
    
    // Remove active from all
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    // Add active to clicked
    item.classList.add('active');
  },

  // Animate entrance
  animateEntrance() {
    const cards = document.querySelectorAll('.neural-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50);
    });
  },

  // Close all modals
  closeAllModals() {
    // Implementation for closing modals
  },

  // Set role
  setRole(role) {
    if (this.accessControl[role]) {
      this.role = role;
      localStorage.setItem('gnh_role', role);
      this.updateUIForRole();
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  NeuralHub.init();
});

// Export for global access
window.NeuralHub = NeuralHub;
