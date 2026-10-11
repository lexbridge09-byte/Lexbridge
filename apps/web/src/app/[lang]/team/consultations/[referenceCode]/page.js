import { TeamConsultationDetail } from '@/components/team/teamConsultationDetail';

export default function TeamConsultationDetailPage({ params }) {
  return <TeamConsultationDetail referenceCode={params.referenceCode} />;
}
