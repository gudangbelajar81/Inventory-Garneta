const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const regex = /const adminModules = \[[\s\S]*?\];\s*\/\/\s*Modul untuk Super Admin \(semua\)\s*const superAdminModules = \[[\s\S]*?\];/;

const replacement = `const adminModules = [
      { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
      { id: "penjualan", name: "Penjualan", icon: "💵", desc: "Input transaksi", core: true },
      { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" },
      { id: "supplier", name: "Supplier", icon: "🏭", desc: "Data supplier" },
      { id: "ngitung", name: "NGITUNG", icon: "🧮", desc: "Kasir Cepat" },
      { id: "kalkulator", name: "Kalkulator", icon: "🧮", desc: "Hitung manual" }
    ];
      
    // Modul untuk Super Admin (semua)
    const superAdminModules = [
      { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
      { id: "penjualan", name: "Penjualan", icon: "💵", desc: "Input transaksi", core: true },
      { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" },
      { id: "supplier", name: "Supplier", icon: "🏭", desc: "Data supplier" },
      { id: "ngitung", name: "NGITUNG", icon: "🧮", desc: "Kasir Cepat" },
      { id: "kalkulator", name: "Kalkulator", icon: "🧮", desc: "Hitung manual" },
      { id: "laporan", name: "Laporan", icon: "📈", desc: "Laporan harian" },
      { id: "statistik", name: "Statistik", icon: "📊", desc: "Analisis data" },
      { id: "users", name: "Users", icon: "👥", desc: "Manajemen user" },
      { id: "gaji", name: "Gaji & Bon", icon: "💸", desc: "Gaji Karyawan" },
      { id: "audit", name: "Audit Log", icon: "🕵️‍♂️", desc: "Riwayat aktivitas" },
      { id: "settings", name: "Setting", icon: "⚙️", desc: "Pengaturan" }
    ];`;

content = content.replace(regex, replacement);
fs.writeFileSync('index.html', content, 'utf8');
console.log('Done');
