# DraftMeet — Manual Test Plan

**How to use this file**
Work through each section in order. Mark each test ✅ Pass, ❌ Fail, or ⏭ Skip. For failures, note what happened in the Notes column. Reset test data between runs by creating a fresh test account where indicated.

---

## Pre-flight checklist
- [ ] App running at `https://draftmeet.com` (or local `http://localhost:3000`)
- [ ] Backend running at `https://api.draftmeet.com` (or local `http://localhost:8000`)
- [ ] Have two email addresses ready (host + guest)
- [ ] Have a Google account for OAuth testing
- [ ] Set `ADMIN_EMAIL` to your email in backend env

---

## 1 — Authentication

### 1.1 Sign up with email/password

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 1 | Go to `/login` | Login page loads with Google button + Log In/Sign Up tabs | | |
| 2 | Click "Sign Up" tab | Form shows Email + Password fields | | |
| 3 | Enter valid email + password `<8 chars`, click "Create Account" | Error: password too short | | |
| 4 | Enter valid email + password `>=8 chars`, click "Create Account" | Redirects to `/dashboard` | | |
| 5 | Log out, go to `/login`, enter same email + wrong password | Error: invalid credentials | | |
| 6 | Enter correct credentials, click "Log In" | Redirects to `/dashboard` | | |
| 7 | Try to sign up with the same email again | Error: email already registered | | |

### 1.2 Google OAuth

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 8 | Click "Continue with Google" | Redirected to Google consent screen | | |
| 9 | Complete Google sign-in | Redirected to `/dashboard`, account created | | |
| 10 | Go to `/dashboard/settings`, click "Connect Google Calendar" | Google consent screen (calendar scopes) | | |
| 11 | Grant calendar access | Redirected back, "Connected" status shown | | |

### 1.3 Session & logout

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 12 | While logged in, open `/login` | Redirected to `/dashboard` | | |
| 13 | Click "Logout" in sidebar | Redirected to `/`, session cleared | | |
| 14 | Try to access `/dashboard` after logout | Redirected to `/` | | |

---

## 2 — One-Time Links (OTL)

### 2.1 Creating links

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 15 | Go to `/dashboard/links`, One-Time tab | Page loads, list empty or shows existing links | | |
| 16 | Click "+ New Link" | Modal opens with create form | | |
| 17 | Click backdrop or ✕ button | Modal closes, no link created | | |
| 18 | Open modal, leave all defaults, click "Generate Link" | New `active` link appears at top of list | | |
| 19 | Open modal, enter a Meeting Title, pick "60-min 1:1", expires "24 hours", click "Generate Link" | Link created with correct type and expiry | | |
| 20 | Open modal, expand "▸ Add Custom Questions", click "+ Add Question" | New question row appears | | |
| 21 | Add a Dropdown question, click "+ Add Option" twice, add option text, click "Generate Link" | Link created; dropdown options visible on booking page | | |
| 22 | Open modal, expand "▸ Set Page Customization", enter Description, click "Generate Link" | Link created with description | | |
| 23 | Verify customization persists: open modal again | Description pre-filled from localStorage | | |

### 2.2 Link list actions (⋮ menu)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 24 | Click ⋮ on an active link | Dropdown shows: Copy URL, Embed Code, Customize, Revoke | | |
| 25 | Click "Copy URL" | Clipboard contains `https://draftmeet.com/book/lnk_...` | | |
| 26 | Click ⋮ → "Embed Code" | Embed panel expands below row with `<script>` snippet | | |
| 27 | Click "Copy snippet" inside embed panel | Clipboard contains script tag | | |
| 28 | Click ⋮ → "Customize" | Customize panel expands, form pre-filled with current values | | |
| 29 | Change accent color, click "Save" | Panel closes; color updated | | |
| 30 | Click ⋮ → "Revoke" | Confirm dialog appears | | |
| 31 | Confirm revoke | Link status changes to `revoked`; ⋮ menu now shows "Delete" | | |
| 32 | Click ⋮ → "Delete" on a non-active link | Confirm dialog, then link removed from list | | |

