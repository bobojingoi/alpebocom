-- Alpebo Hub — schema bazei de date (Postgres / Supabase).
-- Schema `alpebo` e separată intenționat de `hub` (Roots), ca cele două
-- proiecte să poată împărți aceeași bază fără coliziuni.
-- server.js (prin db.js) rulează același DDL idempotent la pornire — fișierul
-- acesta e referința; dacă modifici aici, modifică și DDL-ul din db.js.

CREATE SCHEMA IF NOT EXISTS alpebo;

-- Conținutul site-ului, pe secțiuni (hero, services, projects, about, contact…).
-- draft = ce se editează în admin; published = ce vede site-ul.
CREATE TABLE IF NOT EXISTS alpebo.site_content (
  section_key  text PRIMARY KEY,
  draft        jsonb,
  published    jsonb,
  published_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Articole de blog. Corpul e text simplu: paragrafe despărțite prin rând gol,
-- subtitluri pe rânduri care încep cu "## " (vezi src/BlogPage.jsx pe site).
CREATE TABLE IF NOT EXISTS alpebo.posts (
  id              serial PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  excerpt         text,
  body            text,
  cover           text,
  seo_title       text,
  seo_description text,
  published       boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Cereri de ofertă venite de pe site (formularul „Cere ofertă de preț").
-- status: nou | contactat | ofertat | castigat | pierdut
CREATE TABLE IF NOT EXISTS alpebo.leads (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  phone      text,
  email      text,
  company    text,
  message    text,
  source     text,
  page       text,
  status     text NOT NULL DEFAULT 'nou',
  created_at timestamptz NOT NULL DEFAULT now()
);
