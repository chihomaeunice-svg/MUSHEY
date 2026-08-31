// functions/backup.js
// Firestore's own replication protects against hardware failure, not against
// a bad bulk delete, a buggy migration, or someone fat-fingering the console.
// This adds Google's own documented pattern for that case: a native managed
// export of the whole database to Cloud Storage, on a schedule, restorable
// with `gcloud firestore import gs://<bucket>/firestore-backups/<timestamp>`
// if data is ever lost in a way replication alone doesn't cover.
//
// One-time setup this needs before it can actually run (NEEDS CONFIG):
// the Cloud Functions runtime service account
// (<project-number>-compute@developer.gserviceaccount.com by default) must
// hold the "Cloud Datastore Import Export Admin" IAM role
// (roles/datastore.importExportAdmin) on the project, and the destination
// Storage bucket must exist. Grant it once in the Cloud Console under
// IAM & Admin, or via:
//   gcloud projects add-iam-policy-binding <project-id> \
//     --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
//     --role="roles/datastore.importExportAdmin"
// Without that grant, exportDocuments() below fails with a PERMISSION_DENIED
// error visible in the function's logs — nothing silently no-ops.

const admin = require("firebase-admin");

async function runBackup() {
  const client = new admin.firestore.v1.FirestoreAdminClient();
  const projectId = await client.getProjectId();
  const databaseName = client.databasePath(projectId, "(default)");
  const bucket = process.env.BACKUP_BUCKET || `${projectId}.firebasestorage.app`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const [operation] = await client.exportDocuments({
    name: databaseName,
    outputUriPrefix: `gs://${bucket}/firestore-backups/${timestamp}`,
    collectionIds: [], // empty = every collection
  });

  console.log(`Firestore export started: ${operation.name} -> gs://${bucket}/firestore-backups/${timestamp}`);
}

module.exports = { runBackup };
