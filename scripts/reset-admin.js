/**
 * ══════════════════════════════════════════════════════════════
 * 🔐 RESET ADMIN EMERGENCY SCRIPT — AlvezaDigital
 * ══════════════════════════════════════════════════════════════
 * Jalankan HANYA dari terminal server (bukan via API):
 *   node scripts/reset-admin.js
 *
 * Script ini menggantikan "backdoor resetAdmin" yang sudah dihapus
 * dari endpoint publik karena alasan keamanan.
 * ══════════════════════════════════════════════════════════════
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const readline = require("readline");
const { databaseConfig } = require("../config/database");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  console.log("\n══════════════════════════════════════════════");
  console.log("🔐 RESET ADMIN — AlvezaDigital GARNETA STORE");
  console.log("══════════════════════════════════════════════\n");

  const newPassword = await ask("Masukkan password baru untuk Super Admin: ");
  const confirm = await ask("Konfirmasi password: ");

  if (!newPassword || newPassword !== confirm) {
    console.error("❌ Password tidak cocok atau kosong. Dibatalkan.");
    rl.close();
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error("❌ Password minimal 8 karakter.");
    rl.close();
    process.exit(1);
  }

  const { multipleStatements, ...config } = databaseConfig();
  const db = await mysql.createConnection(config);

  try {
    const [[adminRow]] = await db.query("SELECT name FROM users WHERE role = 'Super Admin' LIMIT 1");
    if (!adminRow) {
      console.error("❌ Tidak ada Super Admin di database.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash = ? WHERE role = 'Super Admin'", [hashed]);

    console.log(`\n✅ Password Super Admin "${adminRow.name}" berhasil di-reset menggunakan bcrypt!`);
    console.log("   Silakan login kembali dengan password baru.\n");
  } finally {
    await db.end();
    rl.close();
  }
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
