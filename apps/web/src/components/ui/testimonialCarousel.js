import { Quote } from 'lucide-react';
import { Section, SectionHeader } from '@/components/ui/section';

// Only real, consented client quotes belong in brand config; with none configured the section is not rendered
export function TestimonialCarousel({ title, items }) {
  if (!items?.length) return null;
  return (
    <Section tone="alt" labelledBy="testimonials-title">
      <SectionHeader id="testimonials-title" title={title} />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {items.map((testimonial) => (
          <li
            key={`${testimonial.name}-${testimonial.city}`}
            className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl bg-white p-6 shadow-card sm:w-[26rem]"
          >
            <Quote aria-hidden="true" className="size-8 text-primary-100" strokeWidth={1.5} />
            <blockquote className="mt-3 flex-1 text-sm leading-6 text-ink">{testimonial.quote}</blockquote>
            <p className="mt-5 font-display font-bold text-ink">{testimonial.name}</p>
            {testimonial.city && <p className="text-xs text-ink-muted">{testimonial.city}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
