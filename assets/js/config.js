// Konfigurasi Global URL Backend
// Secara otomatis mendeteksi apakah berjalan di localhost atau production
const hostname = window.location.hostname;

window.API_BASE_URL = (hostname === "localhost" || hostname === "127.0.0.1") 
    ? "http://localhost:3000" 
    : "https://api.alvezadigital.com"; // Ganti dengan subdomain API yang diinginkan, misal api.alvezadigital.com
