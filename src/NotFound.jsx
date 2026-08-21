import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Shell } from "./Alpebocom.jsx";
import { NOT_FOUND_META } from "./seo.js";
import { IS_BROWSER } from "./env.js";

export default function NotFound() {
  useEffect(() => {
    if (IS_BROWSER) document.title = NOT_FOUND_META.title;
  }, []);
  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          <h1>404 — Pagină negăsită</h1>
          <p>Pagina căutată nu există sau a fost mutată.</p>
        </div>
      </div>
      <div className="section">
        <div className="container">
          <Link to="/" className="btn btn-primary">
            Înapoi la prima pagină
          </Link>
        </div>
      </div>
    </Shell>
  );
}
