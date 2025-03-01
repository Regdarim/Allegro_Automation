// claude.js
/**
 * @fileoverview Moduł do manipulacji DOM interfejsu Claude
 * @author GitHub Claude Synchronizer Team
 * @version 1.0.0
 */

/**
 * Klasa do interakcji z interfejsem Claude
 */
class ClaudeInterface {
  constructor() {
    // Selektory dla różnych elementów interfejsu Claude
    this.selectors = {
      // Selektory dla różnych sekcji projektu
      projectTabs: ".project-tabs", // Zakładki projektu
      contentTab: ".content-tab", // Zakładka zawartości

      // Selektory dla listy zawartości
      contentList: ".content-list", // Lista zawartości
      contentItem: ".content-item", // Element zawartości
      contentTitle: ".content-item-title", // Tytuł elementu zawartości

      // Selektory dla przycisków i akcji
      addButton: '[data-testid="add-content-button"]', // Przycisk dodawania zawartości
      editButton: ".edit-button", // Przycisk edycji
      deleteButton: ".delete-button", // Przycisk usuwania
      saveButton: '[data-testid="save-button"]', // Przycisk zapisywania
      cancelButton: '[data-testid="cancel-button"]', // Przycisk anulowania

      // Selektory dla formularzy
      contentForm: ".content-form", // Formularz zawartości
      titleInput: '[data-testid="title-input"]', // Pole tytułu
      contentInput: '[data-testid="content-textarea"]', // Pole zawartości

      // Selektory dla modali
      modal: ".modal", // Modal
      modalOverlay: ".modal-overlay", // Overlay modalu
      modalClose: ".modal-close", // Przycisk zamknięcia modalu
    };

    // Maksymalny czas oczekiwania na elementy DOM (ms)
    this.maxWaitTime = 10000;
  }

