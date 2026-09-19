/**
 * Saarthi AI — Corporate Google Sheets Ingestion Middleware (Apps Script)
 * =====================================================================
 * Automates un-throttled batch extraction of job listings from 14-tab sheets
 * and posts validated JSON batches to production Render backend.
 *
 * Config Target: https://saarthilink.onrender.com/api/jobs/ingest
 */

// Configuration constants
var CONFIG = {
  WEBHOOK_URL: "https://saarthilink.onrender.com/api/jobs/ingest",
  INGEST_TOKEN: "saarthi-ingest-secure-token-2026",
  STAGING_TAB_NAME: "09_JOBS_STAGING",
  BATCH_SIZE: 50
};

/**
 * Main Trigger Function — Invoked manually or via Hourly Time-Driven Trigger.
 */
function syncJobsToSaarthiBackend() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.STAGING_TAB_NAME);
  
  if (!sheet) {
    Logger.log("ERROR: Sheet tab '" + CONFIG.STAGING_TAB_NAME + "' not found.");
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log("INFO: No staged jobs to process.");
    return;
  }
  
  var headers = data[0];
  var rows = data.slice(1);
  var validJobsBatch = [];
  
  // Find column indices
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    colMap[String(headers[c]).toLowerCase().trim()] = c;
  }
  
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var company = String(row[colMap["company"] || 0] || "").trim();
    var title = String(row[colMap["title"] || 1] || "").trim();
    var location = String(row[colMap["location"] || 2] || "Remote").trim();
    var description = String(row[colMap["description"] || 3] || "").trim();
    var jobType = String(row[colMap["job_type"] || 4] || "Full-time").trim();
    var applyUrl = String(row[colMap["apply_url"] || 5] || "").trim();
    var expRaw = String(row[colMap["experience_required"] || 6] || "0-1").trim();
    
    // Validate mandatory fields
    if (!company || !title) {
      continue;
    }
    
    // Normalize experience string into rigid Enum: '0-1', '1-2', '2-3', '3-5', '5-8', '8+'
    var expEnum = normalizeExperienceEnum(expRaw);
    
    validJobsBatch.push({
      company: company,
      title: title,
      location: location || "Remote",
      description: description,
      job_type: jobType || "Full-time",
      employment_type: "On-site",
      apply_url: applyUrl && applyUrl.indexOf("http") === 0 ? applyUrl : null,
      experience_required: expEnum,
      skills: ["General Tech"]
    });
    
    // Send in batches
    if (validJobsBatch.length >= CONFIG.BATCH_SIZE) {
      sendBatchToBackend(validJobsBatch);
      validJobsBatch = [];
    }
  }
  
  // Flush remaining items
  if (validJobsBatch.length > 0) {
    sendBatchToBackend(validJobsBatch);
  }
  
  Logger.log("SUCCESS: Completed synchronization of staged job records.");
}

/**
 * Normalizes freeform experience text into rigid backend Enum format.
 */
function normalizeExperienceEnum(raw) {
  var str = String(raw).toLowerCase().trim();
  if (str.indexOf("8+") !== -1 || str.indexOf("8-") !== -1 || str.indexOf("senior") !== -1) return "8+";
  if (str.indexOf("5-8") !== -1 || str.indexOf("5+") !== -1) return "5-8";
  if (str.indexOf("3-5") !== -1 || str.indexOf("3+") !== -1) return "3-5";
  if (str.indexOf("2-3") !== -1) return "2-3";
  if (str.indexOf("1-2") !== -1) return "1-2";
  return "0-1"; // Default entry-level
}

/**
 * Sends a validated JSON batch to Saarthi FastAPI backend via UrlFetchApp.
 * Injects compulsory "X-Saarthi-Ingest-Token" header.
 */
function sendBatchToBackend(jobsArray) {
  var payload = {
    source: "GoogleSheets_AppsScript",
    jobs: jobsArray
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-Saarthi-Ingest-Token": CONFIG.INGEST_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    var code = response.getResponseCode();
    var content = response.getContentText();
    
    if (code === 200 || code === 201) {
      Logger.log("HTTP " + code + ": Batch of " + jobsArray.length + " jobs successfully ingested.");
    } else {
      Logger.log("ERROR HTTP " + code + ": " + content.substring(0, 200));
    }
  } catch (err) {
    Logger.log("CRITICAL UrlFetchApp Error: " + err.toString());
  }
}
