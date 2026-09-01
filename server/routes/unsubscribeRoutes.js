import express from "express";
import { oneClickUnsubscribe, unsubscribePage } from "../controllers/unsubscribeController.js";

const router = express.Router();

/*
 * No `protect` on either route, and that is the whole point.
 *
 * The recipient is in their mail client. They have no session, and requiring one would mean the only
 * way to stop unwanted mail is to sign in to the service sending it — which nobody does. They press
 * the spam button instead, and that costs the deliverability of every message the platform sends.
 *
 * Authorisation comes from the signed token instead: an HMAC over (userId, category) that cannot be
 * forged and authorises exactly one thing — turning OFF mail to an address we were already emailing.
 */

/** RFC 8058 one-click. Gmail and Yahoo POST here themselves, with no user interaction. */
router.post("/", oneClickUnsubscribe);

/** A person clicking the link in the message body. Answers a small HTML page. */
router.get("/", unsubscribePage);

export default router;
