import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Shell, ProjectCard, useHubContent } from "./Alpebocom.jsx";
import NotFound from "./NotFound.jsx";
import { IS_BROWSER } from "./env.js";

export default function ProjectsPage() {
  const c = useHubContent();
  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          <h1>Portofoliul nostru</h1>
          <p>{c.projects.intro}</p>
        </div>
      </div>
      <div className="section">
        <div className="container">
          <div className="proj-grid" style={{ marginTop: 0 }}>
            {c.projects.items.map((p) => (
              <ProjectCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function ProjectPage() {
  const { slug } = useParams();
  const c = useHubContent();
  const p = c.projects.items.find((x) => x.slug === slug);

  useEffect(() => {
    if (IS_BROWSER && p) document.title = `${p.title} — proiect Alpebocom`;
  }, [p]);

  if (!p) return <NotFound />;

  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          {p.category ? <span className="proj-tag">{p.category}</span> : null}
          <h1>{p.title}</h1>
          <p>{[p.location, p.year].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="section">
        <div className="container prose">
          {p.image ? (
            <img
              src={p.image}
              alt={p.imageAlt || p.title}
              style={{ borderRadius: 14, marginBottom: 26 }}
              fetchPriority="high"
              decoding="async"
            />
          ) : null}
          {(p.body || p.summary || "").split("\n\n").filter(Boolean).map((par, i) => (
            <p key={i}>{par}</p>
          ))}
          {Array.isArray(p.highlights) && p.highlights.length ? (
            <>
              <h2>Ce am executat</h2>
              <ul>
                {p.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </>
          ) : null}
          {Array.isArray(p.images) && p.images.length ? (
            <div className="gallery">
              {p.images.map((img, i) => (
                <img key={i} src={img.src || img} alt={img.alt || p.title} loading="lazy" />
              ))}
            </div>
          ) : null}
          <p style={{ marginTop: 34 }}>
            <Link to="/#contact" className="btn btn-primary">
              Vrei o lucrare similară? Cere ofertă
            </Link>
          </p>
        </div>
      </div>
    </Shell>
  );
}
