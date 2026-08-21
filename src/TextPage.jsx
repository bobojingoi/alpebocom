import React from "react";
import { Shell } from "./Alpebocom.jsx";

/* Randează un document legal din src/legal.js. Rândurile care încep cu "- "
   se grupează în liste; restul sunt paragrafe. */
function Body({ body }) {
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={"ul" + out.length}>
          {list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  for (const line of body) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else {
      flush();
      out.push(<p key={"p" + out.length}>{line}</p>);
    }
  }
  flush();
  return out;
}

export default function TextPage({ doc }) {
  return (
    <Shell>
      <div className="page-head">
        <div className="container">
          <h1>{doc.title}</h1>
          <p>Ultima actualizare: {doc.updated}</p>
        </div>
      </div>
      <div className="section">
        <div className="container prose">
          {doc.sections.map((s, i) => (
            <section key={i}>
              {s.h ? <h2>{s.h}</h2> : null}
              <Body body={s.body} />
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
