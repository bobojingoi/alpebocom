/* JSON-LD pentru pre-randare (prerender.mjs). Doar homepage-ul poartă schema
   firmei — pe restul paginilor ar fi doar duplicat, cu `url` greșit. */
import { SITE_URL } from "./seo.js";

export function schemasForRoute(route, raw = {}) {
  if (route !== "/") return [];
  const contact = (raw && raw.contact) || {};
  return [
    {
      "@context": "https://schema.org",
      "@type": "GeneralContractor",
      name: "Alpebocom",
      legalName: "ALPEBOCOM SRL",
      url: SITE_URL + "/",
      email: contact.email || "contact@alpebocom.ro",
      telephone: contact.phone || undefined,
      taxID: "16454119",
      foundingDate: "2004",
      areaServed: { "@type": "Country", name: "România" },
      address: { "@type": "PostalAddress", addressCountry: "RO" },
      knowsAbout: [
        "construcții industriale",
        "construcții rezidențiale",
        "infrastructură",
        "proiectare",
        "consultanță tehnică",
      ],
    },
  ];
}
