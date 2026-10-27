import { Plus } from 'lucide-react';

// Native disclosure widgets: keyboard and screen-reader friendly without JavaScript.
// `.disclosure` animates the height open and closed where ::details-content is supported.
export function FaqAccordion({ items, isFirstOpen = true }) {
  return (
    <div className="space-y-2.5">
      {items.map((item, itemIndex) => (
        <details
          key={item.id}
          open={isFirstOpen && itemIndex === 0}
          className="disclosure group relative overflow-hidden rounded-xl border border-line-canvas bg-canvas-alt transition-[border-color,background-color,box-shadow] duration-(--dur-200) ease-(--ease-standard) hover:border-primary/40 open:border-primary/45 open:bg-canvas-raised open:shadow-card motion-reduce:transition-none"
        >
          {/* Rose-gold edge marks the open question */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-gradient-to-b from-primary-bright to-primary transition-transform duration-(--dur-300) ease-(--ease-out-soft) group-open:scale-y-100 motion-reduce:transition-none" />
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15px] font-semibold text-on-canvas transition-colors duration-(--dur-150) group-hover:text-white [&::-webkit-details-marker]:hidden">
            {item.question}
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-canvas text-primary-bright transition-[transform,background-color,border-color] duration-(--dur-300) ease-(--ease-out-soft) group-hover:border-primary/50 group-open:rotate-45 group-open:border-primary group-open:bg-primary group-open:text-canvas motion-reduce:transition-none"
            >
              <Plus className="size-4" strokeWidth={2.25} />
            </span>
          </summary>
          <p className="max-w-prose px-5 pb-5 text-sm leading-6 text-on-canvas-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
