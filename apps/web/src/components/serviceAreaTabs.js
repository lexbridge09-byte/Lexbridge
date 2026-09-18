'use client';

import { Check } from 'lucide-react';
import { createElement, useSyncExternalStore } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ButtonLink } from '@/components/ui';
import { getServiceIcon } from '@/lib/icons';

function subscribeToHash(onChange) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const readHash = () => window.location.hash.slice(1);
const readServerHash = () => '';

// One service area visible at a time; "/services#contract-review" opens that tab (header menu links use this)
export function ServiceAreaTabs({ serviceKeys, serviceHrefs }) {
  const copy = useDictionary().services;
  const hashKey = useSyncExternalStore(subscribeToHash, readHash, readServerHash);
  const activeKey = serviceKeys.includes(hashKey) ? hashKey : serviceKeys[0];

  function selectTab(serviceKey) {
    window.history.replaceState(null, '', `#${serviceKey}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function handleKeyDown(event) {
    const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!offset) return;
    event.preventDefault();
    const nextIndex = (serviceKeys.indexOf(activeKey) + offset + serviceKeys.length) % serviceKeys.length;
    selectTab(serviceKeys[nextIndex]);
    document.getElementById(`service-tab-${serviceKeys[nextIndex]}`)?.focus();
  }

  const service = copy.items[activeKey];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[17rem_1fr] lg:gap-8">
      <div
        role="tablist"
        aria-label={copy.tabsLabel}
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-1 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-2 lg:shadow-sm"
      >
        {serviceKeys.map((serviceKey) => {
          const isActive = serviceKey === activeKey;
          return (
            <button
              key={serviceKey}
              id={`service-tab-${serviceKey}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="service-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(serviceKey)}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold lg:rounded-xl lg:px-3 lg:py-2.5 lg:text-left ${isActive ? 'bg-primary text-white lg:bg-primary-50 lg:text-primary-dark' : 'bg-surface-alt text-ink-muted hover:text-ink lg:bg-transparent lg:hover:bg-surface-alt'}`}
            >
              {createElement(getServiceIcon(serviceKey), { 'aria-hidden': true, className: 'hidden size-5 lg:block', strokeWidth: 1.75 })}
              {copy.items[serviceKey].title}
            </button>
          );
        })}
      </div>

      <section
        id="service-panel"
        role="tabpanel"
        aria-labelledby={`service-tab-${activeKey}`}
        className="rounded-panel border border-line bg-white p-5 shadow-sm sm:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
            {createElement(getServiceIcon(activeKey), { 'aria-hidden': true, className: 'size-6', strokeWidth: 1.75 })}
          </span>
          <div>
            <h2 className="text-h3 text-ink">{service.title}</h2>
            <p className="mt-1 leading-7 text-ink-muted">{service.intro}</p>
          </div>
        </div>
        <h3 className="mt-6 text-sm font-semibold text-ink-muted">{service.listLabel}</h3>
        <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {service.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[15px] leading-6 text-ink">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" strokeWidth={2.5} />
              {item}
            </li>
          ))}
        </ul>
        <ButtonLink href={serviceHrefs[activeKey]} className="mt-7">
          {service.ctaLabel}
        </ButtonLink>
      </section>
    </div>
  );
}
