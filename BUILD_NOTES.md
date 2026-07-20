# Warehouse scanner update

This update adds:

- Phone camera QR and barcode scanning using `@zxing/browser`.
- Manual asset-code entry as a fallback.
- Wrong-equipment validation based on the asset category planned on the job.
- Automatic same-category substitution. For example, scanning FRY-002 when FRY-001 was planned updates the job asset row to FRY-002 and records the substitution in its notes.
- Duplicate, unavailable and already-out asset checks.
- Live required-versus-loaded progress grouped by category.
- Dispatch locking until every planned job asset is loaded.
- Correct damaged-return asset status (`In Repair`) to match the current database constraint.

## Test flow

1. Create or open a job and allocate two assets from the same category, such as two fryers.
2. Open Warehouse and select that job.
3. Scan one planned fryer.
4. Scan a different available fryer in the same category and confirm the exact asset list changes to the scanned code.
5. Scan an item from an unrequired category and confirm it is rejected.
6. Confirm Dispatch remains disabled until all planned categories are complete.
7. Dispatch the job, switch to Return in, scan the assets back, and test both Good and Damaged conditions.
