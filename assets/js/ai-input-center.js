/**
 * GARNETA STORE AI INPUT CENTER
 * One AI Engine - Many Input Methods
 * Modular AI input system for Barang, Kalkulator, Penjualan
 */

(function() {
  'use strict';

  // AI Input Center State
  const AIState = {
    isListening: false,
    recognition: null,
    currentContext: null, // 'barang', 'kalkulator', 'penjualan'
    draft: [],
    transcript: ''
  };

  // Initialize AI Input Center
  window.initAIInputCenter = function() {
    console.log('AI Input Center: Initializing...');
    bindAIInputEvents();
  };

  // Check browser support for Speech Recognition
  window.isVoiceSupported = function() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  };

  // Get Speech Recognition API
  function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  // Start Voice Input
  window.startVoiceInput = function(context) {
    if (!window.isVoiceSupported()) {
      alert('Browser tidak mendukung voice input. Gunakan Paste WA atau Manual.');
      return;
    }

    AIState.currentContext = context;
    const Recognition = getSpeechRecognition();
    AIState.recognition = new Recognition();
    
    AIState.recognition.lang = 'id-ID'; // Bahasa Indonesia
    AIState.recognition.continuous = true;
    AIState.recognition.interimResults = true;

    AIState.recognition.onstart = function() {
      AIState.isListening = true;
      updateVoiceUI(true);
      console.log('AI Input Center: Voice started for', context);
    };

    AIState.recognition.onresult = function(event) {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      AIState.transcript = finalTranscript || interimTranscript;
      updateTranscriptDisplay(AIState.transcript);
    };

    AIState.recognition.onerror = function(event) {
      console.error('AI Input Center: Voice error', event.error);
      if (event.error === 'not-allowed') {
        alert('Izin microphone ditolak. Pastikan HTTPS dan izin microphone diberikan.');
      }
      stopVoiceInput();
    };

    AIState.recognition.onend = function() {
      if (AIState.isListening) {
        // Auto restart if still listening
        AIState.recognition.start();
      } else {
        updateVoiceUI(false);
        processVoiceInput();
      }
    };

    AIState.recognition.start();
  };

  // Stop Voice Input
  window.stopVoiceInput = function() {
    AIState.isListening = false;
    if (AIState.recognition) {
      AIState.recognition.stop();
    }
    updateVoiceUI(false);
  };

  // Process Voice Input to Draft
  function processVoiceInput() {
    if (!AIState.transcript.trim()) return;
    
    console.log('AI Input Center: Processing voice for', AIState.currentContext);
    
    switch(AIState.currentContext) {
      case 'barang':
        processBarangVoice(AIState.transcript);
        break;
      case 'kalkulator':
        processKalkulatorVoice(AIState.transcript);
        break;
      case 'penjualan':
        processPenjualanVoice(AIState.transcript);
        break;
    }
  }

  // Process Barang Voice Input
  function processBarangVoice(transcript) {
    // Parse: "Gula Jawa stok dua puluh harga beli seratus delapan puluh ribu harga jual dua ratus ribu"
    const parsed = parseBarangFromVoice(transcript);
    if (parsed) {
      addToDraft('barang', parsed);
    }
  }

  // Process Kalkulator Voice Input
  function processKalkulatorVoice(transcript) {
    // Parse: "Payung lima, gula pasir dua, beras premium satu"
    const items = parseShoppingFromVoice(transcript);
    if (items.length) {
      items.forEach(item => addToDraft('kalkulator', item));
    }
  }

  // Process Penjualan Voice Input
  function processPenjualanVoice(transcript) {
    // Parse: "Jual gula dua, beras satu"
    const items = parseSalesFromVoice(transcript);
    if (items.length) {
      items.forEach(item => addToDraft('penjualan', item));
    }
  }

  // Parse Barang from Voice
  function parseBarangFromVoice(text) {
    const lower = text.toLowerCase();
    
    // Extract name (before "stok" or "harga")
    let name = '';
    const nameMatch = lower.match(/^(.+?)(?:\s+(?:stok|harga|stock))/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
    
    // Extract stock
    let stock = 0;
    const stockMatch = lower.match(/(?:stok|stock)\s+(.+?)(?:\s+harga|$)/);
    if (stockMatch) {
      stock = parseIndonesianNumber(stockMatch[1]);
    }
    
    // Extract base price (harga beli/modal)
    let basePrice = 0;
    const basePriceMatch = lower.match(/(?:harga\s+(?:beli|modal|dasar)|harga\s+beli)\s+(.+?)(?:\s+harga|$)/);
    if (basePriceMatch) {
      basePrice = parseIndonesianNumber(basePriceMatch[1]);
    }
    
    // Extract sale price (harga jual)
    let salePrice = 0;
    const salePriceMatch = lower.match(/harga\s+jual\s+(.+?)(?:\s|$)/);
    if (salePriceMatch) {
      salePrice = parseIndonesianNumber(salePriceMatch[1]);
    }
    
    if (!name) return null;
    
    return {
      id: Date.now() + Math.random(),
      name: capitalizeWords(name),
      category: 'Umum',
      unit: 'pcs',
      unitContent: 1,
      basePrice: basePrice,
      salePrice: salePrice,
      stock: stock,
      barcode: ''
    };
  }

  // Parse Shopping from Voice
  function parseShoppingFromVoice(text) {
    const items = [];
    // Split by comma or "dan"
    const parts = text.split(/,|\bdan\b/i);
    
    parts.forEach(part => {
      const match = part.trim().match(/^(.+?)\s+(\d+(?:\s+\w+)?)$/);
      if (match) {
        const name = match[1].trim();
        const qty = parseIndonesianNumber(match[2]);
        
        items.push({
          id: Date.now() + Math.random(),
          name: capitalizeWords(name),
          qty: qty,
          unit: '',
          amount: 0,
          subtotal: 0
        });
      }
    });
    
    return items;
  }

  // Parse Sales from Voice
  function parseSalesFromVoice(text) {
    const items = [];
    // Remove "jual" prefix
    const cleanText = text.replace(/^\s*jual\s*/i, '');
    const parts = cleanText.split(/,|\bdan\b/i);
    
    parts.forEach(part => {
      const match = part.trim().match(/^(.+?)\s+(\d+(?:\s+\w+)?)$/);
      if (match) {
        const name = match[1].trim();
        const qty = parseIndonesianNumber(match[2]);
        
        items.push({
          id: Date.now() + Math.random(),
          name: capitalizeWords(name),
          qty: qty,
          date: new Date().toISOString().slice(0, 10)
        });
      }
    });
    
    return items;
  }

  // Parse Indonesian Number Words to Number
  function parseIndonesianNumber(text) {
    if (!text) return 0;
    
    const numberWords = {
      'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5,
      'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
      'sebelas': 11, 'dua belas': 12, 'tiga belas': 13, 'empat belas': 14, 'lima belas': 15,
      'enam belas': 16, 'tujuh belas': 17, 'delapan belas': 18, 'sembilan belas': 19,
      'dua puluh': 20, 'tiga puluh': 30, 'empat puluh': 40, 'lima puluh': 50,
      'enam puluh': 60, 'tujuh puluh': 70, 'delapan puluh': 80, 'sembilan puluh': 90,
      'seratus': 100, 'dua ratus': 200, 'tiga ratus': 300, 'empat ratus': 400, 'lima ratus': 500,
      'enam ratus': 600, 'tujuh ratus': 700, 'delapan ratus': 800, 'sembilan ratus': 900,
      'seribu': 1000, 'dua ribu': 2000, 'lima ribu': 5000, 'sepuluh ribu': 10000,
      'dua puluh ribu': 20000, 'lima puluh ribu': 50000, 'seratus ribu': 100000,
      'dua ratus ribu': 200000, 'lima ratus ribu': 500000, 'satu juta': 1000000
    };
    
    let result = 0;
    let tempText = text.toLowerCase().trim();
    
    // Try direct number first
    const directNumber = parseInt(tempText.replace(/\D/g, ''));
    if (directNumber && !isNaN(directNumber)) {
      return directNumber;
    }
    
    // Parse word by word
    for (const [word, value] of Object.entries(numberWords)) {
      if (tempText.includes(word)) {
        result += value;
        tempText = tempText.replace(word, '');
      }
    }
    
    return result || parseInt(tempText.replace(/\D/g, '')) || 0;
  }

  // Capitalize Words
  function capitalizeWords(text) {
    return text.replace(/\b\w/g, char => char.toUpperCase());
  }

  // Add to Draft
  function addToDraft(context, item) {
    const draftKey = `aiDraft_${context}`;
    const existing = JSON.parse(localStorage.getItem(draftKey) || '[]');
    existing.push(item);
    localStorage.setItem(draftKey, JSON.stringify(existing));
    AIState.draft = existing;
    refreshDraftTable(context);
  }

  // Get Draft
  window.getAIDraft = function(context) {
    const draftKey = `aiDraft_${context}`;
    return JSON.parse(localStorage.getItem(draftKey) || '[]');
  };

  // Clear Draft
  window.clearAIDraft = function(context) {
    const draftKey = `aiDraft_${context}`;
    localStorage.setItem(draftKey, '[]');
    AIState.draft = [];
    refreshDraftTable(context);
  };

  // Remove from Draft
  window.removeFromAIDraft = function(context, id) {
    const draftKey = `aiDraft_${context}`;
    const existing = JSON.parse(localStorage.getItem(draftKey) || '[]');
    const filtered = existing.filter(item => String(item.id) !== String(id));
    localStorage.setItem(draftKey, JSON.stringify(filtered));
    AIState.draft = filtered;
    refreshDraftTable(context);
  };

  // Refresh Draft Table
  function refreshDraftTable(context) {
    const event = new CustomEvent('aiDraftUpdated', { detail: { context } });
    document.dispatchEvent(event);
  }

  // Update Voice UI
  function updateVoiceUI(isListening) {
    const voiceBtn = document.getElementById('ai-voice-btn');
    const voiceStatus = document.getElementById('ai-voice-status');
    
    if (voiceBtn) {
      voiceBtn.classList.toggle('listening', isListening);
      voiceBtn.innerHTML = isListening ? '⏹️ Stop' : '🎤 Voice';
    }
    
    if (voiceStatus) {
      voiceStatus.textContent = isListening ? 'Mendengarkan...' : 'Klik untuk mulai';
      voiceStatus.classList.toggle('active', isListening);
    }
  }

  // Update Transcript Display
  function updateTranscriptDisplay(text) {
    const transcriptEl = document.getElementById('ai-transcript');
    if (transcriptEl) {
      transcriptEl.value = text;
    }
  }

  // Process Paste WA
  window.processAIPasteWA = function(context) {
    const pasteEl = document.getElementById('ai-paste-text');
    if (!pasteEl) return;
    
    const text = pasteEl.value.trim();
    if (!text) {
      alert('Masukkan teks dari WA terlebih dahulu');
      return;
    }
    
    console.log('AI Input Center: Processing Paste WA for', context);
    
    switch(context) {
      case 'barang':
        // Use existing parseProductText
        if (window.parseProductText) {
          const rows = window.parseProductText(text);
          rows.forEach(row => addToDraft('barang', { ...row, id: Date.now() + Math.random() }));
        }
        break;
      case 'kalkulator':
        // Use existing parseShoppingText
        if (window.parseShoppingText) {
          const rows = window.parseShoppingText(text);
          rows.forEach(row => addToDraft('kalkulator', row));
        }
        break;
      case 'penjualan':
        // Parse as sales
        const items = parseSalesFromVoice(text);
        items.forEach(item => addToDraft('penjualan', item));
        break;
    }
    
    pasteEl.value = '';
  };

  // Process Manual Input
  window.processAIManual = function(context) {
    const manualEl = document.getElementById('ai-manual-text');
    if (!manualEl) return;
    
    const text = manualEl.value.trim();
    if (!text) {
      alert('Masukkan data manual terlebih dahulu');
      return;
    }
    
    console.log('AI Input Center: Processing Manual for', context);
    
    // Process same as voice
    AIState.transcript = text;
    AIState.currentContext = context;
    processVoiceInput();
    
    manualEl.value = '';
  };

  // Bind Events
  function bindAIInputEvents() {
    // Voice button
    document.addEventListener('click', function(e) {
      if (e.target.matches('#ai-voice-btn')) {
        const context = e.target.dataset.context;
        if (AIState.isListening) {
          window.stopVoiceInput();
        } else {
          window.startVoiceInput(context);
        }
      }
      
      if (e.target.matches('#ai-paste-btn')) {
        const context = e.target.dataset.context;
        window.processAIPasteWA(context);
      }
      
      if (e.target.matches('#ai-manual-btn')) {
        const context = e.target.dataset.context;
        window.processAIManual(context);
      }
      
      if (e.target.matches('#ai-clear-draft-btn')) {
        const context = e.target.dataset.context;
        if (confirm('Kosongkan draft?')) {
          window.clearAIDraft(context);
        }
      }
    });
  }

  // Generate AI Input Panel HTML
  window.generateAIInputPanel = function(context) {
    const isVoiceSupported = window.isVoiceSupported();
    const voiceClass = isVoiceSupported ? '' : 'disabled';
    const voiceTitle = isVoiceSupported ? 'Klik untuk input suara' : 'Browser tidak mendukung voice input';
    
    return `
      <div class="ai-input-panel" data-context="${context}">
        <div class="ai-input-header">
          <h3>🤖 AI Input Center</h3>
          <p class="muted">Pilih metode input: Voice, Paste WA, atau Manual</p>
        </div>
        
        <div class="ai-input-methods">
          <!-- Voice Input -->
          <div class="ai-method ${voiceClass}" title="${voiceTitle}">
            <button id="ai-voice-btn" data-context="${context}" class="ai-method-btn ${isVoiceSupported ? '' : 'disabled'}">
              🎤 Voice
            </button>
            <span id="ai-voice-status" class="ai-status">${isVoiceSupported ? 'Klik untuk mulai' : 'Tidak didukung'}</span>
          </div>
          
          <!-- Paste WA -->
          <div class="ai-method">
            <label>📋 Paste WA</label>
            <textarea id="ai-paste-text" class="ai-textarea" placeholder="Paste dari WhatsApp...
Contoh:
Payung 5
Gula Pasir 2
Beras Premium 1"></textarea>
            <button id="ai-paste-btn" data-context="${context}" class="btn soft">Proses Paste</button>
          </div>
          
          <!-- Manual Input -->
          <div class="ai-method">
            <label>⌨️ Manual Cepat</label>
            <textarea id="ai-manual-text" class="ai-textarea" placeholder="Ketik manual...
Contoh: Gula Jawa stok 20 harga beli 180000 harga jual 200000"></textarea>
            <button id="ai-manual-btn" data-context="${context}" class="btn soft">Proses Manual</button>
          </div>
        </div>
        
        <!-- Transcript Display -->
        <div class="ai-transcript-box">
          <label>Hasil Transkripsi</label>
          <textarea id="ai-transcript" class="ai-textarea" readonly placeholder="Hasil voice akan muncul di sini..."></textarea>
        </div>
        
        <!-- Draft Section -->
        <div class="ai-draft-section">
          <div class="ai-draft-header">
            <h4>📋 Draft (${window.getAIDraft(context).length} item)</h4>
            <button id="ai-clear-draft-btn" data-context="${context}" class="btn danger">Kosongkan</button>
          </div>
          <div id="ai-draft-table-${context}" class="ai-draft-table">
            ${generateDraftTable(context)}
          </div>
        </div>
      </div>
    `;
  };

  // Generate Draft Table
  function generateDraftTable(context) {
    const draft = window.getAIDraft(context);
    if (!draft.length) {
      return '<p class="muted">Belum ada draft. Gunakan Voice, Paste WA, atau Manual untuk menambah.</p>';
    }
    
    let headers = [];
    let fields = [];
    
    switch(context) {
      case 'barang':
        headers = ['Nama', 'Stok', 'Harga Beli', 'Harga Jual', 'Aksi'];
        fields = ['name', 'stock', 'basePrice', 'salePrice'];
        break;
      case 'kalkulator':
        headers = ['Nama', 'Qty', 'Aksi'];
        fields = ['name', 'qty'];
        break;
      case 'penjualan':
        headers = ['Nama', 'Qty', 'Tanggal', 'Aksi'];
        fields = ['name', 'qty', 'date'];
        break;
    }
    
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${draft.map(item => `
              <tr>
                ${fields.map(f => `<td>${item[f] || '-'}</td>`).join('')}
                <td>
                  <button class="btn danger" onclick="window.removeFromAIDraft('${context}', '${item.id}')">Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Listen for draft updates
  document.addEventListener('aiDraftUpdated', function(e) {
    const context = e.detail.context;
    const tableEl = document.getElementById(`ai-draft-table-${context}`);
    if (tableEl) {
      tableEl.innerHTML = generateDraftTable(context);
    }
  });

})();
 