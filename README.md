# DRINKO PWA

A simple mobile web app for water reminders.

## What works in this first build
- DRINKO branded mobile interface
- Daily glass / ml counter
- User-set glass size and daily target
- Reminder interval and start/finish times
- "I've drunk it", "Not yet", and "+ I drank a glass"
- Miss one -> next reminder asks for two glasses
- Catch-up capped at 2 glasses
- Local history saved on the phone
- Installable as a PWA
- Browser notifications when the PWA/browser is running

## Important limitation
A purely static PWA cannot reliably schedule notifications while the phone has fully suspended/closed the app.
Reliable background reminders require web push from a small backend (or a native app). That is the next build step.

## Quick test
Because service workers require HTTP/HTTPS, do not open index.html directly from the filesystem.
Deploy this folder to any HTTPS static host such as GitHub Pages, Vercel, Netlify or Cloudflare Pages.

## Health note
DRINKO only tracks the target you set. It does not calculate a medically appropriate fluid target.
