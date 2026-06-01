export function table(columns, rows) {
  return `
    <div class="table-wrap rounded-lg border border-slate-200 bg-white">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>${columns.map((column) => `<th class="px-4 py-3 text-left font-semibold">${column.label}</th>`).join("")}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((row) => `
            <tr>${columns.map((column) => `<td class="px-4 py-3">${column.render ? column.render(row) : row[column.key]}</td>`).join("")}</tr>
          `).join("") || `<tr><td class="px-4 py-6 text-slate-500" colspan="${columns.length}">Belum ada data.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}
