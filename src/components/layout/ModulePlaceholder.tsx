import { PageHeader } from "./AppShell";

export function ModulePlaceholder({
  title,
  subtitle,
  stage,
  items,
}: {
  title: string;
  subtitle: string;
  stage: string;
  items: string[];
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="-mt-10 px-6 pb-10 md:px-10">
        <section className="rounded-xl bg-card p-6 shadow-card">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            Previsto para a {stage}
          </span>
          <h2 className="mt-4 text-lg font-semibold">O que este módulo vai oferecer</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i} className="flex gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {i}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
