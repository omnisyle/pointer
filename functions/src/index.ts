import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const firestore = admin.firestore();

const refPath = `/status/{sessionID}/{uid}`;

// Create a new function which is triggered on changes to /status/{sessionID}/{uid}
// Note: This is a Realtime Database trigger, *not* Cloud Firestore.
export const onUserStatusChanged = functions.database.ref(refPath).onUpdate(
  async (change, context) => {
    // Get the data written to Realtime Database
    const eventStatus = change.after.val();
    // Then use other event data to create a reference to the
    // corresponding Firestore document.
    const userStatusFirestoreRef = firestore
      .doc(
        `sessions/${context.params.sessionID}/members/${context.params.uid}`
      );

    // It is likely that the Realtime Database change that triggered
    // this event has already been overwritten by a fast change in
    // online / offline status, so we'll re-read the current data
    // and compare the timestamps.
    const statusSnapshot = await change.after.ref.once('value');
    const status = statusSnapshot.val();
    console.log(status, eventStatus);
    // If the current timestamp for this data is newer than
    // the data that triggered this event, we exit this function.
    if (status.lastActiveAt > eventStatus.lastActiveAt) {
      return null;
    }

    // Otherwise, we convert the last_changed field to a Date
    eventStatus.lastActiveAt = new Date(eventStatus.lastActiveAt);

    // ... and write it to Firestore.
    return userStatusFirestoreRef.set(
      eventStatus,
      { merge: true },
    );
  },
);

