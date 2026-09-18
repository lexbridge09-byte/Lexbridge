import { Check } from 'lucide-react';
import { getDictionary, requireFeaturePage } from '@/brand';
import { LoginForm } from '@/components/loginForm';
import { Card, Section } from '@/components/ui';
import { deriveSafeNextPath } from '@/lib/safeRedirect';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).auth.metadata.title, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params, searchParams }) {
  requireFeaturePage('clientAccounts');
  const { lang } = await params;
  const { next } = await searchParams;
  const copy = getDictionary(lang).auth;

  return (
    <Section tone="alt" size="sm">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="order-2 lg:order-1">
          <h1 className="text-h2 text-ink">{copy.title}</h1>
          <p className="mt-3 max-w-md leading-7 text-ink-muted">{copy.body}</p>
          <ul className="mt-5 space-y-3">
            {copy.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 font-medium text-ink">
                <span className="flex size-6 items-center justify-center rounded-full bg-success-50 text-success">
                  <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <Card padding="lg" className="order-1 shadow-soft lg:order-2">
          <LoginForm nextPath={deriveSafeNextPath(typeof next === 'string' ? next : '')} />
        </Card>
      </div>
    </Section>
  );
}
