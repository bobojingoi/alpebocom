import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { IS_BROWSER } from "./env.js";

/* Montarea e strict client-side: la pre-randare modulul e importat în Node,
   unde nu există document. */
if (IS_BROWSER) {
  const rootEl = document.getElementById("root");
  const app = (
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  /* Paginile pre-randate vin cu HTML gata făcut — le hidratăm; rutele servite
     ca SPA (spa.html) pornesc goale și se randează de la zero. */
  if (rootEl.hasChildNodes()) {
    ReactDOM.hydrateRoot(rootEl, app);
  } else {
    ReactDOM.createRoot(rootEl).render(app);
  }
}
