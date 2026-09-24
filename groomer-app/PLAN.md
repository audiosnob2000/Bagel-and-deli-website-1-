# Slotted for Groomers: Product & Build Plan

> Working name: **Slotted**. It works for any appointment-based business, which suits the plan to reuse this app for landscapers, salons and others.
> Design mockup (9 screens, clickable): https://claude.ai/artifact/Tg96dmvG8sMc8nWSVFwDPJ

**Who it's for:** solo groomers who run one shop and use a desktop at the front desk and a phone at the grooming table.
**The feature that sets it apart:** two-way texting with clients, where every message is filed under a specific pet. Reviewers of Savvy Pet Spa said this was missing.

---

## 1. What changed from the original spec

| Area | Original spec | Improved plan | Why |
|---|---|---|---|
| Clients | One record per owner with a single `petName` | **Households:** an owner has many pets, and each pet has its own groom notes, vaccines and photos | Two-dog homes are common. A single pet field breaks with the first one you sign up. |
| Messaging | Not included | **Two-way SMS from a dedicated number for each business, threaded by pet** | This is the gap Savvy Pet Spa reviewers complained about |
| Reminders | One-way, sent 24 hrs before | **Two-way.** "Reply C to confirm" updates the booking, and if nobody replies a follow-up text goes out automatically | Confirmations cut no-shows more than a reminder alone |
| Rebooking | Not included | Suggest a date 6 weeks out at checkout, plus a "Due to rebook" list | Most grooming revenue comes from repeat visits |
| Pet records | `notes` field | **Groom notes** (blade, face, finish), handling flags, vaccine expiry alerts, before and after photos | Groomers need to repeat the same cut every time. Expired vaccines are a liability risk. |
| Checkout | A `paid` true/false flag | Line items, tip, payment method, a text-to-pay link and a pickup photo | This is how the day actually ends at the shop |
| Who pays for texting | Not addressed | **Bring-your-own-account (BYOA) by default** — each groomer connects their own Twilio account during setup, so the texting bill goes to them, not you | Keeps the app close to free for you to run, and supports going back to the original $15–25/mo target (see §7) |
| Firebase plan | "Free to start" | **The Blaze (pay-as-you-go) plan is required.** No calling/voice feature is planned — this is texting only. But Firebase's free (Spark) plan blocks Cloud Functions from making *any* outbound network request to a non-Google service, so even a text-sending API request to Twilio (or a request to Stripe) needs Blaze. | Blaze still includes a free usage allowance, so early costs stay close to $0 |
| Pricing | $15–25/mo | **$19–25/mo holds, roughly** — BYOA means texting costs are billed to the groomer's own Twilio account, not baked into your price (see §7) | The original range was only at risk if *you* had to cover texting costs; BYOA avoids that |

---

## 2. Screens (they match the mockup)

**Desktop (front desk)**
1. **Today:** greeting, today's numbers (dogs, booked, unpaid, unread), the day's schedule with confirmation status, *Needs attention* (unpaid, unconfirmed, expiring vaccines), *Due to rebook*, and the automatic-reminder queue.
2. **Messages:** three panes. Conversation list → thread → pet details (groom notes, vaccines, next visit). The composer has an **About: [pet]** tag, quick replies and photo attachments.
3. **Calendar:** day, week and month views. Color shows status (confirmed, awaiting reply, unpaid, done), and a line marks the current time.
4. **Client and pets:** household header with the owner's text consent on record, a tab for each pet, groom notes, handling warnings, visit history, vaccines and photos.
5. **Settings → Texting:** SMS and WhatsApp shown as two separate channel cards, each with its own connect/manage/disconnect controls. Click "Connect WhatsApp" to walk through the actual Embedded Signup flow described in §3b (consent → choose business → verify number → enter code → connected).

**Phone (grooming table)**
6. **Today:** a large "In progress" card with Text Owner and Check Out buttons, plus the rest of the day.
7. **Thread:** the same pet tagging and quick replies as desktop, sized for thumbs.
8. **New booking:** pick services and only the time slots that fit the total length are shown. Includes reminder and confirmation switches.
9. **Checkout:** tip, payment method, one-tap rebook in 6 weeks, pickup photo text.

---

## 3. In-app client messaging (the new feature)

### Who pays for texting
Every real texting vendor (Twilio, Vonage, Plivo, AWS, Telnyx, Bandwidth...) charges per message plus a small monthly number fee, because they're all passing through carrier costs — that's not a markup you can shop your way out of. What you *can* control is whose bill it lands on. This plan defaults to **bring-your-own-account (BYOA)**: each groomer connects their *own* Twilio account during setup, so texts are sent and billed under *their* account. You never see a Twilio invoice, and the app itself costs you almost nothing to run per business. A shared account you run and meter (the "hosted" model from the earlier draft of this plan) is kept as an optional later add-on — see §7 and §9.

