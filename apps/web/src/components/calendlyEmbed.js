'use client';

import { useEffect, useRef } from 'react';

const CALENDLY_ORIGIN = 'https://calendly.com';
const WIDGET_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js';

function loadWidgetScript() {
  if (document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`)) return;
  const script = document.createElement('script');
  script.src = WIDGET_SCRIPT_SRC;
  script.async = true;
  document.body.appendChild(script);
}

/*
  Calendly inline widget (not a raw iframe: only the widget emits booking events). Name and email are
  prefilled through Calendly's URL parameters. When the client books, `onScheduled` receives Calendly's
  event and invitee URIs, which the API verifies with the Calendly token before recording anything.
*/
export function CalendlyEmbed({ url, name, email, onScheduled }) {
  const onScheduledRef = useRef(onScheduled);
  useEffect(() => {
    onScheduledRef.current = onScheduled;
  }, [onScheduled]);

  useEffect(() => {
    loadWidgetScript();
    function handleMessage(event) {
      if (event.origin !== CALENDLY_ORIGIN || event.data?.event !== 'calendly.event_scheduled') return;
      const payload = event.data.payload ?? {};
      if (payload.event?.uri && payload.invitee?.uri) onScheduledRef.current({ eventUri: payload.event.uri, inviteeUri: payload.invitee.uri });
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const params = new URLSearchParams({ hide_gdpr_banner: '1', primary_color: 'c88f6c' });
  if (name) params.set('name', name);
  if (email) params.set('email', email);
  const widgetUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;

  return <div className="calendly-inline-widget h-[42rem] min-w-[320px] overflow-hidden rounded-card" data-url={widgetUrl} />;
}
