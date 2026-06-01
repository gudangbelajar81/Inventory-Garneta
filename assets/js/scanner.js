export async function startScanner(videoElement, onResult) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Browser belum mendukung akses kamera.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  videoElement.srcObject = stream;
  await videoElement.play();

  if (!("BarcodeDetector" in window)) {
    onResult("Scanner aktif. BarcodeDetector belum tersedia di browser ini.");
    return () => stream.getTracks().forEach((track) => track.stop());
  }

  const detector = new BarcodeDetector({ formats: ["qr_code", "ean_13", "code_128"] });
  let active = true;

  async function scan() {
    if (!active) return;
    const codes = await detector.detect(videoElement);
    if (codes.length > 0) onResult(codes[0].rawValue);
    requestAnimationFrame(scan);
  }

  scan();
  return () => {
    active = false;
    stream.getTracks().forEach((track) => track.stop());
  };
}
