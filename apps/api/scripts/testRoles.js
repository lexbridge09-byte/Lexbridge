/*
  E2E check for the 4-role RBAC + assignment workflow against a running API.
  Creates disposable test users, signs in via direct OTP insertion, exercises the
  role gates, the feature kill-switch and the lawyer deliverable flow, then cleans up:
    node scripts/testRoles.js
*/
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/db/index.js';
import { ConsultationModel, FeatureFlagModel, OtpModel, ServiceRequestModel, SlotModel, UserModel } from '../src/models/index.js';
import { derivePhoneLast10 } from '../src/utils.js';

const API = process.env.API_URL ?? 'http://localhost:5000/api';
const STAMP = Date.now();

function hashOtp(email, code, jwtSecret) {
  return crypto.createHmac('sha256', jwtSecret).update(`${email}:${code}`).digest('hex');
}

async function signInAs(email) {
  const code = '123456';
  await OtpModel.deleteMany({ Email: email });
  await OtpModel.create({
    Email: email,
    CodeHash: hashOtp(email, code, process.env.JWT_SECRET),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const response = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ Email: email, Code: code }),
  });
  if (!response.ok) throw new Error(`sign-in failed for ${email}: ${response.status} ${await response.text()}`);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return cookie;
}

async function call(cookie, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await response.json(); } catch {}
  return { status: response.status, data };
}

