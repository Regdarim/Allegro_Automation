// popup.js
document.addEventListener("DOMContentLoaded", function () {
  // Referencje do elementów UI
  const connectionStatus = document.getElementById("connection-status");
  const projectInfo = document.getElementById("project-info");
  const domStatus = document.getElementById("dom-status");
  const refreshButton = document.getElementById("refresh-dom");
  const testAddContentButton = document.getElementById("test-add-content");

  // Sprawdź status DOM Claude poprzez wysłanie wiadomości do content script
  function checkDOMStatus() {
    connectionStatus.textContent = "Łączenie ze stroną Claude...";
    connectionStatus.className = "status warning";

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (
        !tabs[0] ||
        !tabs[0].url ||
        (!tabs[0].url.includes("anthropic.com") &&
          !tabs[0].url.includes("claude.ai"))
      ) {
        connectionStatus.textContent = "Nie jesteś na stronie Claude!";
        connectionStatus.className = "status error";
        return;
      }

      // Wyślij zapytanie do content script o status DOM
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getDOMStatus" },
        function (response) {
          if (chrome.runtime.lastError) {
            // Obsługa błędu - najpewniej content script nie jest załadowany
            connectionStatus.textContent =
              "Nie udało się połączyć z content script. Odśwież stronę Claude.";
            connectionStatus.className = "status error";
            return;
          }

          // Aktualizuj UI na podstawie odpowiedzi
          connectionStatus.textContent = "Połączono ze stroną Claude!";
          connectionStatus.className = "status success";

          if (response.projectTitle) {
            projectInfo.textContent = `Projekt: "${response.projectTitle}"`;
            projectInfo.className = "status success";
          } else {
            projectInfo.textContent = "Nie wykryto tytułu projektu";
            projectInfo.className = "status warning";
          }

          let domStatusText = "";
          if (response.projectContainer)
            domStatusText += "✓ Kontener projektu wykryty\n";
          else domStatusText += "✗ Kontener projektu nie wykryty\n";

          if (response.addContentButton)
            domStatusText += "✓ Przycisk Add Content wykryty\n";
          else domStatusText += "✗ Przycisk Add Content nie wykryty\n";

          domStatusText += `✓ Liczba elementów zawartości: ${response.contentItemsCount}`;

          domStatus.textContent = domStatusText;
          domStatus.className =
            "status " +
            (response.projectContainer && response.addContentButton
              ? "success"
              : "warning");
        }
      );
    });
  }

  // Obsługa przycisku odświeżania informacji o DOM
  refreshButton.addEventListener("click", checkDOMStatus);

  // Obsługa przycisku testowego kliknięcia Add Content
  testAddContentButton.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "clickAddContent" },
        function (response) {
          if (chrome.runtime.lastError) {
            alert("Błąd: " + chrome.runtime.lastError.message);
            return;
          }

          if (response && response.success) {
            alert("Sukces: " + response.message);
          } else {
            alert("Nie udało się kliknąć przycisku Add Content");
          }
        }
      );
    });
  });

  // Inicjalne sprawdzenie statusu DOM
  checkDOMStatus();
});
