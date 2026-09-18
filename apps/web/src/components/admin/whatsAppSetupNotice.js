'use client';

import { useDictionary } from '@/brand/localeContext';
import { InlineAlert } from '@/components/ui';

// Explains which server settings are missing, so admins know why the assistant or payments aren't live
export function WhatsAppSetupNotice({ status }) {
  const copy = useDictionary().admin.setupNotice;
  if (!status || (status.isWhatsAppConfigured && status.isPaymentsConfigured)) return null;

  return (
    <InlineAlert tone="warning" title={copy.title} className="mb-5">
      <ul className="list-disc space-y-1 pl-5">
        {!status.isWhatsAppConfigured && <li>{copy.whatsApp}</li>}
        {!status.isPaymentsConfigured && <li>{copy.payments}</li>}
      </ul>
    </InlineAlert>
  );
}
