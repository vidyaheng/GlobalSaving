// log.js
// Local usage log for Global Saving Calculator
// ไม่ใช้ database — เก็บ log ไว้ใน localStorage ของเครื่องนั้น ๆ

(function () {
  "use strict";

  const LOG_KEY = "global_saving_logs";
  const MAX_LOGS = 500;

  function readLogs() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      const logs = raw ? JSON.parse(raw) : [];
      return Array.isArray(logs) ? logs : [];
    } catch (err) {
      console.warn("Cannot read logs:", err);
      return [];
    }
  }

  function saveLogs(logs) {
    try {
      const trimmed = logs.slice(-MAX_LOGS);
      localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn("Cannot save logs:", err);
    }
  }

  function write(action, payload = {}) {
    const logs = readLogs();

    logs.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      payload,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });

    saveLogs(logs);
  }

  function clear() {
    localStorage.removeItem(LOG_KEY);
  }

  function toCsv() {
    const logs = readLogs();

    const headers = [
      "timestamp",
      "action",
      "planId",
      "sumAssured",
      "annualPremiumAfterDiscount",
      "payload"
    ];

    const rows = logs.map((log) => {
      const payload = log.payload || {};

      return [
        log.timestamp || "",
        log.action || "",
        payload.planId || "",
        payload.sumAssured || "",
        payload.annualPremiumAfterDiscount || "",
        JSON.stringify(payload).replace(/"/g, '""')
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    return "\uFEFF" + csv;
  }

  function downloadCsv(filename = "global-saving-log.csv") {
    const csv = toCsv();
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  window.GSLog = {
    write,
    readLogs,
    clear,
    toCsv,
    downloadCsv
  };
})();
