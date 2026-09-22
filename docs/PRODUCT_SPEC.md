# Product Specification

## User story
A traveler captures three photos and a short voice note. The app combines the transcript, confirmed location/date metadata, and image observations into an editable newsletter draft.

## Inputs
- Exactly three photographs.
- One voice note, normally 30 seconds to 3 minutes.
- Optional title.
- Optional location correction.
- Captured date/time.
- Content mode: general, ministry, business, or personal.

## Outputs
- Newsletter title.
- 3–5 subject lines.
- Preview text.
- Opening paragraph.
- 250–400 word body.
- Three photo captions.
- Call to action.
- Optional prayer request.
- Social caption.
- Hashtags.
- Review flags.

## Safety and quality rules
- Treat the voice note as the primary source of meaning.
- Do not invent people, conversations, locations, dates, events, or spiritual outcomes.
- The model may suggest image descriptions but must not treat uncertain visual inference as fact.
- Flag faces, children, license plates, private addresses, and sensitive information.
- Confirm location before publication.
- Never publish automatically.
- Allow edit, regenerate, replace, crop, blur, and delete.

## MVP screens
1. Home: new entry and saved entries.
2. Capture: three photo slots, voice recorder, title, location, save.
3. Processing: upload and generation status.
4. Review: photos, transcript, editable draft, flags, export.

## Non-goals for MVP
- Automatic social publishing.
- Subscriber management.
- Analytics.
- Translation.
- Payments.
- Multi-user teams.