### 2.3 Search and filters

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 33 | Type in search bar | List filters in real-time (debounced) | | |
| 34 | Select "Active" from status dropdown | Only active links shown | | |
| 35 | Select "Revoked" | Only revoked links shown | | |
| 36 | Search for a link ID snippet while status filtered | Shows matching link if status matches | | |

### 2.4 Bulk actions

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 37 | Check two active links | Bottom bar appears: "2 selected" with Revoke/Delete buttons | | |
| 38 | Click "Revoke Selected" | Both links change to `revoked` | | |
| 39 | Click "Clear" | Selection cleared, bottom bar disappears | | |
| 40 | Check "Select all" checkbox at top | All visible links selected | | |

---

## 3 — Permanent Links

### 3.1 Creating permanent links

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 41 | Switch to "Permanent" tab | Permanent links list loads | | |
| 42 | Click "+ New Permanent Link" | Modal opens | | |
| 43 | Leave Slug empty, click "Create Link" | Button stays disabled | | |
| 44 | Enter slug "test-meeting", pick type, click "Create Link" | Link created at `@username/test-meeting` | | |
| 45 | Try to create another link with same slug "test-meeting" | Error: slug already taken | | |
| 46 | Create link with slug "my-intro" + Custom Questions + Customization | Link created with all data | | |

### 3.2 Permanent link actions

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 47 | Click ⋮ → "Copy Link" on active link | Clipboard: `https://draftmeet.com/u/{username}/{slug}` | | |
| 48 | Click ⋮ → "Pause" | Status badge changes to "Paused"; Pause becomes "Resume" in menu | | |
| 49 | Click ⋮ → "Resume" | Status back to "Active" | | |
| 50 | Click ⋮ → "Delete" | Confirm dialog, link removed | | |

---

## 4 — Guest Booking Flow (OTL)

> Use a link created in Section 2. Open in incognito / different browser.

### 4.1 Normal booking

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 51 | Open `draftmeet.com/book/[active-token]` | Loading spinner, then date picker shown | | |
| 52 | Click a working day on the calendar | Slots appear in 3-column grid | | |
| 53 | Click a time slot | Form appears with Name, Email, Notes fields | | |
| 54 | Click "← Change time" | Back to slot picker | | |
| 55 | Pick a slot again, fill Name + Email, click "Confirm Booking" without checking consent | Error: must agree to Terms | | |
| 56 | Check consent checkbox, click "Confirm Booking" | Success screen with 🎉 and "Booking Confirmed!" | | |
| 57 | If Google Calendar connected: "🎥 Join Google Meet" button visible | Meet link opens in new tab | | |
| 58 | Check host's `/dashboard` | Booking appears in list with correct guest + time | | |
| 59 | Check guest's email (if Resend configured) | Confirmation email received | | |

### 4.2 Error states

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 60 | Open a revoked/used link | "Link Unavailable" error with 🔒 icon | | |
| 61 | Visit a non-existent token `/book/fake123` | "Link Unavailable" | | |
| 62 | Select a day with no available slots | "No available slots on this day." message | | |
| 63 | Try booking without filling Name | Validation error on Name field | | |
| 64 | Try booking without filling Email | Validation error on Email field | | |
| 65 | Fill a required custom question but leave empty, submit | Validation error for that field | | |

### 4.3 Custom fields on booking page

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 66 | Use a link that has a required Text question | Question appears with asterisk (*) | | |
| 67 | Submit without filling required question | Validation error | | |
| 68 | Fill the question and submit | Booking created; answer visible in host's booking detail | | |
| 69 | Use a link with a Dropdown question | Dropdown appears with all options | | |
| 70 | Use a link with Long Text (textarea) question | Textarea appears with multiple rows | | |

---

## 5 — Guest Booking Flow (Permanent Link)

> Use a permanent link from Section 3.

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 71 | Open `draftmeet.com/u/{username}/{slug}` | "@username" shown at top, same booking flow | | |
| 72 | Complete a booking | Success screen, same as OTL | | |
| 73 | Visit the same URL again | Booking form loads again (permanent link reusable) | | |
| 74 | Open a paused permanent link | "Link Unavailable" error | | |

