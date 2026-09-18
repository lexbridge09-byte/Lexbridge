'use client';

import { PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ProductCard } from '@/components/commerce/productCard';
import { useCatalogLabels } from '@/lib/localeTools';

const TAB_CLASS = 'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold';

// Category tabs over the full published list; the choice is mirrored into ?category= so it can be shared
export function ProductCatalog({ products, initialCategory = '' }) {
  const copy = useDictionary().commerce.catalogue;
  const labels = useCatalogLabels();
  const categoryKeys = PRODUCT_CATEGORY_KEYS.filter((categoryKey) => products.some((product) => product.Category === categoryKey));
  const [activeCategory, setActiveCategory] = useState(categoryKeys.includes(initialCategory) ? initialCategory : '');
  const visibleProducts = activeCategory ? products.filter((product) => product.Category === activeCategory) : products;

  function selectCategory(categoryKey) {
    setActiveCategory(categoryKey);
    const url = new URL(window.location.href);
    if (categoryKey) url.searchParams.set('category', categoryKey);
    else url.searchParams.delete('category');
    window.history.replaceState(null, '', url);
  }

  const tabs = [{ key: '', label: copy.allCategories }, ...categoryKeys.map((categoryKey) => ({ key: categoryKey, label: labels.productCategory(categoryKey) }))];

  return (
    <div>
      <div role="group" aria-label={copy.tabsLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeCategory;
          return (
            <button
              key={tab.key || 'all'}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectCategory(tab.key)}
              className={`${TAB_CLASS} ${isActive ? 'bg-primary text-white' : 'bg-white text-ink-muted ring-1 ring-line hover:text-ink'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="mt-6 text-ink-muted">{copy.empty}</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <li key={product._id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
