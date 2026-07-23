// Konfigurasi Global URL Backend
// Secara otomatis mendeteksi apakah berjalan di localhost atau production
const hostname = window.location.hostname;

window.API_BASE_URL = (hostname === "localhost" || hostname === "127.0.0.1") 
    ? "http://localhost:3000" 
    : "https://api-garneta.gudangbelajar81.com"; // Ganti dengan URL VPS Hostinger (Domain/Subdomain API)
