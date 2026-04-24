const functions = require("firebase-functions");
const admin = require("firebase-admin");

const serviceAccount = require("./raffle-fd694-firebase-adminsdk-fbsvc-bd564c334b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

exports.updateTicketCounts = functions.firestore
  .document("raffles/{raffleId}")
  .onCreate(async (snap, context) => {

    const data = snap.data();

    const agentId = data.agentId || "unknown";
    const agentName = data.agentName || "Unknown";

    const phone = data.phone || "unknown";

    let name = data.name || "";
    let email = data.email || "";
    let emiratesId = data.emiratesId || "";

    // 🔥 If raffle doesn't contain full user info → fetch from users collection
    if ((!name || !email || !emiratesId) && phone !== "unknown") {
      const userSnap = await db.collection("users")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        name = userData.name || name;
        email = userData.email || email;
        emiratesId = userData.emiratesId || emiratesId;
      }
    }

    const createdAt = data.createdAt?.toDate
      ? data.createdAt.toDate()
      : new Date();

    const dateKey = createdAt.toISOString().split("T")[0];

    const batch = db.batch();

    // =============================
    // 1️⃣ Agent Ticket Count
    // =============================
    const agentRef = db.collection("agent_ticket_counts").doc(agentId);

    batch.set(agentRef, {
      agentId,
      agentName,
      totalTickets: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    // =============================
    // 2️⃣ User Ticket Count
    // =============================
    const userRef = db.collection("user_ticket_counts").doc(phone);

    batch.set(userRef, {
      phone,
      name,
      email,
      emiratesId,
      totalTickets: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });

    // =============================
    // 3️⃣ Daily Ticket Count
    // =============================
    const dailyRef = db.collection("daily_ticket_counts").doc(dateKey);

    batch.set(dailyRef, {
      date: dateKey,
      totalTickets: FieldValue.increment(1)
    }, { merge: true });

    await batch.commit();

    return null;
  });