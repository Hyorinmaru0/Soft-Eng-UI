# Soft-Eng-UI

## Run locally

Use Node.js 20.19+ or a supported newer version, then run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, then choose **Billing Information** in the sidebar. In Windows PowerShell, use `npm.cmd` if script execution is restricted.

```sh
npm test
npm run build
npm run preview
```

Both the development server and preview server include the dummy billing API. A static file server alone will not provide the API.

## Billing Information

This implementation follows Chapter 2, Figure 16 (Billing Information Flow), printed page 38 / PDF page 48, and Figure 100 (Billing Information IPO), printed page 73 / PDF page 83, in the supplied research document:

1. Select a student profile and retrieve their existing bills.
2. Review a saved statement without changing it, or choose **Edit billing information** / **New billing record**.
3. Enter session charges and the payment due date.
4. Validate and save the bill; recalculate charges and display the saved statement.

The form contains ten data-entry controls before action buttons, plus the student and saved-record selectors:

| Control | Validation / purpose |
| --- | --- |
| Billing period start | Required date from 2000 through 2100 |
| Billing period end | Required date; on or after the period start |
| Issue date | Required valid date |
| Payment due date | Required date; on or after the issue date |
| Therapy service | Required selection from the existing therapy services |
| Charge description | Required; 3–120 characters |
| Number of sessions | Required integer; 1–1,000 |
| Rate per session | Required; PHP 0.01–100,000, at most two decimal places |
| Billing notes | Optional textarea; at most 1,000 characters |
| Review confirmation | Required checkbox before saving |

Up to 20 session-charge rows can be added. Each line is `sessions × rate`; totals use integer centavos to avoid floating-point rounding errors. Existing payment amounts are read-only and cannot be changed through billing information. Charges cannot be reduced below payments already recorded. Payment recording remains a separate module.

Inputs have explicit labels and helper text. Invalid submissions stay in the form, show field-level errors and a focused error summary, and provide links to the affected controls. Keyboard navigation uses natural document order, with visible focus indicators. Reset restores the saved bill (or the new-bill defaults); cancel returns to the statement without saving. The billing styles reuse the workspace's existing cards, colors, fonts, and responsive navigation.

### Dummy backend

The local Node API is mounted through a Vite plugin in `server/billing-api.js`. It validates incoming data, recalculates totals itself, and stores records in `.data/billing.json`, which is excluded from Git. The file is created on the first successful save. Records survive page refreshes and server restarts. Sample bills are supplied for Jordan Morgan (BT-101) and Avery Taylor (BT-102); Taylor Singh (BT-103) starts without a bill. The included records are fictional.

| Endpoint | Result |
| --- | --- |
| `GET /api/billing?studentId=BT-101` | Student's saved bills, totals, balances, and derived status |
| `POST /api/billing` | Validate and create a billing record |
| `PUT /api/billing/:id` | Validate and update a bill using its current revision |

The API returns field errors with HTTP 422, missing records with 404, and stale edits with 409. Simultaneous saves are serialized, and writes replace the data file atomically. Client-supplied total charges and payment amounts are ignored. API failures retain the form entries for retry.

The app's existing administrator role controls the edit actions. This is a local dummy backend without authentication or a database connection; production integration can replace `src/services/billingApi.js` with the team's Spring Boot API. The existing student-profile workflow continues to use browser local storage.

### Verification

`npm test` checks required fields, date ordering and invalid dates, numeric limits, precise money calculations, bill status, API validation, persisted create/update operations, stale edits, payment preservation, and simultaneous saves.

To check the workflow: select BT-101 and review its bill, edit the session count and due date, attempt an invalid submission, reset the form, then save a valid change. Refresh and select the same student to verify persistence. Select BT-103 to check creating a new bill, adding/removing session charges, and canceling without saving.

## Student Profiles

The Student Profiles workspace adds student lookup by name or ID, full profile viewing, student information editing, daily report management, and behavior-note management. Editing, report, and behavior-note actions are available to the administrator role.

This project does not include a connected database service. The profile workflow uses fictional sample records and browser local storage to support saving and refreshing records on the current device.
