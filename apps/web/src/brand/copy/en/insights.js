export const insights = {
  metadata: {
    title: 'Legal insights',
    description: 'Plain-language guides to everyday legal issues.',
  },
  header: {
    title: 'Legal insights',
    lead: 'Plain-language guides to everyday legal issues.',
  },

  topicsLabel: 'Topics',
  allTopics: 'All',
  latestTitle: 'Latest guides',
  popularTitle: 'Popular guides',
  preparingNote: 'Full guides coming soon.',
  emptyTopic: 'No guides on this topic yet.',
  browseAll: 'See all guides',

  // Shown while no articles are published or the API is unreachable
  popularGuides: [
    'Received a legal notice? What to do next',
    'Bail vs anticipatory bail',
    'Check this before signing a contract',
    'How consumer complaints work',
    'Papers to keep for a property deal',
    'What an NDA is and when to use one',
  ],

  article: {
    breadcrumbLabel: 'Breadcrumb',
    insightsLink: 'Insights',
    published: (dateLabel) => `Published ${dateLabel}`,
    updated: (dateLabel) => `Updated ${dateLabel}`,
    loadErrorTitle: 'Guide unavailable',
    loadErrorBody: 'Please try again shortly.',
    backToInsights: 'Back to insights',
    asideTitle: 'Need help with this?',
    asideBody: 'Tell us what happened.',
  },
};
