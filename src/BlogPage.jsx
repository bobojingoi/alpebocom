import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BUILD_POSTS from "virtual:hub-posts";
import { Shell, HUB_URL } from "./Alpebocom.jsx";
import NotFound from "./NotFound.jsx";
import { IS_BROWSER } from "./env.js";

/* Articolele: la build vin prin virtual:hub-posts (pre-randare); la runtime se
   reîmprospătează de la Hub, ca publicările noi să apară fără redeploy. */
let listFetch = null;
function usePosts() {
  const [posts, setPosts] = useState(BUILD_POSTS || []);
  useEffect(() => {
    if (!IS_BROWSER) return;
    let on = true;
    listFetch =
      listFetch ||
      fetch(HUB_URL + "/api/v1/posts")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    listFetch.then((j) => {
      if (on && j && Array.isArray(j.posts) && j.posts.length) setPosts(j.posts);
    });
    return () => {
      on = false;
    };
  }, []);
  return posts;
}

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
};

export default function BlogPage() {
  const posts = usePosts();
  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          <h1>Blog</h1>
          <p>Noutăți din șantier, ghiduri și articole despre construcții.</p>
        </div>
      </div>
      <div className="section">
        <div className="container">
          {posts.length ? (
            <div className="cards" style={{ marginTop: 0 }}>
              {posts.map((p) => (
                <Link
                  key={p.slug}
                  to={"/blog/" + p.slug}
                  className="card"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  {p.cover ? (
                    <img
                      src={p.cover}
                      alt={p.title}
                      loading="lazy"
                      style={{ borderRadius: 10, height: 170, width: "100%", objectFit: "cover", marginBottom: 16 }}
                    />
                  ) : null}
                  <h3>{p.title}</h3>
                  <p style={{ marginTop: 8 }}>{p.excerpt}</p>
                  <p style={{ marginTop: 10, fontSize: 13 }}>{fmtDate(p.published_at)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p>Primele articole sunt în lucru — revino curând.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* Corpul articolului: text simplu, paragrafe despărțite prin rând gol;
   rândurile care încep cu "## " devin subtitluri. */
function PostBody({ body }) {
  const blocks = String(body || "").split(/\n\s*\n/).filter(Boolean);
  return blocks.map((b, i) =>
    b.startsWith("## ") ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>
  );
}

export function BlogPostPage() {
  const { slug } = useParams();
  const fromBuild = (BUILD_POSTS || []).find((p) => p.slug === slug) || null;
  const [post, setPost] = useState(fromBuild);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!IS_BROWSER) return;
    if (post && post.body) return;
    let on = true;
    fetch(HUB_URL + "/api/v1/posts/" + encodeURIComponent(slug))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!on) return;
        if (j && j.post) setPost(j.post);
        else if (!post) setMissing(true);
      })
      .catch(() => {
        if (on && !post) setMissing(true);
      });
    return () => {
      on = false;
    };
  }, [slug]);

  useEffect(() => {
    if (IS_BROWSER && post) document.title = post.seo_title || `${post.title} — Blog Alpebocom`;
  }, [post]);

  if (missing) return <NotFound />;
  if (!post) {
    return (
      <Shell>
        <div className="section">
          <div className="container">
            <p>Se încarcă articolul…</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          <h1>{post.title}</h1>
          <p>{fmtDate(post.published_at)}</p>
        </div>
      </div>
      <div className="section">
        <article className="container prose">
          {post.cover ? (
            <img src={post.cover} alt={post.title} style={{ borderRadius: 14, marginBottom: 26 }} />
          ) : null}
          <PostBody body={post.body} />
          <p style={{ marginTop: 34 }}>
            <Link to="/blog">← Toate articolele</Link>
          </p>
        </article>
      </div>
    </Shell>
  );
}
