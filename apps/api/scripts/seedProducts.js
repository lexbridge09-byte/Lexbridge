/*
  Adds a starter set of fixed-price services as UNPUBLISHED drafts with a placeholder price of ₹1.
  Existing products (matched by slug) are never overwritten. Set real prices and publish from the admin panel.
    pnpm --filter @lexbridge/api db:seed-products
*/
import { connectDb, disconnectDb } from '../src/db/index.js';
import { ProductModel } from '../src/models/index.js';

const PLACEHOLDER_PRICE_PAISE = 100;

const STARTER_PRODUCTS = [
  {
    Slug: 'property-verification-report',
    Title: 'Property verification report',
    Category: 'property',
    ServiceCategory: 'civil-property',
    Summary: 'A legal review of a property\'s title documents before you buy, with a written report of issues found.',
    Inclusions: ['Review of title documents and chain of ownership', 'Encumbrance and mutation checks from documents provided', 'Written report with issues and next steps', 'One follow-up call to explain the report'],
    DocumentsRequired: ['Sale deeds or title documents for the last 30 years', 'Encumbrance certificate', 'Latest property tax receipts', 'Approved building plan, if any'],
    TurnaroundText: 'About 5 working days',
    GovernmentFeeNote: 'Certified copies or official searches, if needed, are charged at actual cost.',
    FaqItems: [{ Question: 'Do I need to visit an office?', Answer: 'No. You upload scanned copies and receive the report by email and in My LexBridge.' }],
  },
  {
    Slug: 'sale-deed-drafting',
    Title: 'Sale deed drafting',
    Category: 'property',
    ServiceCategory: 'civil-property',
    Summary: 'A sale deed drafted for your transaction, ready for stamping and registration.',
    Inclusions: ['Drafting based on the agreed terms', 'One round of revisions', 'Guidance on stamp duty and registration steps'],
    DocumentsRequired: ['Agreement to sell, if signed', 'Identity and address proof of buyer and seller', 'Title documents of the property'],
    TurnaroundText: '3–4 working days',
    GovernmentFeeNote: 'Stamp duty and registration fees are paid separately to the government.',
  },
  {
    Slug: 'rent-agreement-drafting',
    Title: 'Rent agreement drafting',
    Category: 'property',
    ServiceCategory: 'civil-property',
    Summary: 'A residential or commercial rent agreement drafted for your terms.',
    Inclusions: ['Drafting for residential or commercial premises', 'Rent, deposit, lock-in and notice terms', 'One round of revisions'],
    DocumentsRequired: ['Identity proof of landlord and tenant', 'Property address and agreed terms'],
    TurnaroundText: '1–2 working days',
    GovernmentFeeNote: 'Stamp paper and registration, where required, are charged separately.',
  },
  {
    Slug: 'legal-notice-drafting',
    Title: 'Legal notice drafting',
    Category: 'documents',
    ServiceCategory: 'legal-drafting',
    Summary: 'A formal legal notice setting out your claim or position, drafted from the facts you share.',
    Inclusions: ['Review of the facts and documents shared', 'Drafted legal notice', 'One round of revisions'],
    DocumentsRequired: ['Timeline of events', 'Supporting documents such as invoices, agreements or messages'],
    TurnaroundText: '2–3 working days',
  },
  {
    Slug: 'contract-review',
    Title: 'Contract review',
    Category: 'documents',
    ServiceCategory: 'contract-review',
    Summary: 'A legal professional reviews your agreement and explains the risks before you sign.',
    Inclusions: ['Clause-by-clause review of one agreement', 'Written comments on risks and missing protections', 'Short call to discuss the comments'],
    DocumentsRequired: ['The agreement in PDF or Word format'],
    TurnaroundText: '2–3 working days',
  },
  {
    Slug: 'trademark-filing',
    Title: 'Trademark filing',
    Category: 'business',
    ServiceCategory: 'business-corporate',
    Summary: 'Search and filing of a trademark application for your brand name or logo in one class.',
    Inclusions: ['Basic trademark search', 'Preparation and filing of the application in one class', 'Filing acknowledgement'],
    DocumentsRequired: ['Brand name or logo', 'Applicant identity and address proof', 'MSME certificate, if applicable'],
    TurnaroundText: '3–5 working days to file',
    GovernmentFeeNote: 'Government filing fee is extra and depends on the applicant type.',
  },
  {
    Slug: 'private-limited-company-registration',
    Title: 'Private limited company registration',
    Category: 'business',
    ServiceCategory: 'business-corporate',
    Summary: 'Incorporation of a private limited company, from name approval to certificate of incorporation.',
    Inclusions: ['Name application', 'Preparation of incorporation forms, MoA and AoA', 'Digital signatures for directors', 'PAN and TAN with incorporation'],
    DocumentsRequired: ['Identity and address proof of directors and shareholders', 'Registered office address proof', 'Photographs of directors'],
    TurnaroundText: 'About 10–15 working days',
    GovernmentFeeNote: 'Government fees and stamp duty vary by state and authorised capital.',
  },
  {
    Slug: 'gst-registration',
    Title: 'GST registration',
    Category: 'business',
    ServiceCategory: 'business-corporate',
    Summary: 'Application for GST registration for your business.',
    Inclusions: ['Eligibility check', 'Preparation and filing of the application', 'Help with clarifications raised by the department'],
    DocumentsRequired: ['PAN of the business or proprietor', 'Identity and address proof', 'Business address proof', 'Bank account details'],
    TurnaroundText: '3–7 working days, subject to department approval',
  },
  {
    Slug: 'will-drafting',
    Title: 'Will drafting',
    Category: 'personal',
    ServiceCategory: 'legal-drafting',
    Summary: 'A will drafted to record how you want your assets distributed.',
    Inclusions: ['Discussion of your wishes and assets', 'Drafted will', 'Guidance on signing, witnesses and optional registration'],
    DocumentsRequired: ['List of assets and beneficiaries', 'Identity proof'],
    TurnaroundText: '3–5 working days',
  },
  {
    Slug: 'consumer-complaint-drafting',
    Title: 'Consumer complaint drafting',
    Category: 'personal',
    ServiceCategory: 'consumer-matters',
    Summary: 'A consumer complaint drafted for defective products or deficient services.',
    Inclusions: ['Review of the facts and evidence', 'Drafted complaint for the appropriate consumer commission', 'Filing guidance'],
    DocumentsRequired: ['Invoice or proof of purchase', 'Correspondence with the seller or service provider', 'Photos or other evidence of the defect'],
    TurnaroundText: '3–4 working days',
    GovernmentFeeNote: 'Commission filing fees, if any, are paid separately.',
  },
];

await connectDb();

let insertedCount = 0;
for (const [index, product] of STARTER_PRODUCTS.entries()) {
  const result = await ProductModel.updateOne(
    { Slug: product.Slug },
    { $setOnInsert: { ...product, PricePaise: PLACEHOLDER_PRICE_PAISE, IsPublished: false, SortOrder: (index + 1) * 10 } },
    { upsert: true, runValidators: true },
  );
  if (result.upsertedCount > 0) insertedCount += 1;
}

console.log(`[seed] products: ${insertedCount} added as unpublished drafts at ₹1, ${STARTER_PRODUCTS.length - insertedCount} already existed`);
await disconnectDb();
