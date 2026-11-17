# Friends

Open **Friends** from the sidebar.

## Requests

Type the email a player logs in with and press **Send request**. They see it under **Requests** the next time they open Friends and can **Accept** or **Decline** it. Until then it's listed under **Sent** for you, where you can cancel it. If they had already sent you a request, sending one back accepts it.

**Remove** ends a friendship for both of you. Nothing already sent is taken back.

There's no email notification. In production, your friend must also be allowed through the Cloudflare Access policy (see [Production login](deployment.md#production-login)).

## What friends can do

- **Send Pokémon.** On a Pokémon's sheet, **Send to a friend** moves it to a friend's My Pokémon, or straight onto one of their trainers.
- **Send items.** In a trainer's bag, the send button next to a saved item moves some or all of it to one of a friend's trainers. Reference items stack with ones they already have; custom items arrive as a copy.
- **Join cities.** A city's **Members** list suggests friends who aren't members yet. See [My City](cities.md#sharing-a-city).

Pokémon and items can only be sent to friends.

## API

All endpoints are under `/api` and use the logged-in email.

| Request | Body | Does |
| --- | --- | --- |
| `GET /friends` | | `{ friends, incoming, outgoing }`. Friends include their trainers' ids and names. |
| `POST /friends` | `{ email }` | Sends a request, or accepts theirs if they already asked. 409 if one exists, 429 past 50 pending. |
| `POST /friends/:email/accept` | | Accepts a request sent to you. |
| `DELETE /friends/:email` | | Declines, cancels or unfriends. |
| `POST /pokemon/:id/send` | `{ email, trainerId? }` | Moves the Pokémon to a friend, optionally onto their trainer. 403 if not friends. |
| `POST /trainers/:id/send` | `{ email, trainerId, entryId, quantity }` | Moves items from your trainer's bag to a friend's trainer. Returns your updated trainer. |

Friendships are stored in the `friends` table (migration `0009_friends.sql`): one row per pair, `accepted` 0 while pending.
