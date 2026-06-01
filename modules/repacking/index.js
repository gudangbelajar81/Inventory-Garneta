import { formatCurrency, list } from "../../assets/js/api.js";
import { can } from "../../assets/js/auth.js";
import { table } from "../../assets/components/table.js";

export function render() {
  return `
    <section class="space-y-4">
      <div>
        <h2 class="text-xl font-bold">Repacking</h2>
        <p class="text-sm text-slate-500">Net weight = gross weight - shrinkage. Cost/kg = purchase price / net weight.</p>
      </div>
      ${table([
        { key: "product", label: "Barang" },
        { key: "grossWeight", label: "Gross" },
        { key: "shrinkage", label: "Susut" },
        { key: "netWeight", label: "Net" },
        { key: "costPerKg", label: "HPP/Kg", render: (row) => can("view_cost_price") ? formatCurrency(row.costPerKg) : "-" }
      ], list("repacking"))}
    </section>
  `;
}
