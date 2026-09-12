const { v4: uuid } = require("uuid");
const db = require("../db/database");

/**
 * Records an in-app notification and logs it as the "sent" channel.
 *
 * To wire up real Email/SMS per the proposal's "Automate notification of
 * request status updates via email or SMS" objective, call an email
 * provider (e.g. Nodemailer + SMTP, SendGrid) or SMS gateway (e.g.
 * Semaphore, Twilio) from here, alongside the in_app row below.
 */
function notify({ userId, requestId, message, channel = "in_app" }) {
  const id = uuid();
  db.prepare(
    `INSERT INTO notifications (id, user_id, request_id, channel, message)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, requestId || null, channel, message);

  // eslint-disable-next-line no-console
  console.log(`[notify:${channel}] -> user ${userId}: ${message}`);
  return id;
}

module.exports = { notify };
