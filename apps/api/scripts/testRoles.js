/*
  E2E check for the 4-role RBAC + assignment workflow against a running API.
  Creates disposable test users, signs in via direct OTP insertion, exercises the
  role gates, the feature kill-switch and the lawyer deliverable flow, then cleans up:
    node scripts/testRoles.js
*/
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/db/index.js';
import { FeatureFlagModel, OtpModel, ServiceRequestModel, UserModel } from '../src/models/index.js';
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

try {
  const ownerCookie = await signInAs(users.owner.Email);
  const managerCookie = await signInAs(users.manager.Email);
  const lawyerCookie = await signInAs(users.lawyer.Email);
  const clientCookie = await signInAs(users.client.Email);

  // 1. Role gates on the admin area
  check('owner can list users', (await call(ownerCookie, '/admin/users')).status === 200);
  check('manager can read requests desk', (await call(managerCookie, '/admin/service-requests')).status === 200);
  check('manager cannot list users', (await call(managerCookie, '/admin/users')).status === 403);
  check('manager cannot read feature flags', (await call(managerCookie, '/admin/feature-flags')).status === 403);
  check('lawyer cannot use the admin desk', (await call(lawyerCookie, '/admin/service-requests')).status === 403);
  check('client cannot use the admin desk', (await call(clientCookie, '/admin/service-requests')).status === 403);

  // 2. Owner-only role management with the last-owner guard
  check('owner promotes client to lawyer', (await call(ownerCookie, `/admin/users/${users.client._id}/role`, { method: 'PATCH', body: { Role: 'lawyer' } })).status === 200);
  check('owner cannot demote the last owner', (await call(ownerCookie, `/admin/users/${users.owner._id}/role`, { method: 'PATCH', body: { Role: 'manager' } })).status === 400);
  check('manager cannot change roles', (await call(managerCookie, `/admin/users/${users.lawyer._id}/role`, { method: 'PATCH', body: { Role: 'client' } })).status === 403);
  await UserModel.updateOne({ _id: users.client._id }, { $set: { Role: 'client' } });

  // 3. Assignment: manager assigns the lawyer; request moves to 'assigned'
  const assigned = await call(managerCookie, `/admin/service-requests/${request.ReferenceCode}`, {
    method: 'PATCH',
    body: { AssignedTo: String(users.lawyer._id) },
  });
  check('manager assigns the lawyer', assigned.status === 200 && assigned.data.request.AssignedTo?._id === String(users.lawyer._id));
  check('assigned status recorded', assigned.data.request.Status === 'assigned', assigned.data.request.Status);
  check('assignment log entry added', assigned.data.request.StatusHistory.at(-1).Status === 'assigned');
  check('manager cannot assign a client', (await call(managerCookie, `/admin/service-requests/${request.ReferenceCode}`, {
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
  await OtpModel.deleteMany({ Email: { $in: Object.values(users).map((user) => user.Email) } });
  await FeatureFlagModel.deleteMany({});
  const { deleteDocumentFile } = await import('../src/services/index.js');
  const docs = mongoose.connection.collection('documents');
  const testDocs = await docs.find({ RequestReference: request.ReferenceCode }).toArray();
  for (const doc of testDocs) await deleteDocumentFile(doc.StoredName);
  await docs.deleteMany({ RequestReference: request.ReferenceCode });
  await disconnectDb();
  console.log('cleanup done');
}
