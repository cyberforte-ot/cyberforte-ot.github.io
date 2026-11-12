// CyberForte article review: receives "Send my changes" from the drafts page
// and adds one row per edit, comment, title choice or status to this Sheet.
// Bound to the Google Sheet "CyberForte article review responses".
// Each drafts batch gets its own tab, named by batch_label (for example "Week of 11 Nov").
// The Done column is left empty, for marking changes once they are applied.

var HEADERS = ['Received at', 'Article', 'Block id', 'Type', 'Original', 'New or comment', 'Done'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_(data.batch_label);
    var rows = buildRows_(data);
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }
    return json_({ok: true, rows: rows.length});
  } catch (err) {
    return json_({ok: false, error: String(err)});
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ok: true, message: 'CyberForte article review endpoint is running.'});
}

function buildRows_(d) {
  var now = new Date();
  var article = clean_(d.article_number + '. ' + (d.article_name || d.article_id));
  var slug = clean_(d.article_id);
  var rows = [];
  if (d.title_choice) {
    rows.push([now, article, slug + '-title', 'title', '', clean_(d.title_choice.choice + ': ' + d.title_choice.text), '']);
  }
  if (d.status) {
    rows.push([now, article, slug + '-status', 'status', '', clean_(d.status), '']);
  }
  (d.edits || []).forEach(function (x) {
    rows.push([now, article, clean_(x.block_id), 'edit', clean_(x.original), clean_(x['new']), '']);
  });
  (d.comments || []).forEach(function (x) {
    rows.push([now, article, clean_(x.block_id), 'comment', clean_(x.block_text_excerpt), clean_(x.comment), '']);
  });
  return rows;
}

function getSheet_(label) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = tabName_(label);
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

// Safe tab name: no characters Sheets rejects, short, with a fallback.
function tabName_(label) {
  var s = String(label === undefined || label === null ? '' : label).replace(/[\[\]*?\/\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return s || 'Unsorted';
}

// Plain text only, capped in length, and never run as a formula.
function clean_(v) {
  var s = String(v === undefined || v === null ? '' : v).slice(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
