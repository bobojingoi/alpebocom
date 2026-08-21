import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { HomePage } from "./Alpebocom.jsx";
import ProjectsPage, { ProjectPage } from "./ProjectsPage.jsx";
import BlogPage, { BlogPostPage } from "./BlogPage.jsx";
import TextPage from "./TextPage.jsx";
import NotFound from "./NotFound.jsx";
import { LEGAL } from "./legal.js";
import { metaForRoute, canonicalFor, NOT_FOUND_META } from "./seo.js";
import { IS_BROWSER } from "./env.js";

/* Scroll + metadate la navigarea client-side. Pre-randarea pune metadatele în
   HTML-ul static; aici doar le ținem sincronizate când vizitatorul navighează
   în SPA. Paginile dinamice (/proiecte/:slug, /blog/:slug) își pun singure
   titlul, după ce își găsesc datele. */
function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!IS_BROWSER) return;
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  useEffect(() => {
    if (!IS_BROWSER) return;
    if (pathname.startsWith("/proiecte/") || pathname.startsWith("/blog/")) return;
    const meta = metaForRoute(pathname);
    document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", meta.description);
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon && meta !== NOT_FOUND_META) canon.setAttribute("href", canonicalFor(pathname));
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/proiecte" element={<ProjectsPage />} />
        <Route path="/proiecte/:slug" element={<ProjectPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/termeni-si-conditii" element={<TextPage doc={LEGAL.termeni} />} />
        <Route path="/politica-de-confidentialitate" element={<TextPage doc={LEGAL.confidentialitate} />} />
        <Route path="/politica-cookies" element={<TextPage doc={LEGAL.cookies} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
