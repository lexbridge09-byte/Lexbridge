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
    if (!offset && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? serviceKeys.length - 1 : (serviceKeys.indexOf(activeKey) + offset + serviceKeys.length) % serviceKeys.length;
    selectTab(serviceKeys[nextIndex]);
    document.getElementById(`service-tab-${serviceKeys[nextIndex]}`)?.focus();
  }

  const service = copy.items[activeKey];
  if (!service) return null;

  return (
    <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6">
      <div className="min-w-0 lg:hidden">
        <label htmlFor="service-area" className="block text-sm font-semibold text-on-canvas">{copy.tabsLabel}</label>
        <select id="service-area" value={activeKey} onChange={(event) => selectTab(event.target.value)} className="control mt-2 pr-10">
          {serviceKeys.map((key) => <option key={key} value={key}>{copy.items[key].title}</option>)}
        </select>
      </div>
      <div
        role="tablist"
        aria-label={copy.tabsLabel}
        aria-orientation="vertical"
        onKeyDown={handleKeyDown}
        className="hidden min-w-0 flex-col gap-1 rounded-card border border-line bg-card p-2 lg:sticky lg:top-24 lg:flex"
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
              className={`flex min-h-12 min-w-0 items-center gap-2.5 rounded-control px-3 py-3 text-left text-sm font-semibold ${isActive ? 'bg-primary-50 text-primary-dark ring-1 ring-inset ring-primary-100' : 'text-ink-muted hover:bg-card-hover hover:text-ink'}`}
            >
              {createElement(getServiceIcon(serviceKey), { 'aria-hidden': true, className: 'size-5 shrink-0', strokeWidth: 1.75 })}
              <span className="min-w-0 break-words">{copy.items[serviceKey].title}</span>
            </button>
          );
        })}
      </div>

      <section
        id="service-panel"
        role="tabpanel"
        aria-labelledby="service-panel-title"
        tabIndex={0}
        className="min-w-0 rounded-panel border border-line bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
            {createElement(getServiceIcon(activeKey), { 'aria-hidden': true, className: 'size-6', strokeWidth: 1.75 })}
          </span>
          <div className="min-w-0">
            <h2 id="service-panel-title" className="break-words text-h3 text-ink">{service.title}</h2>
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
