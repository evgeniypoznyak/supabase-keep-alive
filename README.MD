# Supabase Keep-Alive

A simple Node.js script that performs periodic HTTP pings to multiple URLs to keep services alive and prevent timeout/inactivity disconnections.

## Overview

This utility sends GET requests to a list of URLs including web applications and Supabase Edge Functions. It's useful for:

- Preventing applications from entering sleep/idle states
- Keeping serverless function endpoints warm
- Monitoring service health
- Maintaining persistent connections

## Features

✅ Pings multiple URLs simultaneously
✅ Handles errors gracefully with detailed logging
✅ Provides visual feedback with status indicators
✅ Non-blocking async/await implementation

## Installation

1. Clone or download this repository
2. Install dependencies (if any):
   ```bash
   npm install
   ```

## Usage

Run the keep-alive script:

```bash
node index.js
```

The script will:
1. Send HTTP requests to all configured URLs
2. Log success/warning/error statuses for each URL
3. Display detailed status messages and HTTP response codes

## Configuration

Edit the `urls` array in `index.js` to add or remove endpoints:

```javascript
const urls = [
  'https://your-domain.com',
  'https://your-supabase-project.supabase.co/functions/v1/endpoint',
  // Add more URLs here
];
```

## Scheduling

To run this script periodically, use:

### Using cron (Linux/macOS):
```bash
0 */6 * * * cd /path/to/supabase-keep-alive && node index.js
```

### Using a cloud scheduler:
- AWS EventBridge
- Google Cloud Scheduler
- GitHub Actions
- Vercel/Netlify scheduled functions

## Output Example

```
🚀 Starting keep-alive pings...
✅ https://example.com: 200 OK
✅ https://api.example.com: 200 OK
⚠️ https://another-service.com: 503 Service Unavailable
❌ https://offline-service.com failed: Failed to fetch
🏁 Keep-alive pings finished.
```

## License

MIT

