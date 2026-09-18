import { notFound } from 'next/navigation';

// Unknown paths under a locale render that locale's 404 page inside the site chrome
export default function MissingPage() {
  notFound();
}
