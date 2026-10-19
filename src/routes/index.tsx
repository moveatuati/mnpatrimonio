import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rh Formosa — Augusto Montenegro" },
      { name: "description", content: "Rh Formosa — unidade Augusto Montenegro." },
      { property: "og:title", content: "Rh Formosa — Augusto Montenegro" },
      { property: "og:description", content: "Rh Formosa — unidade Augusto Montenegro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="text-center text-4xl font-bold text-foreground">
        Rh Formosa — Augusto Montenegro
      </h1>
    </main>
  );
}