---

## 6 — Bookings Dashboard

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 75 | Go to `/dashboard` (bookings page) | All bookings listed, max 20 shown | | |
| 76 | If >20 bookings: "Load More (N remaining)" button visible | Click loads 20 more | | |
| 77 | Click "Confirmed" filter | Only confirmed bookings shown | | |
| 78 | Click "Cancelled" filter | Only cancelled bookings shown | | |
| 79 | Click "All" | All bookings shown | | |
| 80 | Click "↓ Export CSV" | CSV file downloads | | |
| 81 | Click "Reschedule" on an upcoming booking | Reschedule modal opens | | |
| 82 | Pick a new date + time, confirm | Booking updated, new time shown in list | | |
| 83 | Click "Cancel" on an upcoming booking | Confirm dialog; booking status changes to "cancelled" | | |
| 84 | For a past booking: "Record outcome →" link visible | Click opens outcome recorder | | |
| 85 | Select "Completed" | Outcome buttons highlighted | | |
| 86 | Enter notes, click "Save Outcome" | Badge shows "completed"; notes displayed | | |
| 87 | Click ✕ on outcome recorder (without saving) | Form collapses, no outcome saved | | |

---

## 7 — Guest Management Page

> Use the management link from a confirmation email or from `/manage/{token}`.

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 88 | Open `/manage/{valid-token}` | Booking details shown: name, email, date, status, Meet link | | |
| 89 | Open `/manage/invalid-token` | "Booking Not Found" error | | |
| 90 | Click "✕ Cancel" on upcoming booking | Confirm dialog appears | | |
| 91 | Confirm cancel | "Booking Cancelled" success screen; host list shows "cancelled" | | |
| 92 | Revisit same management link | Shows booking as cancelled, no action buttons | | |
| 93 | Open a different booking's management link | Reschedule flow available | | |
| 94 | Click "🔄 Reschedule", pick new date/time, confirm | "Booking Rescheduled!" success; host list updated | | |
| 95 | Open management link for a past booking | Buttons gone; shows "This booking has already passed" notice | | |

---

## 8 — Availability Settings

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 96 | Go to `/dashboard/availability` | Current settings shown | | |
| 97 | Uncheck Monday, click "Save Settings" | "✓ Saved!" shown; Monday removed from working days | | |
| 98 | Check guest booking page next Monday | No slots available for Monday | | |
| 99 | Re-enable Monday | Slots available again | | |
| 100 | Add a custom time "11:15", click "Add" | "11:15" appears in shifts list, sorted | | |
| 101 | Remove a shift by clicking × | Shift removed from list | | |
| 102 | Change Buffer Between Meetings to "15", save | Slots that are 15 min apart now blocked | | |
| 103 | Set Minimum Notice to "24h", save | Slots within next 24 hours not shown on booking page | | |
| 104 | Set Max Bookings Per Day to "2", save | After 2 bookings on one day, that day shows "No availability" | | |
| 105 | Set a Date Override: block tomorrow | Tomorrow shows no slots on booking page | | |
| 106 | Set a Date Override: custom shifts for a date | Only those custom shifts appear for that date | | |
| 107 | Delete an override | Slots return to normal for that date | | |

---

## 9 — Profile

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 108 | Go to `/dashboard/profile` | Current username, display name, bio shown | | |
| 109 | Change display name, click "Save Profile" | "✓ Saved!"; name updated across public profile | | |
| 110 | Try to change username to one already taken | Error: username already taken | | |
| 111 | Change username to a valid unique value | Username updated; profile URL changes to `/u/{new-username}/` | | |
| 112 | Visit `draftmeet.com/u/{username}` | Public profile page shows display name, bio, active permanent links | | |

---

## 10 — Settings

### 10.1 Google Calendar

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 113 | If calendar connected: open calendar selector dropdown | Your Google calendars listed | | |
| 114 | Select a different calendar, click "Save" | "✓ Saved!"; new events go to that calendar | | |
| 115 | Click "Disconnect" | Calendar disconnected; status shows "Not connected" | | |
| 116 | Verify that new bookings fail or skip calendar if disconnected | Booking created but no Meet link generated | | |

