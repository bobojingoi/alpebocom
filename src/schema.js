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
      email: contact.email || "office@alpebocom.ro",
      telephone: contact.phone ? "+40" + contact.phone.replace(/\D/g, "").replace(/^(0040|40|0)/, "") : undefined,
      taxID: "16454119",
      vatID: "RO16454119",
      foundingDate: "2004",
      areaServed: [
        { "@type": "AdministrativeArea", name: "Județul Brașov" },
        { "@type": "Country", name: "România" },
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Str. Nisipului 155",
        addressLocality: "Cristian",
        addressRegion: "Brașov",
        postalCode: "507055",
        addressCountry: "RO",
      },
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
