import { TeamRequestDetail } from '@/components/team/teamRequestDetail';

export default function TeamRequestDetailPage({ params }) {
  const { referenceCode } = params;
  return <TeamRequestDetail referenceCode={referenceCode} />;
}
