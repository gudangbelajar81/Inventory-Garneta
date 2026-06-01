import { getSession, switchRole } from "../js/auth.js";

export function topbar() {
  const session = getSession();

  return `
    <header class="sticky top-0 z-10 border-b border-white/70 bg-white/80 px-4 py-3 backdrop-blur-xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase text-green-700">Single Page Application</p>
          <h2 class="text-lg font-bold">Retail Inventory & Profit Monitoring</h2>
        </div>
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-gradient-to-br from-green-50 to-orange-50 px-3 py-2 text-right text-sm">
            <p id="current-date" class="font-semibold text-slate-800">-</p>
            <p id="current-time" class="text-xs font-bold text-green-700">-</p>
          </div>
          <select id="role-switcher" class="rounded-md border border-green-200 bg-white px-3 py-2 text-sm">
            <option ${session.role === "Super Admin" ? "selected" : ""}>Super Admin</option>
            <option ${session.role === "Employee" ? "selected" : ""}>Employee</option>
          </select>
          <div class="text-right text-sm">
            <p class="font-semibold">${session.name}</p>
            <p class="text-slate-500">${session.role}</p>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function bindTopbar() {
  const updateClock = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(now);
    const time = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);

    const dateElement = document.querySelector("#current-date");
    const timeElement = document.querySelector("#current-time");
    if (dateElement) dateElement.textContent = date;
    if (timeElement) timeElement.textContent = time;
  };

  updateClock();
  setInterval(updateClock, 1000);

  document.querySelector("#role-switcher")?.addEventListener("change", (event) => {
    switchRole(event.target.value);
    location.reload();
  });
}
