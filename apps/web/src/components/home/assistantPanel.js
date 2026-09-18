import { Sparkles } from 'lucide-react';
import { Button, Section } from '@/components/ui';

// Plain GET form: works without JavaScript and hands the text to the solution finder page
export function AssistantPanel({ copy, action }) {
  return (
    <Section labelledBy="assistant-title" size="sm">
      <div className="grid items-center gap-6 rounded-panel border border-line bg-assistant p-5 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-dark ring-1 ring-primary-100">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
            {copy.pill}
          </span>
          <h2 id="assistant-title" className="mt-3 text-section text-ink">
            {copy.title}
          </h2>
          <p className="mt-2 leading-7 text-ink-muted">{copy.description}</p>
        </div>

        <form action={action} method="get" className="rounded-panel bg-white p-4 shadow-soft ring-1 ring-line sm:p-5">
          <div className="rounded-xl border-2 border-dashed border-primary-100 p-3.5 focus-within:border-primary">
            <label htmlFor="home-concern" className="flex items-center gap-2 text-h4 text-ink">
              <Sparkles aria-hidden="true" className="size-5 text-primary" strokeWidth={1.75} />
              {copy.formLabel}
            </label>
            <textarea
              id="home-concern"
              name="concern"
              rows={3}
              required
              minLength={15}
              maxLength={3000}
              placeholder={copy.placeholder}
              className="mt-2 block w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-ink placeholder:text-ink-muted/70 focus:outline-none"
            />
          </div>
          <Button type="submit" isFullWidth className="mt-3">
            {copy.submit}
          </Button>
          <p className="mt-2 text-center text-xs leading-5 text-ink-muted">{copy.note}</p>
        </form>
      </div>
    </Section>
  );
}
