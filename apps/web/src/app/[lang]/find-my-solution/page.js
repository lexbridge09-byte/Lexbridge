import { getDictionary, requireFeaturePage } from '@/brand';
import { SolutionFinder } from '@/components/solutionFinder';
import { TaskPage } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).solutionFinder.metadata;
}

export default async function FindMySolutionPage({ params, searchParams }) {
  await requireFeaturePage('solutionFinder');
  const { lang } = await params;
  const { concern } = await searchParams;
  const copy = getDictionary(lang).solutionFinder;
  const initialConcern = typeof concern === 'string' ? concern.slice(0, 3000) : '';

  return (
    <TaskPage title={copy.header.title} lead={copy.header.lead}>
        {/* key resets the finder when a new concern arrives from the home page form */}
        <SolutionFinder key={initialConcern} initialConcern={initialConcern} />
    </TaskPage>
  );
}
