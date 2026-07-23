/**
 * GARNETA PROGRESSIVE UI
 * Progressive Disclosure - Collapse/Accordion/Modal
 * Tidak mengubah sistem yang sudah ada, hanya menambahkan layer
 */

(function() {
  'use strict';

  // Progressive UI State
  const uiState = {
    collapsed: JSON.parse(localStorage.getItem('progressiveUI_collapsed') || '{}'),
    modals: {}
  };

  // Toggle collapse section
  window.toggleSection = function(sectionId, saveState) {
    const content = document.getElementById(sectionId);
    const header = document.querySelector('[data-section="' + sectionId + '"]');
    
    if (!content) return;
    
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expand
      content.classList.remove('collapsed');
      content.style.maxHeight = content.scrollHeight + 'px';
      if (header) header.classList.remove('collapsed');
    } else {
      // Collapse
      content.classList.add('collapsed');
      content.style.maxHeight = '0';
      if (header) header.classList.add('collapsed');
    }
    
    // Save state if needed
    if (saveState) {
      uiState.collapsed[sectionId] = !isCollapsed;
      localStorage.setItem('progressiveUI_collapsed', JSON.stringify(uiState.collapsed));
    }
  };

  // Open modal
  window.openModal = function(modalId, content) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.innerHTML = content;
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  };

  // Close modal
  window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  };

  // Initialize progressive UI on page
  window.initProgressiveUI = function() {
    // Add collapse headers to existing sections
    addCollapseToForms();
    addCollapseToTables();
  };

  // Add collapse functionality to forms
  function addCollapseToForms() {
    const forms = document.querySelectorAll('form[data-form]');
    forms.forEach(function(form) {
      const card = form.closest('.card');
      if (!card) return;
      
      // Check if already has collapse
      if (card.querySelector('.collapse-header')) return;
      
      const title = card.querySelector('h2, h3');
      if (!title) return;
      
      const sectionId = 'section-' + Math.random().toString(36).substr(2, 9);
      form.id = sectionId;
      
      // Create header
      const header = document.createElement('div');
      header.className = 'collapse-header';
      header.setAttribute('data-section', sectionId);
      header.innerHTML = title.outerHTML + '<span class="collapse-icon">▼</span>';
      header.onclick = function() { toggleSection(sectionId, true); };
      
      // Wrap form
      const wrapper = document.createElement('div');
      wrapper.className = 'collapse-content collapsed';
      wrapper.id = sectionId;
      wrapper.style.maxHeight = '0';
      wrapper.style.overflow = 'hidden';
      wrapper.style.transition = 'max-height 0.3s ease';
      
      // Move form into wrapper
      form.parentNode.insertBefore(wrapper, form);
      wrapper.appendChild(form);
      
      // Replace title with header
      title.parentNode.insertBefore(header, title);
      title.remove();
      
      // Set initial state
      if (!uiState.collapsed[sectionId]) {
        toggleSection(sectionId, false);
      }
    });
  }

  // Add collapse functionality to tables
  function addCollapseToTables() {
    const tables = document.querySelectorAll('.table-wrap');
    tables.forEach(function(tableWrap) {
      const card = tableWrap.closest('.card');
      if (!card) return;
      if (card.querySelector('.collapse-header')) return;
      
      const title = card.querySelector('h3');
      if (!title) return;
      
      const sectionId = 'table-' + Math.random().toString(36).substr(2, 9);
      
      const header = document.createElement('div');
      header.className = 'collapse-header';
      header.setAttribute('data-section', sectionId);
      header.innerHTML = title.outerHTML + '<span class="collapse-icon">▼</span>';
      header.onclick = function() { toggleSection(sectionId, true); };
      
      const wrapper = document.createElement('div');
      wrapper.className = 'collapse-content';
      wrapper.id = sectionId;
      wrapper.style.maxHeight = 'none';
      wrapper.style.overflow = 'hidden';
      wrapper.style.transition = 'max-height 0.3s ease';
      
      // Move table into wrapper
      const parent = tableWrap.parentNode;
      parent.insertBefore(wrapper, tableWrap);
      wrapper.appendChild(tableWrap);
      
      // Replace title with header
      title.parentNode.insertBefore(header, title);
      title.remove();
    });
  }

  // Create slide panel
  window.createSlidePanel = function(panelId, title, content) {
    const existing = document.getElementById(panelId);
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'slide-panel';
    panel.innerHTML = `
      <div class="slide-panel-overlay" onclick="closeSlidePanel('${panelId}')"></div>
      <div class="slide-panel-content">
        <div class="slide-panel-header">
          <h3>${title}</h3>
          <button class="btn soft" onclick="closeSlidePanel('${panelId}')">✕</button>
        </div>
        <div class="slide-panel-body">${content}</div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Animate in
    setTimeout(function() {
      panel.classList.add('active');
    }, 10);
  };

  // Close slide panel
  window.closeSlidePanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.remove('active');
      setTimeout(function() {
        panel.remove();
      }, 300);
    }
  };

})();
