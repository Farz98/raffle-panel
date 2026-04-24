const admin = require("firebase-admin");

const serviceAccount = require("./raffle-fd694-firebase-adminsdk-fbsvc-bd564c334b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

async function enrichUserCounts() {

  console.log("Starting enrichment...");

  const userCountsSnap = await db.collection("user_ticket_counts").get();

  const batch = db.batch();

  for (const doc of userCountsSnap.docs) {

    const phone = doc.id;

    // 🔍 Find actual user document
    const userSnap = await db.collection("users")
      .where("phone", "==", phone)
      .limit(1)
      .get();

    if (!userSnap.empty) {

      const userData = userSnap.docs[0].data();

      batch.set(doc.ref, {
        name: userData.name || "",
        email: userData.email || "",
        emiratesId: userData.emiratesId || ""
      }, { merge: true });

      console.log("Updated:", phone);
    }
  }

  await batch.commit();

  console.log("Enrichment completed!");
  process.exit();
}

enrichUserCounts();