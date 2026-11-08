import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Personal Finance Hub",
    short_name: "Finance Hub",
    description: "Controle financeiro PWA com dados demonstrativos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eff7f4",
    theme_color: "#126b63",
    lang: "pt-BR",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
