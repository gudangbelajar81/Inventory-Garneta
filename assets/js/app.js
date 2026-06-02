import { applySidebarTheme, sidebar, mobileNav } from "../components/sidebar.js";
import { topbar, bindTopbar } from "../components/topbar.js";
import { footer } from "../components/footer.js";
import { startRouter } from "./router.js";
import { applyTheme } from "./theme.js";

const app = document.querySelector("#app");
applySidebarTheme();
applyTheme();

function renderApp() {
  app.innerHTML = `
    <div class="app-shell">
      ${sidebar()}
      <div class="content-area min-h-screen">
        ${topbar()}
        <main id="page" class="p-4 md:p-6"></main>
        ${footer()}
      </div>
      ${mobileNav()}
    </div>
  `;

  bindTopbar();
  startRouter(document.querySelector("#page"));
}

renderApp();
