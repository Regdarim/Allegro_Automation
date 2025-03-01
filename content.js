// Globalny obiekt do przechowywania referencji do elementów DOM
const claudeDOM = {
  projectContainer: null,
  contentItems: [],
  addContentButton: null,
  projectTitle: null,
};

// Funkcja główna inicjująca obserwację DOM
function initDOMObserver() {
  console.log("[Claude DOM Inspector] Inicjalizacja obserwatora DOM...");

  // Utwórz obserwator mutacji, który będzie monitorować zmiany w DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Sprawdź, czy pojawiły się kluczowe elementy interfejsu
        checkForClaudeElements();
      }
    }
  });

  // Opcje obserwatora - obserwuj całe drzewo DOM
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
  };

  // Rozpocznij obserwację całego dokumentu
  observer.observe(document.body, config);

  // Wykonaj pierwsze sprawdzenie elementów, jeśli DOM jest już załadowany
  checkForClaudeElements();

  // Również uruchom sprawdzenie po pełnym załadowaniu strony
  window.addEventListener("load", () => {
    console.log(
      "[Claude DOM Inspector] Strona w pełni załadowana, sprawdzam elementy Claude..."
    );
    checkForClaudeElements();
  });
}

// Funkcja do identyfikacji kluczowych elementów interfejsu Claude
function checkForClaudeElements() {
  // Wykryj kontener projektu
  const projectContainers = document.querySelectorAll(
    '[class*="project-container"], [class*="project_container"]'
  );
  if (projectContainers.length > 0 && !claudeDOM.projectContainer) {
    claudeDOM.projectContainer = projectContainers[0];
    console.log(
      "[Claude DOM Inspector] Wykryto kontener projektu:",
      claudeDOM.projectContainer
    );
  }

  // Znajdź przycisk "Add Content" (może mieć różne klasy w zależności od wersji Claude)
  const addContentButtons = Array.from(
    document.querySelectorAll("button")
  ).filter(
    (btn) =>
      btn.textContent.includes("Add Content") ||
      btn.textContent.includes("Dodaj zawartość") ||
      btn.getAttribute("aria-label")?.includes("Add Content")
  );

  if (addContentButtons.length > 0 && !claudeDOM.addContentButton) {
    claudeDOM.addContentButton = addContentButtons[0];
    console.log(
      "[Claude DOM Inspector] Wykryto przycisk Add Content:",
      claudeDOM.addContentButton
    );
  }

  // Znajdź tytuł projektu
  const projectTitles = document.querySelectorAll(
    'h1[class*="project-title"], h1[class*="projectTitle"], div[class*="project-name"]'
  );
  if (projectTitles.length > 0 && !claudeDOM.projectTitle) {
    claudeDOM.projectTitle = projectTitles[0];
    console.log(
      "[Claude DOM Inspector] Wykryto tytuł projektu:",
      claudeDOM.projectTitle.textContent
    );
  }

  // Znajdź wszystkie elementy zawartości projektu
  const contentElements = document.querySelectorAll(
    '[class*="content-item"], [class*="contentItem"], [data-testid*="content-item"]'
  );
  if (contentElements.length > 0) {
    claudeDOM.contentItems = Array.from(contentElements);
    console.log(
      "[Claude DOM Inspector] Wykryto elementy zawartości, liczba:",
      claudeDOM.contentItems.length
    );

    // Opcjonalnie: analizuj każdy element zawartości, aby odnaleźć tytuły, edytory, itd.
    claudeDOM.contentItems.forEach((item, index) => {
      const titleElement = item.querySelector(
        '[class*="content-title"], [class*="contentTitle"]'
      );
      const title = titleElement
        ? titleElement.textContent.trim()
        : `Zawartość #${index + 1}`;
      console.log(
        `[Claude DOM Inspector] Element zawartości #${index}: "${title}"`
      );
    });
  }

  // Sprawdź, czy wszystkie kluczowe elementy zostały znalezione
  if (
    claudeDOM.projectContainer &&
    claudeDOM.addContentButton &&
    claudeDOM.projectTitle
  ) {
    console.log(
      "[Claude DOM Inspector] Wszystkie kluczowe elementy Claude zostały znalezione!"
    );

    // Wysyłanie wiadomości do strony popup, że DOM Claude jest gotowy
    chrome.runtime.sendMessage({
      action: "claudeDOMReady",
      projectTitle: claudeDOM.projectTitle.textContent,
      contentCount: claudeDOM.contentItems.length,
    });
  }
}

// Eksportuj dostęp do globalnego obiektu claudeDOM
window.claudeDOM = claudeDOM;

// Startuj obserwator DOM po załadowaniu skryptu
initDOMObserver();

// Nasłuchuj na komunikaty od popupu lub background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getDOMStatus") {
    // Zwróć aktualny stan wykrytych elementów DOM
    sendResponse({
      projectContainer: !!claudeDOM.projectContainer,
      addContentButton: !!claudeDOM.addContentButton,
      contentItemsCount: claudeDOM.contentItems.length,
      projectTitle: claudeDOM.projectTitle
        ? claudeDOM.projectTitle.textContent
        : null,
    });
    return true; // Oznacza, że odpowiedź będzie asynchroniczna
  }

  // Obsługa żądania konkretnej akcji na elementach DOM
  if (message.action === "clickAddContent" && claudeDOM.addContentButton) {
    claudeDOM.addContentButton.click();
    sendResponse({ success: true, message: "Kliknięto przycisk Add Content" });
    return true;
  }

  // Inne żądania związane z manipulacją DOM
  // ...
});

// Pomocnicza funkcja do czekania na pojawienie się elementu
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
  // Funkcja do przeszukiwania Shadow DOM
  function querySelectorAllDeep(selector, root = document) {
    const results = [];

    // Przeszukaj standardowy DOM
    root.querySelectorAll(selector).forEach((element) => results.push(element));

    // Przeszukaj shadow DOM
    root.querySelectorAll("*").forEach((element) => {
      if (element.shadowRoot) {
        querySelectorAllDeep(selector, element.shadowRoot).forEach(
          (shadowElement) => {
            results.push(shadowElement);
          }
        );
      }
    });

    return results;
  }

  // Zmodyfikuj funkcję checkForClaudeElements() aby używała querySelectorAllDeep
  // zamiast standardowego document.querySelectorAll
  // Funkcja do przeszukiwania zawartości iframe
  function queryIframes(selector) {
    let results = [];

    // Standardowe przeszukiwanie bieżącego dokumentu
    document.querySelectorAll(selector).forEach((el) => results.push(el));

    // Przeszukaj wszystkie iframe na stronie
    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.querySelectorAll(selector).forEach((el) => results.push(el));
      } catch (e) {
        // Iframe z innego źródła - brak dostępu z powodu zabezpieczeń same-origin
        console.log("Nie można uzyskać dostępu do iframe:", e);
      }
    });

    return results;
  }
}