### 10.2 Double Booking Prevention

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 117 | Toggle prevention ON (default), save | External calendar events block slots | | |
| 118 | Create a Google Calendar event at 2pm tomorrow (via Google Calendar directly) | 2pm slot NOT shown on booking page | | |
| 119 | Toggle prevention OFF, save | External events no longer block slots; 2pm shown | | |

### 10.3 Custom Domain

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 120 | Enter a domain with "https://" prefix, click "Save" | Domain saved without prefix | | |
| 121 | Enter an invalid format (e.g. "not a domain"), click "Save" | Error: invalid domain format | | |
| 122 | Enter a valid domain, click "Save" | Domain registered; instructions shown, status "Pending DNS" | | |
| 123 | Click "Verify" before setting CNAME | "Not verified yet — check your DNS settings" message | | |
| 124 | (After CNAME set) click "Verify" | Status changes to "Verified" | | |
| 125 | Visit `https://yourcustomdomain.com/coffee-chat` | Booking page loads for that permanent link | | |
| 126 | Click "Remove" | Confirm dialog; domain removed, status cleared | | |

---

## 11 — Webhooks

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 127 | Go to `/dashboard/webhooks`, Webhooks tab | "▸ Register Endpoint" collapsed | | |
| 128 | Click "▸ Register Endpoint" | Form expands with URL, Secret, Events | | |
| 129 | Click "Register" without URL | Button stays disabled | | |
| 130 | Enter a valid HTTPS URL, check "booking.created", click "Register" | Webhook appears in list with "Active" badge | | |
| 131 | Webhook with 4+ events: verify "+N more" pill | Shows 3 events + "+1 more" | | |
| 132 | Click "Pause" | Badge changes to "Paused" | | |
| 133 | Click "Resume" | Badge back to "Active" | | |
| 134 | Click "Send Test" | Alert: "Test event sent to all active endpoints!" | | |
| 135 | Click "View Logs" | Delivery log shows test event: Delivered or Failed | | |
| 136 | Click "Delete" | Confirm dialog; webhook removed | | |
| 137 | Create a booking with a webhook registered | Log shows "booking.created" delivery attempt | | |

---

## 12 — API Keys

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 138 | Go to `/dashboard/webhooks`, API Keys tab | Key list shown (or empty) | | |
| 139 | Enter key name, click "Generate Key" | New key shown in monospace — **copy it now** | | |
| 140 | Dismiss/close — key no longer visible | Only prefix shown (e.g. `sk_...abc`) | | |
| 141 | Use the key to call `GET /api/v1/bookings/` with `Authorization: Bearer <key>` | 200 OK with your bookings | | |
| 142 | Click "Revoke" on the key | Confirm dialog; key deleted | | |
| 143 | Use the revoked key | 401 Unauthorized | | |

---

## 13 — Analytics

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 144 | Go to `/dashboard/analytics` | Stats cards show correct counts | | |
| 145 | Click "7d" period | Chart updates to last 7 days; subtitle changes | | |
| 146 | Click "30d" | Chart shows 30-day range | | |
| 147 | Click "90d" | Chart shows 90-day range | | |
| 148 | Check "By Event Type" breakdown | Percentages sum to 100% | | |
| 149 | Check "By Status" breakdown | Confirmed + Cancelled = Total | | |
| 150 | If outcomes recorded: outcome stats cards visible | Completion rate, no-show rate shown | | |

---

## 14 — Admin Dashboard

> Must be logged in as the admin account (`ADMIN_EMAIL`).

### 14.1 Access control

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 151 | While logged in as admin, go to `/admin` | Admin layout loads | | |
| 152 | Log in as a non-admin user, go to `/admin` | Redirected to `/dashboard` | | |

### 14.2 Overview

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 153 | Go to `/admin` | Platform stats: Total Users, Total Bookings, 30-day signup chart | | |
| 154 | Verify user/booking counts match known data | Counts correct | | |

