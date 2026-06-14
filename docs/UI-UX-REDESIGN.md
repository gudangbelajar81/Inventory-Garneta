# Garneta Neural Hub - UI/UX Redesign Document

## Konsep Utama

**"Garneta Neural Hub"** - Dashboard sebagai pusat sistem (AI Command Center) yang mengubah pengalaman pengguna dari sekadar aplikasi kasir menjadi pusat kendali cerdas dan modern.

---

## Filosofi UI

### Core Principle
- **Logo G** = Pusat sistem (otak AI)
- **Fitur = Node** yang mengelilingi pusat
- **Semakin sering digunakan** = Semakin dekat ke pusat
- **Semakin jarang digunakan** = Semakin jauh dari pusat

### Prioritas Node (Berdasarkan Frekuensi Penggunaan)

```
Lapisan 1 (Paling Dekat - Core Operations):
├── Cari Barang ⭐⭐⭐
├── Barang ⭐⭐⭐
└── Penjualan ⭐⭐⭐

Lapisan 2 (Secondary Operations):
├── Pembelian ⭐⭐
└── Kalkulator Belanja ⭐⭐

Lapisan 3 (Supporting):
├── Supplier ⭐
├── Laporan ⭐
└── Statistik ⭐

Lapisan 4 (Administrative - Super Admin Only):
├── Users
├── Audit Log
└── Setting
```

---

## Struktur Visual Node

### Neural Network Layout

```
                    [Statistik]
                         |
                    [Laporan]
                         |
    [Audit] — [Users] — [Setting]
                         |
    [Supplier] — [Pembelian] — [Kalkulator]
                         |
    [Cari Barang] — [BARANG] — [Penjualan]
                         |
                      [LOGO G]
                    (Pusat Sistem)
```

### Koneksi Visual
- Garis halus menghubungkan node terkait
- Garis menyala saat hover
- Animasi pulse pada node aktif
- Particle effect mengalir di garis koneksi

---

## Role-Based Dashboard

### Karyawan View
```
Node Aktif:
- Cari Barang (besar, dekat pusat)
- Barang (besar, dekat pusat)
- Penjualan (besar, dekat pusat)
- Pembelian (medium)
- Kalkulator Belanja (medium)

Node Tersembunyi:
- Users, Audit Log, Setting (tidak tampil)
- Laporan, Statistik (read-only summary saja)
```

### Admin View
```
Node Aktif:
- Semua node Lapisan 1-3
- Laporan & Statistik penuh

Node Tersembunyi:
- Users, Audit Log, Setting (tidak tampil)
```

### Super Admin View
```
Node Aktif:
- Semua node termasuk administratif
- Users, Audit Log, Setting (pojok kanan atas)
- Akses penuh ke semua fitur
```

---

## Fitur Pencarian Barang (Search Hub)

### Konsep: "Command Center Search"

#### Search Bar Utama
- **Posisi**: Tengah atas dashboard
- **Ukuran**: Large, prominent
- **Style**: Glassmorphism dengan glow effect
- **Placeholder**: "Cari barang, barcode, kategori, atau supplier..."

#### Auto Suggest & Auto Complete
```
┌─────────────────────────────────────────┐
│  🔍 Beras Premium                    ▼  │
├─────────────────────────────────────────┤
│  ⚡ Suggestions:                        │
│  ├── Beras Premium 5kg - Rp 65.000     │
│  ├── Beras Premium 10kg - Rp 125.000   │
│  └── Beras Pulen - Rp 58.000           │
│                                         │
│  📁 Filter: [Nama] [Barcode] [Kategori]│
└─────────────────────────────────────────┘
```

#### Quick Actions pada Hasil
```
┌─────────────────────────────────────────┐
│  Beras Premium 5kg                      │
│  Stok: 25 | Harga: Rp 65.000           │
│  ┌────────┬────────┬────────┐          │
│  │ 📋     │ 🛒     │ ✏️     │          │
│  │ Detail │ Jual   │ Edit   │          │
│  └────────┴────────┴────────┘          │
└─────────────────────────────────────────┘
```

---

## Sidebar Structure

### Grouping Menu

