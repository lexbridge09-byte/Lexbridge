import { TeamAssignmentDetail } from '@/components/team/teamAssignmentDetail';
export default function TeamOrderPage({ params }) { return <TeamAssignmentDetail kind="order" referenceCode={params.referenceCode} />; }
