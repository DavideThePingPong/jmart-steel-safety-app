# Security notes — JMart Steel Safety App

Living document of the security posture for forms, photos, attachments, and
the inference pipeline. Last reviewed 2026-05-06.

## Data classification

| Data type | Where | Sensitivity |
|---|---|---|
| Form metadata + answers | Firebase RTDB `/jmart-safety/forms/{id}` | Low–medium (site addresses, builder names, supervisor names, hazard descriptions) |
| Signatures | Firebase RTDB `/jmart-safety/formAssets/{id}/signatures` (base64 PNG) | Medium (PII — captures handwriting) |
| Form-completion photos | Google Drive `JMart Steel/02_Projects/<Job>/Photos/<YYYY-MM-DD>/` | Low–high depending on subject (people, sites, machinery, bystanders) |
| Receipt scans | Google Drive `Steel/Hanna/_processed/...` + RTDB `/jmart-safety/hanna/receipts/<key>` | Medium (vendor + ABN + amounts) |
| Audit log | Firebase RTDB `/jmart-safety/auditLog/{id}` | Low (device IDs + timestamps + action names) |
| Device auth records | Firebase RTDB `/jmart-safety/authDevices/{uid}` | Low (UIDs, no email) |
| Prestart RAG knowledge base | Cloud Function bundle `functions/data/prestart_knowledge.json` | **Medium — check before regenerating** (see below) |

## Where confidential PDFs leak to third parties

The `frankAttachmentExtract`, `victorAnalyzeSds`, and `hannaScanReceipt` Cloud
Functions accept multipart PDF uploads up to 15 MB. The OCR/extraction routes
the bytes through one of two providers:

1. **OpenRouter (primary, Qwen3-VL 32B)** — receipts and most attachments.
   Cost: ~$0.10/M tokens. Data sent: the raw PDF as a base64 data-URI in the
   chat-completions request. OpenRouter's terms apply — they may retain prompt
   data for abuse review unless you disable logging in your OpenRouter account
   settings.
2. **Anthropic (fallback only on OpenRouter 402/insufficient-credit, Claude
   Sonnet 4.6)** — receipts and SDS PDFs. Cost: ~$3/M tokens. Data sent: the
   raw PDF base64 in the message body. Anthropic's data-handling terms apply
   (they retain inputs for ~30 days for abuse review by default; zero
   retention is available on the Anthropic API but requires opting in).

**Implication:** if a customer or supplier provides a PDF marked NDA / Confidential
/ Commercial-in-Confidence, processing it through these endpoints constitutes a
controlled disclosure to OpenRouter and (in the fallback case) Anthropic.

**What we do today** — accept the disclosure risk. Most PDFs are routine
receipts, SDS files, and SWMS attachments where the disclosure is non-issue.

**What you'd do for a sensitive customer** — three options:
1. Skip the in-app extract; give Davide the PDF directly and have him transcribe
   the relevant fields manually into the form.
2. Get the customer to redact NDA-flagged sections before upload.
3. Toggle on Anthropic's [zero-retention API](https://docs.anthropic.com/en/api/zero-retention)
   for the project's Anthropic key. This eliminates the 30-day retention but
   not the in-flight processing exposure.

## Receipt OCR trust boundary

Hanna's `_inbox` is reachable from any device that has the JM Artsteel Drive
shared. The runner doesn't validate provenance — anything dropped in `_inbox`
goes straight to the OCR pipeline + RTDB. Don't drop random PDFs there. The
2026-05-06 test surfaced one such file (`handrail`, an unrelated handrail spec
PDF that was correctly rejected by the Cloud Function as `Unsupported receipt
type` — but it would have been processed if it had any receipt-like content).

## Authentication chains

- **PWA users:** App password (shared) → device fingerprint → admin-approval flow
  → Firebase anonymous auth UID logged to `authDevices`.
- **Cloud Functions:** all 7 require `x-firebase-token` header, verified against
  `authDevices/<uid>.approvedAt`.
- **Hanna Mac runner:** registers itself as `hanna-runner-mac` in `authDevices/`
  on first run, mints fresh Firebase ID token via Identity Toolkit
  `signInWithCustomToken` per scan.
- **Service account (`jmart-drive-access@…`):** scoped to specific Drive folders
  + Firebase Realtime Database. Key is at `~/.secrets/jmart-openclaw/credentials.json`
  on Sofia's Mac mini (mode 600).

## Known not-yet-mitigated concerns

- **No daily/per-user budget caps** on Cloud Functions. A buggy client looping
  on `frankSearchRegulations` could ring up Anthropic charges. Set budget alerts
  in OpenRouter + Anthropic consoles.
- **PDF stack-trace verbosity** — `console.error` paths in `functions/index.js`
  log truncated request bodies. Cloud Logs are visible to any project member
  with the `logging.viewer` role. Limit that role to people who should see the
  contents of PDFs going through the functions.
- **`prestart_knowledge.json` 6-record retrieval** — the function returns up to
  6 nearest-neighbour past prestarts to the client. If those records contain
  identifying details (employee names, site addresses), they leak in the
  `sources[]` array. Currently the records are sanitized to task descriptions
  + categorical fields only; if you regenerate the KB from a different source
  format, double-check the export pipeline strips PII before embedding.