```
🏠 Dashboard
   └── Neural Hub Overview

📦 MASTER DATA
   ├── 🔍 Cari Barang (Quick Access)
   ├── 📦 Barang
   ├── 🏭 Supplier
   └── 👤 Users (Super Admin only)

💰 TRANSAKSI
   ├── 🛒 Pembelian
   └── 💵 Penjualan

🛠 TOOLS
   └── 🧮 Kalkulator Belanja

📊 ANALITIK
   ├── 📈 Laporan
   └── 📉 Statistik

⚙ SISTEM
   ├── 📋 Audit Log (Super Admin)
   └── 🔧 Setting (Super Admin)
```

---

## Progressive Disclosure Pattern

### Halaman Barang (Contoh Implementasi)

```
┌─────────────────────────────────────────┐
│  📦 Barang                              │
├─────────────────────────────────────────┤
│                                         │
│  [➕ Tambah Barang] [📥 Import] [📷 Scan]│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Search bar...               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📋 Tabel Barang (collapsed)    │   │
│  │ [Expand ▼]                     │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Panel yang Muncul saat Klik:

1. **Tambah Barang** → Slide panel dari kanan
2. **Import** → Modal dengan drag-drop area
3. **Scan** → Fullscreen camera overlay
4. **Edit** → Inline edit atau slide panel

---

## Interaksi & Animasi

### Node Interactions

| Event | Efek | Durasi |
|-------|------|--------|
| Hover Node | Glow + Scale 1.05 | 200ms |
| Hover Node | Garis koneksi menyala | 300ms |
| Klik Node | Ripple effect | 400ms |
| Klik Node | Navigate dengan fade | 300ms |
| Load Dashboard | Node muncul bertahap | 600ms |
| Data Update | Pulse pada node terkait | 500ms |

### Animasi Halus
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Micro-interactions**: Hover states, focus rings
- **Transitions**: Smooth 200-300ms
- **No jarring movements**

---

## Gaya Visual

### Color Palette

```css
/* Core Colors */
--garneta-dark-blue: #0b1f24;
--garneta-dark-green: #102a31;
--garneta-cyan: #24f0c7;
--garneta-cyan-glow: rgba(36, 240, 199, 0.4);
--garneta-orange: #ff7043;
--garneta-orange-glow: rgba(255, 112, 67, 0.4);
--garneta-white: #e8fbff;
--garneta-soft-text: #8fb4bd;

/* Neural Network Colors */
--node-core: #24f0c7;
--node-secondary: #ff7043;
--node-tertiary: #8df7df;
--connection-line: rgba(141, 247, 223, 0.3);
--connection-active: rgba(36, 240, 199, 0.8);

/* Glassmorphism */
--glass-bg: rgba(16, 42, 49, 0.85);
--glass-border: rgba(141, 247, 223, 0.2);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
```

### Typography

```css
/* Font Stack */
font-family: 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif;

/* Hierarchy */
--text-xs: 0.75rem;    /* 12px - Labels */
--text-sm: 0.875rem;   /* 14px - Body small */
--text-base: 1rem;     /* 16px - Body */
--text-lg: 1.125rem;   /* 18px - Subheadings */
--text-xl: 1.25rem;    /* 20px - Card titles */
--text-2xl: 1.5rem;    /* 24px - Section titles */
--text-3xl: 2rem;      /* 32px - Page titles */
--text-4xl: 2.5rem;    /* 40px - Hero text */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Spacing System

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## Komponen UI

### 1. Neural Node Component

```html
<div class="neural-node" data-priority="core" data-module="barang">
  <div class="node-glow"></div>
  <div class="node-icon">📦</div>
  <div class="node-label">Barang</div>
  <div class="node-connections">
    <svg class="connection-line" data-to="cari-barang"></svg>
    <svg class="connection-line" data-to="penjualan"></svg>
  </div>
</div>
```

### 2. Search Hub Component

```html
<div class="search-hub">
  <div class="search-glow"></div>
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input type="text" class="search-input" placeholder="Cari barang...">
    <div class="search-shortcut">⌘K</div>
  </div>
  <div class="search-suggestions">
   