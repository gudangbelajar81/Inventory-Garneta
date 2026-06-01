import { startScanner } from "../../assets/js/scanner.js";
import { can } from "../../assets/js/auth.js";

let stopScanner = null;

export function render() {
  if (!can("scan_products")) {
    return `<div class="module-card p-6"><h2 class="text-xl font-bold">Akses dibatasi</h2><p class="mt-2 text-slate-500">Role ini tidak memiliki izin scanner.</p></div>`;
  }

  return `
    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Scanner</h2>
        <p class="text-sm text-slate-500">Barcode, QR, dan akses kamera.</p>
      </div>
      <div class="module-card p-4">
        <video id="scanner-video" class="aspect-video w-full rounded-md bg-slate-900" muted playsinline></video>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button id="start-scanner" class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">Mulai Scanner</button>
          <button id="stop-scanner" class="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Stop</button>
          <p id="scan-result" class="text-sm text-slate-600">Belum ada hasil scan.</p>
        </div>
      </div>
    </section>
  `;
}

export function afterRender() {
  const video = document.querySelector("#scanner-video");
  const result = document.querySelector("#scan-result");

  document.querySelector("#start-scanner")?.addEventListener("click", async () => {
    try {
      stopScanner = await startScanner(video, (value) => {
        result.textContent = `Hasil: ${value}`;
      });
    } catch (error) {
      result.textContent = error.message;
    }
  });

  document.querySelector("#stop-scanner")?.addEventListener("click", () => {
    stopScanner?.();
    result.textContent = "Scanner dihentikan.";
  });
}
