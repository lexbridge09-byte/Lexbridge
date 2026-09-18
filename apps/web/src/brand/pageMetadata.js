import { getDictionary } from './i18n.js';

// For pages whose metadata is just a title from the dictionary:
// export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.requests.metadataTitle);
export function titleMetadata(selectTitle) {
  return async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: selectTitle(getDictionary(lang)) };
  };
}
