import { Container } from '@/components/ui/section';

// Renders only real figures passed in by the caller; with nothing to show it renders nothing
export function StatsStrip({ label, stats }) {
  if (!stats?.length) return null;
  return (
    <section aria-label={label} className="relative isolate bg-linear-to-b from-primary to-primary-bright py-10 text-canvas lg:py-12">
      <Container>
        <dl className="grid gap-8 text-center sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.key}>
              <dt className="text-[15px] font-medium text-canvas/80">{stat.label}</dt>
              <dd className="tabular mt-1 font-display text-4xl font-bold drop-shadow-[0_1px_0_rgb(255_255_255/0.25)] lg:text-[2.75rem]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