### 14.3 Users

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 155 | Go to `/admin/users` | Paginated user table with username, email, booking count, joined date | | |
| 156 | Search by partial email | Table filters to matching users | | |
| 157 | Search for non-existent email | "No users found." empty state | | |
| 158 | Click "Next →" | Next page of users loads | | |
| 159 | Click "Impersonate →" on a user | Redirected to `/dashboard` as that user | | |
| 160 | Verify impersonation banner visible at top | Yellow banner: "Admin: Impersonating {email}" | | |
| 161 | Check a booking/link page — see that user's data | User's bookings and links shown | | |
| 162 | Click "Exit →" in impersonation banner | Redirected to `/admin/users`; banner gone | | |
| 163 | Verify you are admin again (`/admin` accessible) | Admin dashboard loads normally | | |

### 14.4 Waitlist

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 164 | Go to `/admin/waitlist` | Table of email + joined date | | |
| 165 | Click "Copy all emails" | Clipboard: newline-separated list of all emails | | |
| 166 | "✓ Copied!" shows briefly | Button reverts after 2s | | |

### 14.5 Domains

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 167 | Go to `/admin/domains` | Table: domain, @owner, Verified/Pending badge, date | | |
| 168 | Verified domain shows green badge | ✅ | | |
| 169 | Unverified domain shows yellow badge | ✅ | | |

---

## 15 — Public Profile Page

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 170 | Go to `draftmeet.com/u/{username}` | Public profile: display name, bio, list of active permanent links | | |
| 171 | Paused links NOT shown | Only `is_active = true` links visible | | |
| 172 | Click a link card | Navigates to booking page `/u/{username}/{slug}` | | |
| 173 | Visit a non-existent username | "Page Not Found" error | | |

---

## 16 — Custom Domain Booking (if domain verified)

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 174 | Visit `https://yourcustomdomain.com` | Profile page for that user loads | | |
| 175 | Visit `https://yourcustomdomain.com/{slug}` | Booking page for that link loads | | |
| 176 | Complete a full booking via custom domain | Booking created; Meet link works | | |
| 177 | Visit custom domain with unknown slug | "Link Unavailable" error | | |

---

## 17 — Embedding

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 178 | Copy embed code from ⋮ menu for an OTL | Code: `<script data-token="lnk_...">` | | |
| 179 | Paste into a plain HTML file and open in browser | Booking modal appears on the page | | |
| 180 | Complete booking in embedded modal | Booking confirmed; postMessage fires | | |

---

## 18 — UI / UX Checks

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 181 | Toggle dark/light theme in sidebar | All pages render correctly in both modes | | |
| 182 | Resize browser to mobile width (375px) | No broken layouts; all content accessible | | |
| 183 | Resize to tablet width (768px) | Layout adapts cleanly | | |
| 184 | Open links page, check scroll depth | No excessive scroll before first list item | | |
| 185 | Open bookings page with 1 booking | Single card, no scroll | | |
| 186 | Open webhooks page | Register form is collapsed by default | | |

---

## 19 — Edge Cases

| # | Step | Expected | Result | Notes |
|---|------|----------|--------|-------|
| 187 | Open booking page for OTL that has been used | "Link Unavailable" | | |
| 188 | Book same permanent link twice from two browsers simultaneously | Both succeed (permanent links allow multiple bookings) | | |
| 189 | Book same OTL from two browsers simultaneously | Only one succeeds; second sees "Link Unavailable" | | |
| 190 | Enter emoji in guest Name field | Booking created with emoji in name | | |
| 191 | Enter a 500-char bio in profile | Saved; truncated on display if needed | | |
| 192 | Leave dashboard idle for session timeout, try action | Redirected to login | | |
| 193 | Open `/dashboard` in two tabs; cancel booking in one | Refresh the other tab → shows as cancelled | | |

---

## Test Run Log

| Date | Tester | Environment | Section Covered | Issues Found |
|------|--------|-------------|-----------------|--------------|
| | | | | |
| | | | | |

---

## Issue Template

When logging a failure, copy this block:

```
**Test #:** [number]
**Step:** [what you did]
**Expected:** [what should happen]
**Actual:** [what actually happened]
**Browser:** [Chrome/Firefox/Safari + version]
**Screen recording/screenshot:** [link if available]
```
