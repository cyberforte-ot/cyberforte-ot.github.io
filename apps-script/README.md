# Article review receiver (Google Apps Script)

Receives "Send my changes" from docs/drafts/articles-week-11-nov/ and adds one row per
edit, comment, title choice or status to the Google Sheet "CyberForte article review responses".

Each drafts page sends a batch label (for example "Week of 11 Nov", set in `window.CF_REVIEW.batchLabel`
in that page's index.html). Rows go into a tab with that name; the tab is created with a bold, frozen
header row if it does not exist yet.

Columns: Received at, Article, Block id, Type (edit, comment, title, status), Original, New or comment, Done.
Done is left empty, for marking a change once it has been applied to the article.

For a new week's drafts page, copy review.css and review.js and set `batch` and `batchLabel` in its config.

## Setup (already done once, in aryansubhash20@gmail.com)

1. Create a Google Sheet named "CyberForte article review responses".
2. In the Sheet: Extensions, then Apps Script. Paste Code.gs and save.
3. Deploy, then New deployment, type Web app. Execute as: Me. Who has access: Anyone. Deploy.
4. Approve the authorisation screen (your own script, so "Google hasn't verified this app" is expected).
5. Copy the web app URL (ends in /exec) into `window.CF_REVIEW.endpoint` in
   docs/drafts/articles-week-11-nov/index.html.

## Versions

- Version 1 (12 Nov 2026): one tab, six columns.
- Version 2 (12 Nov 2026): one tab per batch label, plus the Done column.

## Changing the code later

Edit Code.gs in the Apps Script editor, then Deploy, Manage deployments, edit the existing
deployment and pick "New version". This keeps the same URL, so the page does not need changing.

Do not share the Sheet. "Anyone" access is only to the web app endpoint, which can add rows
but cannot read the Sheet.