### How it works
- **Setup wizard, once, during onboarding:** the groomer creates a Twilio account (or signs into an existing one) and, following an in-app guide, (1) generates a restricted **API Key** in their Twilio console — never their master Auth Token, (2) buys a local number, and (3) completes US **A2P 10DLC** brand/campaign registration, all inside their own account. They paste the resulting Account SID and API Key into Settings → Texting. The app never asks for their Twilio login.
- Those credentials are stored as a **per-business secret** (Secret Manager, referenced by name from Firestore — the raw key is never written to a document) and used only by Cloud Functions, never sent to the browser.
- Owners text that number from their normal texting app. **Owners don't install anything.**
- **Outbound:** the groomer writes in the app → a Cloud Function loads *that business's own* Twilio credentials → the Twilio API → the owner's phone.
- **Inbound:** Twilio calls a webhook (an HTTPS Cloud Function) on the groomer's own number. The function looks up which business owns that number (`numberIndex`), validates Twilio's signature using *that business's* auth token, finds the owner by the sender's number (`From`), saves the message and updates the unread count, and sends a web push notification to the groomer.

### How each message gets filed to a pet
Each message is matched to a pet automatically, checking these rules in order:
1. The household has only one pet → that pet.
2. The text mentions a pet's name, e.g. "Juniper has a hot spot" → that pet.
3. An appointment is within ±24 hours → the pet(s) on that appointment.
4. Otherwise it's tagged **Household**, and the groomer can re-tag it with one tap.

Outbound messages use the **About** chip in the composer. Because every message is filed this way, a pet's profile shows its full text history ("what did we agree on for Olive's cut?").

### Automated texts that go through the same thread
- A reminder 24 hours before, asking for **C** to confirm or **R** to reschedule. Replies like "C", "yes" or "confirm" mark the booking confirmed. "R" flags it for the groomer.
- If there's no reply, a follow-up goes out a few hours before the appointment.
- Payment reminders: the first after the visit if it's unpaid, a second after 3 days, then they stop.
- A rebook nudge when a pet is past its usual gap between grooms.
- "Ready for pickup" with a photo (MMS).

### Compliance and deliverability (don't skip)
- **US A2P 10DLC registration** is required to send texts from a local business number. Under BYOA each groomer completes it **inside their own Twilio account** — your app can't do it for them, only guide them through it with a step-by-step walkthrough and pre-filled copy. **Approval can take days to weeks**, so the setup wizard should say this up front and let the groomer keep using the rest of the app while it's pending. Toll-free numbers with toll-free verification are a faster fallback.
- **Consent:** record when and how each owner agreed to texts (a checkbox on the client form, or their first text in). The mockup shows "Agreed to texts on Mar 12, 2024".
- **STOP, START and HELP** are handled by Twilio's opt-out system and copied to `contact.smsOptOut`. An owner who opted out gets no automated texts, and the groomer's send button is blocked.
- **Quiet hours:** automated texts only go out 8 AM–8 PM in the business's time zone.
- **Links:** payment links use your own domain. Link shorteners like bit.ly get filtered by carriers.
- **Message length:** show a segment counter. A single emoji switches the text to a different encoding, which cuts the limit to 70 characters per segment and can double the cost.

### 3b. WhatsApp as a second channel (optional, off by default)

Not a replacement for SMS — a client has to have WhatsApp installed and be willing to use it, which isn't universal in the US, especially with an older or local clientele. Offer it as a **channel a groomer can turn on**, with both numbers feeding the same unified thread per household.

**Connecting it (BYOA, same principle as Twilio):** Meta's WhatsApp Business Platform (Cloud API) has a built-in flow for this, called **Embedded Signup** — a popup, like "Sign in with Google," where the groomer logs into their own free Meta Business account, verifies a phone number, and is done. No developer console, no copy-pasted API keys. The mockup's Settings → Texting screen shows this exact flow: consent → choose/create a business → verify a number → enter the code → connected. Building the button that starts it requires *you* to register once as a Meta Tech Provider and pass Meta's app review — a one-time platform setup, not something each groomer does.

**The one real behavior difference:** WhatsApp only allows free-form messages within a **24-hour window** after a client has messaged in. Outside that window (exactly the situation for a 24-hrs-before reminder), the message must use a **pre-approved template** — fixed wording with fill-in variables, submitted to Meta ahead of time and usually approved within hours. This fits naturally, since reminders, payment nudges and rebook nudges are already template-shaped; it mainly means the groomer can't cold-text a quiet client free-form without it being a template too.

