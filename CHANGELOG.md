# Changelog

## 2025-12-31
- Restored edit-details dialog state and handlers so the popup opens and saves.
- Replaced cancelled follow-up Call/WhatsApp with a Contact button and dialog showing phone.
- Added "Mark as done" for cancelled follow-ups and wired it to close the item.
- Mark cancelled follow-ups as sendStatus="done" when closed.
- Filter cancelled follow-ups to show only sendStatus="ready".
- Updated reschedule follow-ups with Contact dialog, Mark as done, and ready-only filter.
- Display service from message text alongside patient name on outbox cards.
- Flag missing service in Needs review and exclude it from Send now.
- Treat placeholder names like "there" as missing and unify edit-details action for missing fields.
- Display "Missing name" instead of placeholder names on outbox cards and details.
- Persist edit-details changes back to the Outbox sheet (phone/service/etc.).
- Darkened prefilled input text and placeholder styling in the edit details dialog.
- Sanitize dentist display text to show only the doctor name before date/time.
- Added subtle row-entry animations for list cards with reduced-motion fallback.
- Slowed row-entry animation and staggered list item reveals.

## 2025-01-01
- Added changelog tracking for ongoing updates.
- Added edit details action for missing name or dentist in needs review.
- Wired "Add phone" to open the edit details dialog in needs review.
