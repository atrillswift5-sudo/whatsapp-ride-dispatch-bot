# WhatsApp Ride Dispatch Bot MVP

This is a starter backend for an Uber-style WhatsApp chatbot.

It supports:

- Rider booking form over WhatsApp
- Rider confirmation
- Sending confirmed rides to drivers
- First driver to press ACCEPT gets the ride
- ETA request flow
- Driver "I'm outside" update
- Driver/rider question relay
- PostgreSQL database schema
- Meta WhatsApp Cloud API webhook structure

## Recommended stack

- Node.js
- Express
- PostgreSQL or Supabase
- Meta WhatsApp Cloud API
- Optional: Admin dashboard later

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your database and run:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

3. Copy environment example:

```bash
cp .env.example .env
```

4. Fill in your Meta WhatsApp credentials in `.env`.

5. Start the server:

```bash
npm run dev
```

6. Expose local webhook for testing:

```bash
ngrok http 3000
```

7. Add your webhook URL in Meta Developer dashboard:

```text
https://YOUR-NGROK-URL/webhook
```

Webhook verify token must match `VERIFY_TOKEN` in `.env`.

## Main flow

### Rider

1. Rider messages WhatsApp.
2. Bot collects:
   - name
   - pickup
   - dropoff
   - pickup time
   - passengers
   - vehicle type
   - notes
3. Bot summarizes the ride.
4. Rider replies YES or EDIT.
5. Bot sends ride to available drivers.

### Driver

1. Driver receives ride request.
2. Driver replies or presses ACCEPT.
3. First accepted driver gets locked to the ride.
4. Rider is notified.
5. Rider can request ETA.
6. Driver can send ETA, say "I'm outside", or ask rider questions.

## Important notes

- For the MVP, this project sends ride requests to drivers individually.
- This is more reliable than WhatsApp group automation because group automation has platform restrictions.
- You can add a driver dashboard later.
