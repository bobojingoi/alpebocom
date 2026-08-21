/* Postgres (Supabase). Schema `alpebo` — separată intenționat de schema `hub`
   (Roots), ca cele două proiecte să poată împărți aceeași bază fără coliziuni.
   Fără DATABASE_URL, server.js rulează cu stocare în memorie (doar dev). */
require("dotenv").config();
const { Pool } = require("pg");

const hasDb = !!process.env.DATABASE_URL;
const pool = hasDb
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      ssl: process.env.DATABASE_SSL === "0" ? false : { rejectUnauthorized: false },
    })
  : null;

/* Idempotent — rulează la prima cerere a fiecărei instanțe serverless.
   Ținut în oglindă cu hub/schema.sql. */
const DDL = `
CREATE SCHEMA IF NOT EXISTS alpebo;

CREATE TABLE IF NOT EXISTS alpebo.site_content (
  section_key  text PRIMARY KEY,
  draft        jsonb,
  published    jsonb,
  published_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

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
`;

async function initDb() {
  if (!hasDb) return;
  await pool.query(DDL);
}

module.exports = { hasDb, pool, initDb };
