export function modal(id, title, body) {
  return `
    <dialog id="${id}" class="w-full max-w-lg rounded-lg border border-slate-200 p-0 shadow-xl">
      <div class="border-b border-slate-200 px-4 py-3">
        <h3 class="font-bold">${title}</h3>
      </div>
      <div class="p-4">${body}</div>
      <form method="dialog" class="border-t border-slate-200 px-4 py-3 text-right">
        <button class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Tutup</button>
      </form>
    </dialog>
  `;
}
