import { ChevronDown } from 'lucide-react';

// Native disclosure widgets: keyboard and screen-reader friendly without JavaScript
export function FaqAccordion({ items, isFirstOpen = true }) {
  return (
    <div className="space-y-2.5">
      {items.map((item, itemIndex) => (
        <details key={item.id} open={isFirstOpen && itemIndex === 0} className="group rounded-xl border border-line-canvas bg-canvas-alt open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-[15px] font-semibold text-on-canvas [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-primary-bright transition-transform duration-(--dur-200) ease-(--ease-standard) motion-reduce:transition-none group-open:rotate-180"
              strokeWidth={2}
            />
          </summary>
          <p className="px-5 pb-4 text-sm leading-6 text-on-canvas-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
