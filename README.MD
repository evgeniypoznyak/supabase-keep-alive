# Supabase Keep-Alive

A daily ping across every service that must not fall asleep. A free Supabase
project is paused after seven days without activity, and a paused project is a
dead product until somebody notices.

Runs from GitHub Actions once a day, and from a laptop with `node index.js`.

## Two kinds of check

| Kind | What it does | What it proves |
|---|---|---|
| `http` | a plain `GET` | DNS, the Supabase gateway and whatever answers behind it are all up |
| `pg` | a direct Postgres connection and `select 1` | the database is reachable even when the gateway is not |

The second one is not redundant. On 2026-09-10 every path on the FaxGo project
answered `402 Payment Required` because the organisation had gone over its
egress quota. The gateway rejects the request, the database never hears about
it, and an http-only keep-alive would have let the project pause while
reporting a problem nobody was reading. The direct connection still went
through.

Supabase watches the database, not the gateway, so an http target only counts
against the pause timer if whatever answers it reads the database. The
`/health` and `/keep-alive` functions do. The plain sites are on the list to
stay warm, which is a different job.

## Adding a target

HTTP targets are the `HTTP_TARGETS` array in `index.js`:

```javascript
const HTTP_TARGETS = [
  'https://your-project.supabase.co/functions/v1/health',
];
```

Postgres targets are `PG_TARGETS`, and carry the name of an environment
variable rather than a connection string, so no credential ever lands in this
repository:

```javascript
const PG_TARGETS = [
  { name: 'FaxGo', env: 'FAXGO_DB_URL' },
];
```

Set the matching GitHub Actions secret (Settings, Secrets and variables,
Actions) and pass it through in `.github/workflows/check-websites-health.yml`.
The connection string is the pooler one from the Supabase dashboard, Connect,
Session pooler:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

A password with punctuation in it has to be percent-encoded.

A missing variable is skipped with a note on a laptop and is a failure in CI,
because a check that quietly stops running is worse than no check.

## Failure is the alert

The script exits non-zero if any target fails, which turns the scheduled run
red, which is what makes GitHub mail the owner. Before that it only printed and
exited clean, so FaxGo sat restricted until Supabase sent a pause warning.

When a target fails the first 200 characters of the response body are printed
with it. On Supabase that body is the difference between the project's own
answer and the gateway refusing to pass the request on:

```
{"ok":true,"service":"faxgo","database":"up"}                    <- the function answered
{"message":"Service for this project is restricted due to ..."}  <- the gateway did
```

## The trap worth knowing

**GitHub disables scheduled workflows in a repository that has seen no commits
for 60 days.** It emails first. If that mail is missed, the cron stops, and
every project on this list starts its own seven day countdown with nobody
watching. A manual run from the Actions tab re-enables it.

## Output

```
🚀 Starting keep-alive pings...
✅ https://prompt.softery.io: 200 OK
✅ https://gdfuyaubwqvmdqdlwajv.supabase.co/functions/v1/health: 200 OK
❌ https://mkvyjuxgzgchcwsvtlhk.supabase.co/functions/v1/health: 402 Payment Required | {"message":"Service for this project is restricted ..."}
✅ FaxGo postgres: reachable

🔥 1 of 8 targets failed:
   https://mkvyjuxgzgchcwsvtlhk.supabase.co/functions/v1/health: 402 Payment Required | ...
```

## License

MIT
