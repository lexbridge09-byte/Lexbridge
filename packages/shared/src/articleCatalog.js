export const ARTICLE_TOPICS = [
  { key: 'criminal-law', label: 'Criminal law', summary: 'Understand common criminal-law concepts and procedures.' },
  { key: 'civil-law', label: 'Civil law', summary: 'Explore everyday civil disputes and legal remedies.' },
  { key: 'consumer-law', label: 'Consumer law', summary: 'Learn about consumer rights and complaint mechanisms.' },
  { key: 'property-law', label: 'Property law', summary: 'Understand common property-related legal issues.' },
  { key: 'contracts', label: 'Contracts', summary: 'Learn what to look for before signing an agreement.' },
  { key: 'business-law', label: 'Business law', summary: 'Practical legal information for entrepreneurs and businesses.' },
];

export const ARTICLE_TOPIC_KEYS = ARTICLE_TOPICS.map((topic) => topic.key);

export const ARTICLE_STATUSES = ['draft', 'published'];