**Cost:** verify current Meta pricing before committing to numbers, but directionally: a client-initiated conversation (they text first) is typically free, and business-initiated template messages are billed per message, often a bit cheaper than SMS for US utility-category templates. Registration friction is lighter than 10DLC — Meta's business verification, no carrier brand/campaign wait.

---

## 4. Revised data model (Firestore)

```
businesses/{bizId}
  name, email, timezone, hours,
  subscriptionStatus, stripeCustomerId, trialEndsAt
  smsProvider{ mode ('byoa'|'hosted'), smsNumber (E.164), twilioAccountSid,
               twilioApiKeySid, secretRef, tenDlcStatus, smsSentThisPeriod }
               ← secretRef points to a Secret Manager entry holding the API key secret; never stored in Firestore
  /services/{id}      name, durationMin, price, isAddOn
  /households/{id}    displayName ("Nair household"), notes, balanceCents
     contacts: [{ name, phoneE164, email, smsConsentAt, smsConsentSource, smsOptOut }]
  /pets/{id}          householdId, name, breed, sex, birthDate, weightLb,
                      groomNotes{body, face, ears, finish}, handlingFlags[],
                      vaccines[{type, expiresOn, docUrl}], rebookEveryWeeks, photoUrls[]
  /appointments/{id}  householdId, petIds[], startAt (Timestamp), endAt, services[{id, price}],
                      status (booked|confirmed|checked_in|in_progress|completed|no_show|cancelled),
                      confirmRequested, confirmedAt, reminderSentAt, followUpSentAt,
                      payment{status, subtotal, tip, method, paidAt, linkUrl}
  /conversations/{householdId}   lastMessageAt, lastSnippet, unreadCount
     /messages/{id}   direction (in|out|auto), body, mediaUrls[], petIds[], appointmentId,
                      twilioSid, status (queued|sent|delivered|failed|received), createdAt, sentBy
numberIndex/{e164}    bizId       ← routes inbound texts to the right business
```

**Key choices**
- Store appointment times as a `Timestamp`, not separate date and time strings. Keep each business's `timezone` so daylight-saving changes and "24 hrs before" are calculated correctly.
- Put phone numbers in E.164 format (+15550142231) when they're saved, so inbound matching is a simple lookup.
- **Security rules:** every read and write must satisfy `request.auth.uid` = a member of `bizId`. Only Cloud Functions (Admin SDK) write `messages` with `direction: in`, `subscriptionStatus` and `smsProvider.smsSentThisPeriod`. `smsProvider.secretRef` is never read by client-facing rules — only Cloud Functions resolve it, and only against Secret Manager.

---

## 5. Architecture

```
GitHub Pages (static React + Tailwind)  ──Firebase SDK──▶  Firestore / Auth
          │                                                   ▲
          └── callable functions ──▶ Cloud Functions ─────────┘
                                        │   ├─▶ Twilio  (send SMS/MMS, using each business's own account)
                                        │   ├─◀ Twilio  (inbound + status webhooks, per business number)
                                        │   ├─▶ SendGrid (email fallback)
                                        │   └─◀▶ Stripe (subscription + webhooks)
                                        └── Scheduler (every 15 min: reminders, follow-ups)
```

- **No shared Twilio credential:** Cloud Functions never hold one platform-wide key. Every send or inbound-webhook validation first looks up `bizId` → `smsProvider.secretRef` in Secret Manager and uses that business's own credentials.
- **GitHub Pages notes:** use `HashRouter` (or the `404.html` redirect trick) so page reloads don't return 404. The Firebase web config is meant to be public, and security comes from the rules. **Never** put Twilio, Stripe or SendGrid secret keys in the frontend. Keep them in Cloud Functions secrets (`defineSecret`).
- **Make it an installable PWA:** add a manifest and service worker so it installs to the home screen on the phone at the grooming table, and turn on Firestore offline persistence for spotty Wi-Fi.
- **Reminder scheduler:** run every 15 minutes rather than once a day. For each appointment where `startAt` is within 24 hrs, `reminderSentAt` is empty and the status is booked, send the reminder and set `reminderSentAt` **in a transaction** so it's never sent twice. Pause the reminder if the time falls in quiet hours. A cancelled or rescheduled appointment clears or updates its pending reminders.
- **Delivery status:** Twilio status callbacks update `messages.status`. A failed text (for example, to a landline) goes to *Needs attention* and falls back to email.

---

## 6. Build order (revised)

