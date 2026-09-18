import {
  BadgeCheck,
  Banknote,
  Briefcase,
  FileSearch,
  FileText,
  Gavel,
  Handshake,
  HeartHandshake,
  House,
  Info,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquareText,
  ReceiptIndianRupee,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  TriangleAlert,
  User,
  Users,
  Wallet,
  Languages,
} from 'lucide-react';

// Brand copy refers to icons by key, so wording and artwork stay independent. One style: lucide, stroke 1.75.
const ICONS = {
  // Services
  consultation: MessageSquareText,
  drafting: FileText,
  contract: FileSearch,
  property: House,
  consumer: ShoppingBag,
  business: Briefcase,
  criminal: Gavel,
  // Product categories
  documents: FileText,
  personal: User,
  // Trust claims
  qualified: BadgeCheck,
  confidential: Lock,
  language: Languages,
  fee: ReceiptIndianRupee,
  refund: RotateCcw,
  // Problems and situations
  notice: Mail,
  agreement: Handshake,
  cheque: Banknote,
  family: HeartHandshake,
  police: ShieldAlert,
  fraud: Smartphone,
  salary: Wallet,
  help: LifeBuoy,
  // Drafting document types
  affidavit: BadgeCheck,
  application: FileText,
  complaint: MessageSquareText,
  other: Search,
  // About page beliefs
  clarity: Info,
  transparency: ReceiptIndianRupee,
  human: Users,
  // Document review landing
  summary: FileText,
  risk: TriangleAlert,
  lawyer: Scale,
};

const SERVICE_ICON_KEYS = {
  'legal-consultation': 'consultation',
  'legal-drafting': 'drafting',
  'contract-review': 'contract',
  'civil-property': 'property',
  'consumer-matters': 'consumer',
  'business-corporate': 'business',
  'criminal-law': 'criminal',
};

export function getIcon(iconKey) {
  return ICONS[iconKey] ?? Info;
}

export function getServiceIcon(serviceKey) {
  return getIcon(SERVICE_ICON_KEYS[serviceKey]);
}
