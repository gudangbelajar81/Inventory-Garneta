const logger = require("../../config/logger");

async function checkPayday(db) {
  try {
    // Cari karyawan Bulanan yang aktif dan sudah melewati atau sama dengan 30 hari dari join_date
    const [rows] = await db.query(`
      SELECT id, name, phone, join_date, base_salary 
      FROM employees 
      WHERE status = 'Aktif' 
        AND salary_type = 'Bulanan' 
        AND DATEDIFF(CURDATE(), join_date) >= 30
      ORDER BY name ASC
    `);

    if (rows.length === 0) {
      logger.info("Cron payday: Tidak ada karyawan yang jatuh tempo gajian hari ini.");
      return { alerts: 0 };
    }

    logger.warn(`Cron payday: Ditemukan ${rows.length} karyawan jatuh tempo gaji!`);

    const fonnteToken = process.env.FONNTE_TOKEN;
    const targetWa = process.env.SUPERADMIN_WA;

    if (!fonnteToken || !targetWa) {
      logger.warn("Cron payday: Token Fonnte atau Nomor WA Super Admin belum diset di .env. Skip notifikasi WA.");
      return { alerts: rows.length, status: 'missing_config' };
    }

    // Loop through each employee and send reminder to superadmin
    let sentCount = 0;
    for (const emp of rows) {
      // Format number to Rupiah
      const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(emp.base_salary);
      
      const message = `🚨 *[PENGINGAT KETAT]*\n\nBos, gaji untuk *${emp.name}* (${rupiah}) SUDAH JATUH TEMPO dan belum dibayar! (Tgl Masuk/Gaji Terakhir: ${new Date(emp.join_date).toLocaleDateString('id-ID')}).\n\nSegera proses pencairan di sistem ya!`;
      
      try {
        const fonnteRes = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": fonnteToken,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            target: targetWa,
            message: message
          })
        });

        const fonnteData = await fonnteRes.json();
        if (fonnteData.status) {
          sentCount++;
          logger.info(`Cron payday: WA terkirim untuk gaji ${emp.name}.`);
        } else {
          logger.error(`Cron payday: Gagal kirim WA untuk ${emp.name}`, { detail: fonnteData.detail });
        }
      } catch (err) {
        logger.error(`Cron payday: Error memanggil API Fonnte untuk ${emp.name}`, { error: err.message });
      }
      
      // Kasih jeda 1 detik tiap pesan agar Fonnte tidak kena rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { alerts: rows.length, sent: sentCount };
  } catch (error) {
    logger.error("Cron payday: Terjadi kesalahan saat cek database.", { error: error.message });
    throw error;
  }
}

module.exports = { checkPayday };
