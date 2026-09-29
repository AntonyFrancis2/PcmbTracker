// Copies each student's Google name, email and sign-up date from Firebase Authentication
// into their users/{uid} profile, so the admin page can show everyone, including students
// who signed up before the app started saving names or who haven't updated the app.
//
// Runs from GitHub Actions (.github/workflows/backfill-names.yml) with the Firebase
// service-account JSON in the FIREBASE_SERVICE_ACCOUNT secret. Only fills gaps: it never
// changes chapter ticks, badges or any other field. Set DRY_RUN=1 to only print changes.
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set.');
  process.exit(1);
}
const dryRun = process.env.DRY_RUN === '1';
initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth();
const db = getFirestore();

let seen = 0;
let updated = 0;
let created = 0;
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const u of page.users) {
    seen++;
    const ref = db.collection('users').doc(u.uid);
    const snap = await ref.get();
    const cur = snap.exists ? snap.data() : null;
    const name = u.displayName || '';
    const email = u.email || '';
    const joined = Date.parse(u.metadata.creationTime) || Date.now();

    if (!cur) {
      // Signed in but never saved a profile: record who they are (the app fills the rest).
      console.log(`create ${u.uid} ${email}`);
      if (!dryRun) await ref.set({ name, email, createdAt: joined, updatedAt: 0 }, { merge: true });
      created++;
      continue;
    }
    const patch = {};
    if (!cur.name && name) patch.name = name;
    if (!cur.email && email) patch.email = email;
    if (!cur.createdAt) patch.createdAt = joined;
    if (Object.keys(patch).length === 0) continue;
    // One millisecond newer than the stored copy, so older app versions adopt the filled-in
    // profile instead of re-saving their copy without the name.
    patch.updatedAt = (typeof cur.updatedAt === 'number' ? cur.updatedAt : 0) + 1;
    console.log(`update ${u.uid} ${email} ${Object.keys(patch).join(',')}`);
    if (!dryRun) await ref.update(patch);
    updated++;
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(`${dryRun ? '[dry run] ' : ''}Checked ${seen} accounts: ${updated} updated, ${created} created.`);
