import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => null,
  head: () => ({
    meta: [
      { title: "Dr. Zaid Khaled Alamoudi | General Dentist in Amman" },
      { name: "description", content: "General and aesthetic dental care in Amman with Dr. Zaid Khaled Alamoudi." },
      { property: "og:title", content: "Dr. Zaid Khaled Alamoudi | General Dentist in Amman" },
      { property: "og:description", content: "Patient-focused dental treatments and appointments in Amman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { renderSitePage } = await import("@/lib/site-content/render.server");
        return renderSitePage(request, "index");
      },
    },
  },
});
