# Safety App Runbook

## Canonical Production URL

- Use `https://jmart-steel-safety.web.app`
- GitHub Pages is retired and should not be used for production access.

## Before Deploying

1. Run `npm run lint`
2. Run `npm test -- tests/unit/components/auth.test.js tests/unit/services/deviceAuth.test.js tests/unit/services/deviceAuthManager.test.js tests/unit/services/firebaseSyncRuntime.test.js tests/integration/syncIntegrity.test.js --runInBand`
3. Run `npm run build`

## Deploy

1. Run `firebase deploy --only "database,hosting" --project jmart-steel-safety`
2. Confirm the app is reachable at `https://jmart-steel-safety.web.app`
3. Confirm GitHub Pages is still disabled if anyone reports the old URL working again

## Smoke Test After Deploy

1. Open the app on the Firebase URL
2. Log in with a known approved device
3. Create or edit a test form
4. Confirm the change appears on a second approved device
5. Delete the test form and confirm it disappears after sync

## Admin Recovery

If no admin device can approve new devices:

1. Get the waiting device ID from the login screen
2. Run `npm run recover:admin -- --device-id=<DEVICE_ID>`
3. Reload the app on that device

## Forms Migration

If old form records need metadata repair:

1. Dry run: `npm run migrate:forms`
2. Write migration: `npm run migrate:forms:write`

## Backups

- Forms are saved locally in browser storage under `jmart-safety-forms`, but the durable source of truth is Firebase Realtime Database.
- Live form records are stored in `jmart-safety/forms`.
- Large per-form signatures and other bulky assets are stored in `jmart-safety/formAssets`.
- Shared reusable signatures are stored in `/signatures`.
- Site and job context lives in `jmart-safety/sites` and `jmart-safety/jobs`.
- Manual backup now runs with `npm run backup:drive` or `C:\Users\david\Desktop\JM Artsteel\Davidex\JM\RUN-SAFETY-BACKUP.ps1`.
- The Windows scheduled task `JMart Safety App Bi-Monthly Backup` runs on the first day of January, March, May, July, September, and November at 9:00 AM local time.
- Local archives are written to `C:\Users\david\Desktop\JM Artsteel\backups\safety-app`.
- Drive copies are written to `G:\My Drive\JMart Steel\Safety App Backups` and then synced by Google Drive for Desktop.
- If `G:` is unavailable, the archive still exists locally and can be copied manually from `C:\Users\david\Desktop\JM Artsteel\backups\safety-app`.

## If Sync Looks Broken

1. Make sure the user is on `https://jmart-steel-safety.web.app`
2. Check that the device is approved in Firebase under `jmart-safety/devices/approved`
3. Check that the same auth UID has a record under `jmart-safety/authDevices`
4. Check whether the form exists under `jmart-safety/forms`
5. Check whether signatures for that form exist under `jmart-safety/formAssets`
6. Re-test after a hard refresh

## Important Rules

- Do not use GitHub Pages as a second production host
- Do not paste tokens into chat or store them in git remotes
- Do not re-enable automatic browser-based admin recovery
- Keep Firebase rules and hosting deploys together for production changes
