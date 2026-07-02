(() => {
  const canUseServiceWorker = "serviceWorker" in navigator;
  const isLocalFile = window.location.protocol === "file:";

  function createInstallButton() {
    const button = document.createElement("button");
    button.id = "pwa-install-btn";
    button.type = "button";
    button.textContent = "ติดตั้งแอป";
    button.setAttribute("aria-label", "ติดตั้ง Global Saving เป็นแอปบนอุปกรณ์นี้");
    button.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:9999",
      "border:0",
      "border-radius:999px",
      "padding:12px 16px",
      "background:#0f5ea8",
      "color:#ffffff",
      "font:700 14px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "box-shadow:0 12px 30px rgba(15,94,168,.28)",
      "cursor:pointer",
      "display:none"
    ].join(";");
    document.body.appendChild(button);
    return button;
  }

  function showUpdateNotice(registration) {
    const notice = document.createElement("button");
    notice.type = "button";
    notice.textContent = "มีเวอร์ชันใหม่ กดเพื่ออัปเดต";
    notice.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:18px",
      "transform:translateX(-50%)",
      "z-index:10000",
      "border:0",
      "border-radius:999px",
      "padding:12px 18px",
      "background:#0f172a",
      "color:#ffffff",
      "font:700 14px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "box-shadow:0 16px 36px rgba(15,23,42,.24)",
      "cursor:pointer"
    ].join(";");

    notice.addEventListener("click", () => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.location.reload();
    });

    document.body.appendChild(notice);
  }

  let deferredInstallPrompt = null;
  let installButton = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;

    if (!installButton) {
      installButton = createInstallButton();
      installButton.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;

        installButton.style.display = "none";
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice.catch(() => null);
        deferredInstallPrompt = null;
      });
    }

    installButton.style.display = "inline-flex";
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installButton) installButton.style.display = "none";
  });

  if (canUseServiceWorker && !isLocalFile) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          if (registration.waiting) {
            showUpdateNotice(registration);
          }

          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;

            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateNotice(registration);
              }
            });
          });
        })
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    });
  }
})();
