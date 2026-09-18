import { Container } from '@/components/ui/section';

// Renders only real figures passed in by the caller; with nothing to show it renders nothing
export function StatsStrip({ label, stats }) {
  if (!stats?.length) return null;
  return (
    <section aria-label={label} className="bg-linear-to-b from-primary-dark to-primary py-10 text-white lg:py-12">
      <Container>
        <dl className="grid gap-8 text-center sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.key}>
              <dt className="text-[15px] font-medium text-white/90">{stat.label}</dt>
              <dd className="mt-1 font-display text-4xl font-bold lg:text-[2.5rem]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