  /**
   * Czeka na pojawienie się elementu DOM
   * @param {string} selector - Selektor CSS elementu
   * @param {number} timeout - Maksymalny czas oczekiwania w ms
   * @return {Promise<Element>} Promise rozwiązywany elementem DOM
   */
  waitForElement(selector, timeout = this.maxWaitTime) {
    return new Promise((resolve, reject) => {
      // Sprawdź, czy element już istnieje
      const element = document.querySelector(selector);
      if (element) {
        return resolve(element);
      }

      // Ustaw timeout do odrzucenia Promise
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(
          new Error(
            `Timeout: Element ${selector} nie pojawił się w ciągu ${timeout}ms`
          )
        );
      }, timeout);

      // Ustaw MutationObserver do wykrycia elementu
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          obs.disconnect();
          resolve(element);
        }
      });

      // Obserwuj zmiany w całym dokumencie
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  /**
   * Przełącza projekt na zakładkę "Content" (Zawartość)
   * @return {Promise<boolean>} Promise rozwiązywany powodzeniem operacji
   */
  async switchToContentTab() {
    try {
      const contentTab = await this.waitForElement(this.selectors.contentTab);
      contentTab.click();
      return true;
    } catch (error) {
      console.error("Nie udało się przełączyć na zakładkę Content:", error);
      throw new Error(
        "Nie udało się przełączyć na zakładkę Content. Upewnij się, że znajdujesz się na stronie projektu Claude."
      );
    }
  }

  /**
   * Pobiera listę tytułów istniejącej zawartości
   * @return {Promise<Array<{title: string, element: Element}>>} Promise rozwiązywany obiektami z tytułami i elementami
   */
  async getExistingContentTitles() {
    try {
      // Przełącz na zakładkę Content jeśli potrzeba
      await this.switchToContentTab();

      // Poczekaj na pojawienie się listy zawartości
      await this.waitForElement(this.selectors.contentList);

      // Pobierz wszystkie elementy zawartości
      const contentItems = document.querySelectorAll(
        this.selectors.contentItem
      );

      // Mapuj elementy na obiekty z tytułami
      return Array.from(contentItems).map((item) => {
        const titleElement = item.querySelector(this.selectors.contentTitle);
        return {
          title: titleElement ? titleElement.textContent.trim() : "",
          element: item,
        };
      });
    } catch (error) {
      console.error("Błąd podczas pobierania istniejących tytułów:", error);
      throw new Error(
        "Nie udało się pobrać istniejącej zawartości. Upewnij się, że znajdujesz się na stronie projektu Claude."
      );
    }
  }

  /**
   * Dodaje nową zawartość do projektu
   * @param {string} title - Tytuł zawartości
   * @param {string} content - Treść zawartości
   * @return {Promise<boolean>} Promise rozwiązywany powodzeniem operacji
   */
  async addNewContent(title, content) {
    try {
      // Przełącz na zakładkę Content jeśli potrzeba
      await this.switchToContentTab();

      // Kliknij przycisk "Add Content"
      const addButton = await this.waitForElement(this.selectors.addButton);
      addButton.click();

      // Poczekaj na pojawienie się formularza
      const titleInput = await this.waitForElement(this.selectors.titleInput);
      const contentInput = await this.waitForElement(
        this.selectors.contentInput
      );

      // Wypełnij formularz
      titleInput.value = title;

      // Zasymuluj zdarzenie wprowadzania tekstu dla textarea
      const inputEvent = new Event("input", { bubbles: true });
      contentInput.value = content;
      contentInput.dispatchEvent(inputEvent);

      // Poczekaj na przycisk zapisz i kliknij go
      const saveButton = await this.waitForElement(this.selectors.saveButton);
      saveButton.click();

      // Poczekaj na zamknięcie formularza
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error("Błąd podczas dodawania nowej zawartości:", error);
      throw new Error(
        `Nie udało się dodać zawartości "${title}": ${error.message}`
      );
    }
  }

  /**
   * Aktualizuje istniejącą zawartość
   * @param {Element} contentElement - Element DOM zawartości do aktualizacji
   * @param {string} content - Nowa treść zawartości
   * @return {Promise<boolean>} Promise rozwiązywany powodzeniem operacji
   */
  async updateExistingContent(contentElement, content) {
    try {
      // Znajdź przycisk edycji dla tego elementu zawartości
      const editButton = contentElement.querySelector(
        this.selectors.editButton
      );
      if (!editButton) {
        throw new Error("Nie znaleziono przycisku edycji");
      }

      // Kliknij przycisk edycji
      editButton.click();

      // Poczekaj na pojawienie się formularza edycji
      const contentInput = await this.waitForElement(
        this.selectors.contentInput
      );

      // Aktualizuj treść
      const inputEvent = new Event("input", { bubbles: true });
      contentInput.value = content;
      contentInput.dispatchEvent(inputEvent);

      // Poczekaj na przycisk zapisz i kliknij go
      const saveButton = await this.waitForElement(this.selectors.saveButton);
      saveButton.click();

      // Poczekaj na zamknięcie formularza
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error("Błąd podczas aktualizacji zawartości:", error);
      throw new Error(
        `Nie udało się zaktualizować zawartości: ${error.message}`
      );
    }
  }

  /**
   * Sprawdza, czy strona jest projektem Claude
   * @return {boolean} True jeśli strona to projekt Claude
   */
  // Bardziej niezawodne selektory do wykrycia strony projektu
  isProjectPage() {
    // Sprawdź URL
    const isProjectUrl = window.location.href.includes("/project/");

    // Sprawdź obecność charakterystycznych elementów DOM
    const hasProjectTitle =
      document.querySelector(".font-copernicus.text-text-200") !== null;
    const hasAddContentButton = Array.from(
      document.querySelectorAll("button")
    ).some((btn) => btn.textContent.includes("Add Content"));
    const hasProjectKnowledge = Array.from(
      document.querySelectorAll("h2")
    ).some((h2) => h2.textContent.includes("Project knowledge"));

    console.log("URL check:", isProjectUrl);
    console.log("Project title check:", hasProjectTitle);
    console.log("Add Content button check:", hasAddContentButton);
    console.log("Project knowledge check:", hasProjectKnowledge);

    return (
      isProjectUrl &&
      (hasProjectTitle || hasAddContentButton || hasProjectKnowledge)
    );
  }

  // Funkcja do znajdowania przycisku "Add Content"
  findAddContentButton() {
    // Metoda 1: Szukaj po tekście
    const buttons = Array.from(document.querySelectorAll("button"));
    const addContentBtn = buttons.find((btn) =>
      btn.textContent.includes("Add Content")
    );

    // Metoda 2: Szukaj po klasach i atrybutach
    if (!addContentBtn) {
      return document.querySelector(
        'button[class*="text-accent-secondary-100"]'
      );
    }

    return addContentBtn;
  }

  // Funkcja do znajdowania listy plików
  findFilesList() {
    // Szukaj listy plików po strukturze
    const lists = document.querySelectorAll("ul");
    for (const list of lists) {
      // Sprawdź, czy lista zawiera elementy li z miniaturami plików
      if (list.querySelector('li [data-testid*="file-thumbnail"]')) {
        return list;
      }
    }
    return null;
  }
}
