/**
 * GasTracker AI -> Google Sheets logger.
 * Deploy as a Web App (Execute as: Me, Access: Anyone) and paste the /exec URL into
 * the app under Settings > Google Sheets.
 */
var HEADERS = ['id', 'date', 'odometer', 'gallons', 'pricePerGallon', 'totalCost',
               'location', 'latitude', 'longitude', 'weatherTemp', 'isFullTank'];

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

  var data = JSON.parse(e.postData.contents);
  var row = HEADERS.map(function (h) { return data[h] === undefined || data[h] === null ? '' : data[h]; });
  sheet.appendRow(row); // isFullTank is written as TRUE / FALSE

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
