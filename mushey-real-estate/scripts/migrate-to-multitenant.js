// scripts/migrate-to-multitenant.js
//
// One-time migration: copies the OLD global schema
//   areas/{area}/properties/{propertyName}
// into the NEW per-company schema
//   companies/{companyId}/properties/{autoId}   (with propertyName + area fields)
//
// Run this once, locally, AFTER you've registered your company through the
// app's new Signup screen (so a companies/{companyId} document already
// exists) and BEFORE you delete the old data.
//
// Usage:
//   1. Firebase console → Project settings → Service accounts →
//      "Generate new private key" → save as scripts/serviceAccountKey.json
//      (this file must NOT be committed — it's already covered by .gitignore
//      via the root node_modules/dist ignores; add it explicitly if unsure)
//   2. npm install firebase-admin --no-save
//   3. node scripts/migrate-to-multitenant.js <companyId>
//
// <companyId> is the target company's id — since signup sets
// companyId = ownerUid, this is the Firebase Auth uid of whoever registered
// the company (find it in Authentication → Users, or Firestore → companies).

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const companyId = process.argv[2];
if (!companyId) {
  console.error("Usage: node scripts/migrate-to-multitenant.js <companyId>");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function migrate() {
  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    console.error(`companies/${companyId} does not exist — register the company in the app first.`);
    process.exit(1);
  }

  const areasSnap = await db.collection("areas").listDocuments();
  if (areasSnap.length === 0) {
    console.log("No legacy areas/* data found — nothing to migrate.");
    return;
  }

  const areaNames = new Set(companySnap.data().areas || []);
  let migrated = 0;

  for (const areaDoc of areasSnap) {
    const areaName = areaDoc.id;
    const propsSnap = await areaDoc.collection("properties").get();

    for (const propDoc of propsSnap.docs) {
      const data = propDoc.data();
      await companyRef.collection("properties").add({
        ...data,
        propertyName: propDoc.id,
        area: areaName,
      });
      migrated++;
    }

    areaNames.add(areaName);
  }

  await companyRef.update({ areas: Array.from(areaNames) });

  console.log(`Migrated ${migrated} properties into companies/${companyId}/properties.`);
  console.log("Legacy areas/* documents were NOT deleted — verify the migration, then delete them manually if you're satisfied.");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