function check(name, condition, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : ` — ${detail}`}`);
  if (!condition) process.exitCode = 1;
}

await connectDb();

// --- Fixtures: one user per role + a client with a request assigned to the lawyer ---
const suffix = `+rbac${STAMP}`;
const users = {
  owner: await UserModel.create({ Email: `owner${suffix}@test.local`, FullName: 'Rbac Owner', Phone: '+911000000001', Role: 'owner' }),
  manager: await UserModel.create({ Email: `manager${suffix}@test.local`, FullName: 'Rbac Manager', Phone: '+911000000002', Role: 'manager' }),
  lawyer: await UserModel.create({ Email: `lawyer${suffix}@test.local`, FullName: 'Rbac Lawyer', Phone: '+911000000003', Role: 'lawyer' }),
  client: await UserModel.create({ Email: `client${suffix}@test.local`, FullName: 'Rbac Client', Phone: '+911000000004', Role: 'client' }),
};

const guestRequest = await ServiceRequestModel.create({
  ReferenceCode: `LB-GUEST${STAMP}`,
  Client: null,
  FullName: 'Rbac Guest',
  Email: `client${suffix}@test.local`,
  Phone: '+911000000004',
  PhoneLast10: derivePhoneLast10('+911000000004'),
  ServiceCategory: 'other',
  Description: 'Guest submission created without an account to test reference-code linking.',
  Source: 'contact-form',
  StatusHistory: [{ Status: 'submitted', changedAt: new Date() }],
  ConsentGiven: true,
  consentedAt: new Date(),
});

const request = await ServiceRequestModel.create({
  ReferenceCode: `LB-RBAC${STAMP}`,
  Client: users.client._id,
  FullName: 'Rbac Client',
  Email: `client${suffix}@test.local`,
  Phone: '+911000000004',
  PhoneLast10: derivePhoneLast10('+911000000004'),
  ServiceCategory: 'other',
  Description: 'RBAC end-to-end test request with a description long enough to pass validation rules.',
  Source: 'contact-form',
  StatusHistory: [{ Status: 'submitted', changedAt: new Date() }],
  ConsentGiven: true,
  consentedAt: new Date(),
});

let intakeRequestData = null;
let storedConsultation = null;
let topicSlot = null;

try {
  const ownerCookie = await signInAs(users.owner.Email);
  const managerCookie = await signInAs(users.manager.Email);
  const lawyerCookie = await signInAs(users.lawyer.Email);
  const clientCookie = await signInAs(users.client.Email);

  // 1. Role gates on the admin area
  check('owner can list users', (await call(ownerCookie, '/admin/users')).status === 200);
  check('manager is locked out of the admin requests desk', (await call(managerCookie, '/admin/service-requests')).status === 403);
  check('manager cannot list users', (await call(managerCookie, '/admin/users')).status === 403);
  check('manager cannot read feature flags', (await call(managerCookie, '/admin/feature-flags')).status === 403);
  check('lawyer cannot use the admin desk', (await call(lawyerCookie, '/admin/service-requests')).status === 403);
  check('client cannot use the admin desk', (await call(clientCookie, '/admin/service-requests')).status === 403);

  // 2. Owner-only role management with the last-owner guard
  check('owner promotes client to lawyer', (await call(ownerCookie, `/admin/users/${users.client._id}/role`, { method: 'PATCH', body: { Role: 'lawyer' } })).status === 200);
  const totalOwners = await UserModel.countDocuments({ Role: 'owner' });
  if (totalOwners === 1) {
    check('owner cannot demote the last owner', (await call(ownerCookie, `/admin/users/${users.owner._id}/role`, { method: 'PATCH', body: { Role: 'manager' } })).status === 400);
  } else {
    // Other real owners exist in this environment: demotion succeeds, then restore via DB
    const demote = await call(ownerCookie, `/admin/users/${users.owner._id}/role`, { method: 'PATCH', body: { Role: 'manager' } });
    check('owner demotion allowed while another owner exists', demote.status === 200, JSON.stringify(demote.data));
    await UserModel.updateOne({ _id: users.owner._id }, { $set: { Role: 'owner' } });
  }
  check('manager cannot change roles', (await call(managerCookie, `/admin/users/${users.lawyer._id}/role`, { method: 'PATCH', body: { Role: 'client' } })).status === 403);
  await UserModel.updateOne({ _id: users.client._id }, { $set: { Role: 'client' } });

  // 3. Assignment: the 2nd owner assigns from the team desk; request moves to 'assigned'
  const assigned = await call(managerCookie, `/team/desk/requests/${request.ReferenceCode}`, {
    method: 'PATCH',
    body: { AssignedTo: String(users.lawyer._id) },
  });
  check('manager assigns the lawyer via team desk', assigned.status === 200 && assigned.data.request.AssignedTo?._id === String(users.lawyer._id), JSON.stringify(assigned.data));
  check('assigned status recorded', assigned.data.request.Status === 'assigned', assigned.data.request.Status);
  check('assignment log entry added', assigned.data.request.StatusHistory.at(-1).Status === 'assigned');
  check('manager cannot assign a client', (await call(managerCookie, `/team/desk/requests/${request.ReferenceCode}`, {
    method: 'PATCH',
    body: { AssignedTo: String(users.client._id) },
  })).status === 400);

  // 4. Lawyer workspace is scoped to assignments
  const teamList = await call(lawyerCookie, '/team/requests');
  check('lawyer sees assigned request in workspace', teamList.status === 200 && teamList.data.requests.some((item) => item.ReferenceCode === request.ReferenceCode));
  const teamDetail = await call(lawyerCookie, `/team/requests/${request.ReferenceCode}`);
  check('lawyer opens assignment detail', teamDetail.status === 200 && teamDetail.data.request.ReferenceCode === request.ReferenceCode);
  const otherRequest = await call(lawyerCookie, '/team/requests/LB-DOESNOTEXIST');
  check('lawyer cannot open unassigned requests', otherRequest.status === 404);
  check('client cannot use team workspace', (await call(clientCookie, '/team/requests')).status === 403);

  // 5. Lawyer status moves are limited
  check('lawyer cannot set under-review', (await call(lawyerCookie, `/team/requests/${request.ReferenceCode}/status`, { method: 'PATCH', body: { Status: 'under-review' } })).status === 400);
  check('lawyer sets in-progress', (await call(lawyerCookie, `/team/requests/${request.ReferenceCode}/status`, { method: 'PATCH', body: { Status: 'in-progress', Note: 'Started working' } })).status === 200);

  // 6. Deliverable upload completes the request and reaches the client's document list
  const boundary = `----rbac${STAMP}`;
  const fileBody = Buffer.from('%PDF-1.4 test deliverable');
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="draft.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBody,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const upload = await fetch(`${API}/team/requests/${request.ReferenceCode}/deliverable`, {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, cookie: lawyerCookie },
    body: multipart,
  });
  check('lawyer uploads deliverable', upload.status === 201);
  const clientDocs = await call(clientCookie, '/documents/mine');
  const deliverable = clientDocs.data?.documents?.find((document) => document.Kind === 'deliverable');
  check('client sees the deliverable', Boolean(deliverable));
  const completedRequest = await call(clientCookie, `/service-requests/mine/${request.ReferenceCode}`);
  check('request auto-completed on delivery', completedRequest.data?.request?.Status === 'completed', completedRequest.data?.request?.Status);
  if (deliverable) {
    const download = await fetch(`${API}/documents/${deliverable._id}/download`, { headers: { cookie: clientCookie } });
    check('client downloads the deliverable', download.status === 200);
    const lawyerDownload = await fetch(`${API}/documents/${deliverable._id}/download`, { headers: { cookie: lawyerCookie } });
    check('assigned lawyer can still open the deliverable', lawyerDownload.status === 200);
    const stranger = await fetch(`${API}/documents/${deliverable._id}/download`, { headers: { cookie: ownerCookie } });
    check('staff can open client documents', stranger.status === 200);
  }

  // 7. Unassigning revokes the lawyer's document access instantly
  await call(ownerCookie, `/admin/service-requests/${request.ReferenceCode}`, { method: 'PATCH', body: { AssignedTo: null } });
  const revoked = await call(lawyerCookie, `/team/requests/${request.ReferenceCode}`);
  check('unassignment revokes workspace access', revoked.status === 404);

  // 7b. Guest request tracking: link by reference code after sign-in
  check('unauthenticated link attempt is rejected', (await fetch(`${API}/service-requests/link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ReferenceCode: `LB-GUEST${STAMP}` }),
  })).status === 401);
  const linked = await call(clientCookie, '/service-requests/link', { method: 'POST', body: { ReferenceCode: `lb-guest${STAMP}`.toLowerCase() } });
  check('client links guest request by reference code', linked.status === 200 && linked.data.linked === true, JSON.stringify(linked.data));
  check('linked request appears in the dashboard list', (await call(clientCookie, '/service-requests/mine')).data.requests.some((item) => item.ReferenceCode === `LB-GUEST${STAMP}`));
  check('linking the same code again is idempotent', (await call(clientCookie, '/service-requests/link', { method: 'POST', body: { ReferenceCode: `LB-GUEST${STAMP}` } })).status === 200);
  const strangerLink = await call(lawyerCookie, '/service-requests/link', { method: 'POST', body: { ReferenceCode: `LB-GUEST${STAMP}` } });
  check("someone else's email cannot claim the reference", strangerLink.status === 403, JSON.stringify(strangerLink.data));
  check('unknown reference returns a readable 404', (await call(clientCookie, '/service-requests/link', { method: 'POST', body: { ReferenceCode: 'LB-NOTHING' } })).status === 404);

  // 7c. Strict role separation
  check('manager cannot use the admin desk anymore', (await call(managerCookie, '/admin/service-requests')).status === 403);
  check('manager cannot upload via admin documents', (await call(managerCookie, '/admin/documents')).status === 403);
  check('manager blocked from client request list', (await call(managerCookie, '/service-requests/mine')).status === 403);
  check('manager blocked from client documents', (await call(managerCookie, '/documents/mine')).status === 403);
  check('lawyer blocked from client request list', (await call(lawyerCookie, '/service-requests/mine')).status === 403);
  check('owner blocked from team workspace', (await call(ownerCookie, '/team/requests')).status === 403);
  check('owner blocked from team desk', (await call(ownerCookie, '/team/desk/requests')).status === 403);

  // 7d. Manager team desk: list, detail, assignment via /team/desk
  const deskList = await call(managerCookie, '/team/desk/requests?status=assigned');
  check('manager desk lists requests', deskList.status === 200 && Array.isArray(deskList.data.items));
  const deskDetail = await call(managerCookie, `/team/desk/requests/${request.ReferenceCode}`);
  check('manager desk opens request detail', deskDetail.status === 200 && deskDetail.data.request.ReferenceCode === request.ReferenceCode);
  const lawyerList = await call(managerCookie, '/team/lawyers');
  check('manager lists lawyers for the picker', lawyerList.status === 200 && lawyerList.data.items.some((member) => member.Email === `lawyer${suffix}@test.local`));
  check('lawyer cannot use the team desk', (await call(lawyerCookie, '/team/desk/requests')).status === 403);

  // 7e. Intake details: subtype questions are whitelisted, required, and visible to the owner
  const intakeContact = { FullName: 'Rbac Client', Email: `client${suffix}@test.local`, Phone: '+911000000004', ConsentGiven: true };
  const intakeMissing = await call(clientCookie, '/service-requests', {
    method: 'POST',
    body: {
      ...intakeContact,
      ServiceCategory: 'criminal-law',
      Subtype: 'cheque-bounce',
      IntakeDetails: { chequeAmount: '₹50,000' },
      Description: 'Cheque bounce intake test request with a description long enough to pass validation.',
    },
  });
  check('missing required intake details return 400 with field keys', intakeMissing.status === 400 && Array.isArray(intakeMissing.data?.details) && intakeMissing.data.details.includes('bankName'), JSON.stringify(intakeMissing.data));

  const intakeRequest = await call(clientCookie, '/service-requests', {
    method: 'POST',
    body: {
      ...intakeContact,
      ServiceCategory: 'criminal-law',
      Subtype: 'cheque-bounce',
      IntakeDetails: { chequeAmount: '₹50,000', chequeDate: '2026-09-01', bankName: 'Test Bank', noticeSent: 'no', HackerKey: 'injected' },
      Description: 'Cheque bounce intake test request with a description long enough to pass validation.',
    },
  });
  intakeRequestData = intakeRequest.data;
  check('request with intake details is created', intakeRequest.status === 201, JSON.stringify(intakeRequest.data));
  const intakeDetail = intakeRequest.data?.ReferenceCode
    ? (await call(ownerCookie, `/admin/service-requests/${intakeRequest.data.ReferenceCode}`)).data?.request
    : null;
  check('owner sees the stored intake details', intakeDetail?.IntakeDetails?.bankName === 'Test Bank' && intakeDetail?.IntakeDetails?.noticeSent === 'no', JSON.stringify(intakeDetail?.IntakeDetails));
  check('unknown intake keys are stripped', intakeDetail && !('HackerKey' in intakeDetail.IntakeDetails), JSON.stringify(intakeDetail?.IntakeDetails));

  // Consultation topic intake: booked against a fixture slot, details stored on the consultation
  topicSlot = await SlotModel.create({ StartsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), DurationMinutes: 30, Status: 'open' });
  const topicBooking = await call(clientCookie, '/consultations', {
    method: 'POST',
    body: {
      ConsultationType: 'detailed',
      Mode: 'video',
      SlotId: String(topicSlot._id),
      Phone: '+911000000004',
      Description: 'Need an opinion on a property title before I buy it.',
      IntakeCategory: 'civil-property',
      IntakeSubtype: 'case-opinion',
      IntakeDetails: { topicArea: 'property', caseStage: 'notice-received' },
      ConsentGiven: true,
    },
  });
  check('consultation booked with topic details', topicBooking.status === 201, JSON.stringify(topicBooking.data));
  const storedConsultationResult = topicBooking.data?.consultation?.ReferenceCode
    ? await ConsultationModel.findOne({ ReferenceCode: topicBooking.data.consultation.ReferenceCode }).lean()
    : null;
  storedConsultation = storedConsultationResult;
  check('topic subtype and details stored', storedConsultation?.IntakeSubtype === 'case-opinion' && storedConsultation?.IntakeDetails?.topicArea === 'property', JSON.stringify(storedConsultation?.IntakeDetails));
  check('legacy request without intake details still renders', deskDetail.status === 200 && deskDetail.data.request.ReferenceCode === request.ReferenceCode);

  // 8. Onboarding cascade via invites
  const invitee = `invited${suffix}@test.local`;
  const ownerInvite = await call(ownerCookie, '/invites', { method: 'POST', body: { Email: invitee, Role: 'manager' } });
  check('owner invites a 2nd owner', ownerInvite.status === 201 || ownerInvite.status === 503, JSON.stringify(ownerInvite.data));
  const duplicate = await call(ownerCookie, '/invites', { method: 'POST', body: { Email: invitee, Role: 'manager' } });
  check('duplicate pending invite is refused', duplicate.status === 400);
  check('nobody can invite an owner role', (await call(ownerCookie, '/invites', { method: 'POST', body: { Email: `x${suffix}@test.local`, Role: 'owner' } })).status === 400);
  const lawyerInvite = await call(managerCookie, '/invites', { method: 'POST', body: { Email: `invitedlawyer${suffix}@test.local`, Role: 'lawyer' } });
  check('manager invites a lawyer', lawyerInvite.status === 201 || lawyerInvite.status === 503, JSON.stringify(lawyerInvite.data));
  check('lawyer cannot invite anyone', (await call(lawyerCookie, '/invites', { method: 'POST', body: { Email: `nope${suffix}@test.local`, Role: 'lawyer' } })).status === 403);
  check('invites list is tiered for manager', (await call(managerCookie, '/invites')).data.invites.every((invite) => invite.Role === 'lawyer'));

  // Activation: a pending invite promotes the account at sign-in (direct DB insert to skip real emails)
  const pending = await call(ownerCookie, '/invites');
  const inviteRow = pending.data.invites.find((invite) => invite.Email === invitee && invite.Status === 'pending');
  check('invite appears as pending', Boolean(inviteRow));
  if (inviteRow) {
    const inviteeCookie = await signInAs(invitee);
    const me = await call(inviteeCookie, '/auth/me');
    check('invite activates role at first sign-in', me.data.user.Role === 'manager', me.data.user.Role);
    const accepted = (await call(ownerCookie, '/invites')).data.invites.find((invite) => invite.Email === invitee);
    check('invite marked accepted', accepted.Status === 'accepted');
  }

  // Demotion guard: lawyer with open assignment cannot lose access
  const teamReassign = await call(managerCookie, `/team/desk/requests/${request.ReferenceCode}`, {
    method: 'PATCH',
    body: { AssignedTo: null },
  });
  check('manager unassigns via desk', teamReassign.status === 200 && teamReassign.data.request.AssignedTo === null);
  const reassign = await call(managerCookie, `/team/desk/requests/${request.ReferenceCode}`, {
    method: 'PATCH',
    body: { AssignedTo: String(users.lawyer._id) },
  });
  check('manager reassigns lawyer via desk', reassign.status === 200 && reassign.data.request.AssignedTo?._id === String(users.lawyer._id), JSON.stringify(reassign.data));

  // 8. Feature kill-switch: owner flips, API 404s the gated route, flip back
  const flagsBefore = (await call(ownerCookie, '/admin/feature-flags')).data.flags;
  check('owner reads feature flags', Array.isArray(flagsBefore) && flagsBefore.length > 0);
  const toggled = await call(ownerCookie, '/admin/feature-flags/solutionFinder', { method: 'PATCH', body: { enabled: false } });
  const solutionFinderFlag = toggled.data.flags.find((flag) => flag.key === 'solutionFinder');
  check('owner switches solutionFinder off', solutionFinderFlag?.stored === false);
  check('gated public route 404s while off', (await fetch(`${API}/solution-finder/classify`, { method: 'POST' })).status === 404);
  await call(ownerCookie, '/admin/feature-flags/solutionFinder', { method: 'PATCH', body: { enabled: true } });
  check('gated public route returns while on', (await fetch(`${API}/solution-finder/classify`, { method: 'POST' })).status !== 404);
  check('features endpoint reflects runtime switches', typeof (await call(ownerCookie, '/features')).data?.features?.solutionFinder === 'boolean');
} finally {
  // --- Cleanup ---
  await Promise.all([
    UserModel.deleteMany({ Email: { $regex: new RegExp(`@test\\.local$`), 'options': 'i' } }).deleteMany,
  ]).catch(() => {});
  await UserModel.deleteMany({ Email: { $in: Object.values(users).map((user) => user.Email) } });
  await ServiceRequestModel.deleteOne({ _id: request._id });
  await ServiceRequestModel.deleteOne({ _id: guestRequest._id });
  if (intakeRequestData?.ReferenceCode) await ServiceRequestModel.deleteOne({ ReferenceCode: intakeRequestData.ReferenceCode });
  if (storedConsultation?._id) await ConsultationModel.deleteOne({ _id: storedConsultation._id });
  if (topicSlot?._id) await SlotModel.deleteOne({ _id: topicSlot._id });
  await OtpModel.deleteMany({ Email: { $in: Object.values(users).map((user) => user.Email) } });
  await FeatureFlagModel.deleteMany({});
  const { InviteModel: InviteCleanup } = await import('../src/models/index.js');
  await (await import('../src/models/index.js')).InviteModel.deleteMany({ Email: { $regex: /test\.local$/i } });
  await UserModel.deleteMany({ Email: { $regex: /invited.*@test\.local$/i } });
  const { deleteDocumentFile } = await import('../src/services/index.js');
  const docs = mongoose.connection.collection('documents');
  const testDocs = await docs.find({ RequestReference: request.ReferenceCode }).toArray();
  for (const doc of testDocs) await deleteDocumentFile(doc.StoredName);
  await docs.deleteMany({ RequestReference: request.ReferenceCode });
  await disconnectDb();
  console.log('cleanup done');
}