| Phase | Deliverable | Notes |
|---|---|---|
| **0. Setup** | Firebase (Blaze plan), Stripe products, SendGrid | No platform-wide Twilio account needed — each groomer brings their own in Phase 2 |
| **1. Core** | Auth and business onboarding (hours, time zone, services menu) → households and pets → calendar and booking → Today dashboard | Include CSV import of an existing client list, since switching is the biggest hurdle for new customers |
| **2. Messaging** | **BYOA setup wizard** (connect a Twilio account, buy a number, 10DLC walkthrough) → send and receive, threads, pet tagging, quick replies, MMS photos, unread badges, web push | Test end-to-end with your own Twilio account and phone first |
| **3. Automations** | 24-hr reminder with reply-C confirmation, no-reply follow-up, payment reminders, rebook nudges, vaccine expiry alerts | Every automation respects opt-out and quiet hours |
| **4. Billing** | Stripe Checkout (14-day trial), Customer Portal for cancelling, webhook → `subscriptionStatus`, 7-day grace period | A lapsed account becomes **read-only** (never deleted) and automations pause. No text-usage metering needed for you under BYOA — that's Twilio billing the groomer directly; only build it if you later add the hosted tier (§9) |
| **5. Polish and beta** | Checkout flow, pickup photos, empty states, accessibility pass, PWA install, beta with 3–5 local groomers | |
| **Later** | Online self-booking page for owners, Stripe Connect for card-on-file payments (auto-marks paid), salon tier with staff columns, other business types | |

Messaging comes before billing because it's the reason groomers will switch. Charge for the app once it proves that.

---

## 7. Pricing reality check

Under BYOA, texting is billed by Twilio directly to the groomer's own card — it never touches your revenue or your costs. That means the subscription price only has to cover the app itself, which has close to zero marginal cost per business. **This supports going back to the original $15–25/mo target.**

For reference, so you can set expectations in the setup wizard and marketing copy: a solo groomer doing about 6 dogs a day × 22 days ≈ **130 appointments a month**, at roughly 6–8 text segments per appointment (reminder, reply, follow-up, pickup text), lands around **800–1,000 segments a month**. Twilio charges for incoming texts as well as outgoing ones. At about 1¢ per segment plus MMS photos and the number's monthly fee, that's roughly **$10–15/mo paid to Twilio by the groomer, directly** — worth stating plainly up front so it's never a surprise later.

**Recommendation: $19–25/mo** for the app subscription, 14-day trial, texting cost called out separately and clearly in the setup wizard. Show the groomer's own `smsProvider.smsSentThisPeriod` count in Settings so they can watch their own Twilio spend.

If you later build the optional **hosted texting tier** (§9) for groomers who'd rather not touch Twilio themselves, price *that* tier closer to the earlier draft of this plan — **$29–39/mo with a text allowance** — since at that point you're the one fronting the metered cost and need it covered. *Check current Twilio and 10DLC fees before finalizing any price, because they change.*

---

## 8. Edge cases to design for

- **Several contacts per household** (partner, dog-walker): each contact has their own consent record, and all of them feed into one household thread.
- **Unknown number texts in:** it creates a "New contact" thread with a button to turn it into a client.
- **After-hours texts:** optional auto-reply ("Thanks! Jess is grooming and will reply soon.").
- **Reschedule or cancel** changes pending reminders, and texts the owner if the groomer chooses.
- **Vaccine expires before a booked visit:** flagged on Today and in the thread's side panel.
- **Photo size:** compress on the device before sending as MMS, because carriers limit attachment size.
- **Time zones and daylight saving:** store everything in UTC and display it in the business's time zone.
- **Offline at the table:** writes queue up and sync when the connection returns, with a visible "Offline" indicator.
- **Privacy:** export and delete a client's data on request. Texts are business records, so keep them after a client leaves unless deletion is requested.
- **Subscription lapses:** texting number is kept for 30 days, and inbound texts are still saved so no client message is lost.

---

## 9. Open decisions

1. Final app name (Slotted is a placeholder; ShowUp and Trellis were the other candidates).
2. Local numbers or toll-free as the setup wizard's recommended default (it's the groomer's own Twilio account either way, but the wizard should steer them). Local numbers feel more personal; toll-free gets approved faster.
3. Whether owners should get a web link for booking, payment and photos in a later version.
4. Repo strategy: the spec says "one repo per business type". This build now lives in its own repo (`audiosnob2000/dog-groomer-app`) rather than the bagel & deli website's, which is the right first step. If a landscaper or salon version gets built later, consider **one core repo with a per-business-type config** (terms like pet or lawn, a default services menu, text templates) so fixes to login, calendar, billing and messaging reach every version at once, instead of a full second repo.
5. Whether to eventually build the **optional hosted texting tier** (§7) for groomers who don't want to set up their own Twilio account. It's a real upsell, but it means taking back on the metered cost and the 10DLC-as-a-platform burden that BYOA currently avoids — worth revisiting once you have paying BYOA customers and can see how much support time the Twilio setup step actually costs you.
