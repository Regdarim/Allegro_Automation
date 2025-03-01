// manifest.json
{
    "name": "GitHub Claude Synchronizer",
    "description": "Synchronizacja plików między GitHub a projektami Claude",
    "version": "1.0",
    "manifest_version": 3,
    "permissions": ["storage", "activeTab", "scripting"],
    "host_permissions": ["https://github.com/*", "https://*.anthropic.com/*"],
    "action": {
      "default_popup": "popup.html",
      "default_icon": {
        "16": "icons/icon16.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    },
    "content_scripts": [
      {
        "matches": ["https://*.anthropic.com/claude/*"],
        "js": ["utils.js", "github.js", "claude.js", "content.js"]
      }
    ],
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
  
  // popup.html
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>GitHub Claude Synchronizer</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        width: 340px;
        padding: 15px;
        color: #333;
      }
      h2 {
        color: #0366d6;
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 18px;
        font-weight: 600;
      }
      .settings-group {
        margin-bottom: 15px;
        padding: 10px;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        background-color: #f6f8fa;
      }
      .settings-group h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 600;
        color: #24292e;
      }
      label {
        display: block;
        margin-bottom: 5px;
        font-size: 13px;
        font-weight: 500;
      }
      input, select {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #d1d5da;
        border-radius: 3px;
        box-sizing: border-box;
        font-size: 13px;
      }
      .token-input {
        position: relative;
      }
      .token-input button {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #586069;
      }
      button {
        display: block;
        width: 100%;
        padding: 8px 10px;
        background-color: #2ea44f;
        color: white;
        border: none;
        border-radius: 3px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      button:hover {
        background-color: #2c974b;
      }
      button:disabled {
        background-color: #94d3a2;
        cursor: not-allowed;
      }
      .status {
        margin-top: 15px;
        padding: 10px;
        border-radius: 3px;
        font-size: 13px;
        line-height: 1.4;
        max-height: 100px;
        overflow-y: auto;
      }
      .status.success {
        background-color: #f0fff4;
        border: 1px solid #dcffe4;
        color: #22863a;
      }
      .status.error {
        background-color: #ffeef0;
        border: 1px solid #ffdce0;
        color: #cb2431;
      }
      .status.loading {
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
        color: #586069;
      }
      .checkbox-container {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
      }
      .checkbox-container input {
        width: auto;
        margin-right: 8px;
        margin-bottom: 0;
      }
      .version {
        font-size: 10px;
        color: #6a737d;
        text-align: right;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <h2>GitHub Claude Synchronizer</h2>
    
    <div class="settings-group">
      <h3>Konfiguracja GitHub</h3>
      <label for="github-token">Token GitHub:</label>
      <div class="token-input">
        <input type="password" id="github-token" placeholder="ghp_...">
        <button id="toggle-token" type="button">👁️</button>
      </div>
      
      <label for="repo">Repozytorium:</label>
      <select id="repo"></select>
      
      <div id="repo-loading" style="display: none;">Ładowanie repozytoriów...</div>
      
      <label for="branch">Gałąź:</label>
      <select id="branch">
        <option value="main">main</option>
        <option value="master">master</option>
      </select>
      
      <label for="path">Ścieżka w repozytorium (opcjonalnie):</label>
      <input type="text" id="path" placeholder="np. docs/">
    </div>
    
    <div class="settings-group">
      <h3>Opcje synchronizacji</h3>
      <div class="checkbox-container">
        <input type="checkbox" id="update-existing" checked>
        <label for="update-existing">Aktualizuj istniejącą zawartość</label>
      </div>
      <div class="checkbox-container">
        <input type="checkbox" id="add-new" checked>
        <label for="add-new">Dodaj nową zawartość</label>
      </div>
      <div class="checkbox-container">
        <input type="checkbox" id="skip-binary">
        <label for="skip-binary">Pomiń pliki binarne (obrazy, PDF, itp.)</label>
      </div>
    </div>
    
    <button id="sync-btn">Synchronizuj z projektem Claude</button>
    
    <div id="status" class="status" style="display: none;"></div>
    
    <div class="version">v1.0.0</div>
  
    <script src="utils.js"></script>
    <script src="github.js"></script>
    <script src="popup.js"></script>
  </body>
  </html>
  
  // utils.js
  /**
   * @fileoverview Zbiór funkcji narzędziowych dla rozszerzenia GitHub Claude Synchronizer.
   * @author GitHub Claude Synchronizer Team
   * @version 1.0.0
   */
  
  /**
   * Moduł zawierający funkcje pomocnicze
   * @namespace Utils
   */
  const Utils = {
    /**
     * Zapisuje dane w lokalnym magazynie przeglądarki
     * @param {Object} data - Obiekt z danymi do zapisania
     * @return {Promise} Promise rozwiązywany po zapisaniu danych
     */
    saveToStorage: (data) => {
      return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
      });
    },
  
    /**
     * Pobiera dane z lokalnego magazynu przeglądarki
     * @param {Array|string} keys - Klucze danych do pobrania
     * @return {Promise<Object>} Promise rozwiązywany obiektem z danymi
     */
    getFromStorage: (keys) => {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    },
  
    /**
     * Wysyła wiadomość do aktywnej karty
     * @param {Object} message - Treść wiadomości
     * @return {Promise<any>} Promise rozwiązywany odpowiedzią z karty
     */
    sendMessageToActiveTab: (message) => {
      return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (!tabs || !tabs[0]) {
            reject(new Error('Nie znaleziono aktywnej karty'));
            return;
          }
          
          chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
            const error = chrome.runtime.lastError;
            if (error) {
              reject(new Error(error.message));
            } else {
              resolve(response);
            }
          });
        });
      });
    },
  
    /**
     * Dekoduje zawartość Base64 z obsługą kodowania UTF-8
     * @param {string} base64 - Ciąg zakodowany w Base64
     * @return {string} Odkodowany tekst
     */
    decodeBase64: (base64) => {
      try {
        // Użyj wbudowanych funkcji przeglądarki do dekodowania Base64 z obsługą UTF-8
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
      } catch (error) {
        console.error('Błąd dekodowania Base64:', error);
        return '';
      }
    },
  
    /**
     * Sprawdza, czy plik jest binarny na podstawie rozszerzenia
     * @param {string} filename - Nazwa pliku do sprawdzenia
     * @return {boolean} True jeśli plik jest binarny
     */
    isBinaryFile: (filename) => {
      const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.tar', '.gz', '.rar', '.7z',
        '.exe', '.dll', '.so', '.dylib',
        '.mp3', '.mp4', '.avi', '.mov', '.wav'
      ];
      
      const lowerFilename = filename.toLowerCase();
      return binaryExtensions.some(ext => lowerFilename.endsWith(ext));
    },
  
    /**
     * Pobiera nazwę pliku bez rozszerzenia
     * @param {string} filename - Pełna nazwa pliku
     * @return {string} Nazwa pliku bez rozszerzenia
     */
    getFilenameWithoutExtension: (filename) => {
      const lastDotPosition = filename.lastIndexOf('.');
      if (lastDotPosition === -1) return filename;
      return filename.substring(0, lastDotPosition);
    },
  
    /**
     * Wyświetla status w interfejsie użytkownika
     * @param {string} message - Wiadomość do wyświetlenia
     * @param {string} type - Typ wiadomości: 'success', 'error' lub 'loading'
     */
    showStatus: (message, type = 'loading') => {
      const statusElement = document.getElementById('status');
      if (!statusElement) return;
      
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      statusElement.style.display = 'block';
    },
  
    /**
     * Ukrywa okno statusu
     */
    hideStatus: () => {
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.style.display = 'none';
      }
    },
  
    /**
     * Formatuje datę do standardowego formatu
     * @param {Date} date - Obiekt daty
     * @return {string} Sformatowana data
     */
    formatDate: (date) => {
      return date.toISOString().replace('T', ' ').substr(0, 19);
    },
  
    /**
     * Limituje liczbę równoczesnych wywołań funkcji asynchronicznej
     * @param {Array} items - Tablica elementów do przetworzenia
     * @param {Function} asyncFn - Funkcja asynchroniczna do wywołania dla każdego elementu
     * @param {number} concurrency - Maksymalna liczba równoczesnych wywołań
     * @return {Promise<Array>} Promise rozwiązywany wynikami wszystkich wywołań
     */
    asyncPool: async (items, asyncFn, concurrency = 5) => {
      const results = [];
      const executing = new Set();
      
      for (const item of items) {
        const p = Promise.resolve().then(() => asyncFn(item));
        results.push(p);
        executing.add(p);
        
        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);
        
        if (executing.size >= concurrency) {
          await Promise.race(executing);
        }
      }
      
      return Promise.all(results);
    }
  };
  
  // github.js
  /**
   * @fileoverview Moduł do komunikacji z GitHub API
   * @author GitHub Claude Synchronizer Team
   * @version 1.0.0
   */
  
  /**
   * Klasa do obsługi API GitHub
   */
  class GitHubAPI {
    /**
     * Tworzy nową instancję GitHubAPI
     * @param {string} token - Token dostępu GitHub
     */
    constructor(token) {
      this.token = token;
      this.baseUrl = 'https://api.github.com';
      this.headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      };
    }
  
    /**
     * Wykonuje żądanie HTTP do API GitHub
     * @param {string} endpoint - Endpoint API
     * @param {Object} options - Opcje żądania fetch
     * @return {Promise<Object>} Promise rozwiązywany odpowiedzią API
     */
    async fetchAPI(endpoint, options = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: this.headers,
        ...options
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API Error (${response.status}): ${errorData.message || response.statusText}`);
      }
  
      return response.json();
    }
  
    /**
     * Pobiera listę repozytoriów użytkownika
     * @return {Promise<Array>} Promise rozwiązywany listą repozytoriów
     */
    async getRepositories() {
      const repos = await this.fetchAPI('/user/repos?sort=updated&per_page=100');
      return repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        description: repo.description || '',
        url: repo.html_url,
        defaultBranch: repo.default_branch
      }));
    }
  
    /**
     * Pobiera listę gałęzi dla repozytorium
     * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
     * @return {Promise<Array>} Promise rozwiązywany listą gałęzi
     */
    async getBranches(repo) {
      const branches = await this.fetchAPI(`/repos/${repo}/branches`);
      return branches.map(branch => ({
        name: branch.name,
        protected: branch.protected
      }));
    }
  
    /**
     * Pobiera zawartość folderu w repozytorium
     * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
     * @param {string} path - Ścieżka do folderu w repozytorium
     * @param {string} branch - Nazwa gałęzi
     * @return {Promise<Array>} Promise rozwiązywany listą plików i folderów
     */
    async getContent(repo, path = '', branch = 'main') {
      const query = path ? `?ref=${branch}` : `?ref=${branch}`;
      const endpoint = `/repos/${repo}/contents/${path}${query}`;
      
      try {
        const content = await this.fetchAPI(endpoint);
        
        // Jeśli to pojedynczy plik, zamień go na tablicę
        if (!Array.isArray(content)) {
          return [content];
        }
        
        return content.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type, // "file" lub "dir"
          size: item.size,
          url: item.html_url,
          downloadUrl: item.download_url,
          contentUrl: item.url
        }));
      } catch (error) {
        console.error(`Błąd pobierania zawartości z ${endpoint}:`, error);
        throw error;
      }
    }
  
    /**
     * Rekurencyjnie pobiera wszystkie pliki z folderu i jego podfolderów
     * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
     * @param {string} path - Ścieżka do folderu w repozytorium
     * @param {string} branch - Nazwa gałęzi
     * @return {Promise<Array>} Promise rozwiązywany listą plików
     */
    async getAllFiles(repo, path = '', branch = 'main') {
      const items = await this.getContent(repo, path, branch);
      let files = [];
  
      for (const item of items) {
        if (item.type === 'file') {
          files.push(item);
        } else if (item.type === 'dir') {
          const subFiles = await this.getAllFiles(repo, item.path, branch);
          files = files.concat(subFiles);
        }
      }
  
      return files;
    }
  
    /**
     * Pobiera zawartość pliku z repozytorium
     * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
     * @param {string} path - Ścieżka do pliku w repozytorium
     * @param {string} branch - Nazwa gałęzi
     * @return {Promise<Object>} Promise rozwiązywany obiektem z zawartością pliku
     */
    async getFileContent(repo, path, branch = 'main') {
      const endpoint = `/repos/${repo}/contents/${path}?ref=${branch}`;
      const file = await this.fetchAPI(endpoint);
      
      if (file.encoding === 'base64' && file.content) {
        const content = Utils.decodeBase64(file.content);
        return {
          name: file.name,
          path: file.path,
          content: content,
          size: file.size,
          type: 'file',
          url: file.html_url
        };
      } else {
        throw new Error(`Nieobsługiwany format pliku lub brak zawartości: ${path}`);
      }
    }
  }
  
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
        projectTabs: '.project-tabs',  // Zakładki projektu
        contentTab: '.content-tab',    // Zakładka zawartości
        
        // Selektory dla listy zawartości
        contentList: '.content-list',            // Lista zawartości
        contentItem: '.content-item',            // Element zawartości
        contentTitle: '.content-item-title',     // Tytuł elementu zawartości
        
        // Selektory dla przycisków i akcji
        addButton: '[data-testid="add-content-button"]',  // Przycisk dodawania zawartości
        editButton: '.edit-button',                      // Przycisk edycji
        deleteButton: '.delete-button',                  // Przycisk usuwania
        saveButton: '[data-testid="save-button"]',       // Przycisk zapisywania
        cancelButton: '[data-testid="cancel-button"]',   // Przycisk anulowania
        
        // Selektory dla formularzy
        contentForm: '.content-form',            // Formularz zawartości
        titleInput: '[data-testid="title-input"]',    // Pole tytułu
        contentInput: '[data-testid="content-textarea"]', // Pole zawartości
        
        // Selektory dla modali
        modal: '.modal',                  // Modal
        modalOverlay: '.modal-overlay',   // Overlay modalu
        modalClose: '.modal-close',       // Przycisk zamknięcia modalu
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
          reject(new Error(`Timeout: Element ${selector} nie pojawił się w ciągu ${timeout}ms`));
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
          subtree: true
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
        console.error('Nie udało się przełączyć na zakładkę Content:', error);
        throw new Error('Nie udało się przełączyć na zakładkę Content. Upewnij się, że znajdujesz się na stronie projektu Claude.');
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
        const contentItems = document.querySelectorAll(this.selectors.contentItem);
        
        // Mapuj elementy na obiekty z tytułami
        return Array.from(contentItems).map(item => {
          const titleElement = item.querySelector(this.selectors.contentTitle);
          return {
            title: titleElement ? titleElement.textContent.trim() : '',
            element: item
          };
        });
      } catch (error) {
        console.error('Błąd podczas pobierania istniejących tytułów:', error);
        throw new Error('Nie udało się pobrać istniejącej zawartości. Upewnij się, że znajdujesz się na stronie projektu Claude.');
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
        const contentInput = await this.waitForElement(this.selectors.contentInput);
        
        // Wypełnij formularz
        titleInput.value = title;
        
        // Zasymuluj zdarzenie wprowadzania tekstu dla textarea
        const inputEvent = new Event('input', { bubbles: true });
        contentInput.value = content;
        contentInput.dispatchEvent(inputEvent);
        
        // Poczekaj na przycisk zapisz i kliknij go
        const saveButton = await this.waitForElement(this.selectors.saveButton);
        saveButton.click();
        
        // Poczekaj na zamknięcie formularza
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
      } catch (error) {
        console.error('Błąd podczas dodawania nowej zawartości:', error);
        throw new Error(`Nie udało się dodać zawartości "${title}": ${error.message}`);
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
        const editButton = contentElement.querySelector(this.selectors.editButton);
        if (!editButton) {
          throw new Error('Nie znaleziono przycisku edycji');
        }
        
        // Kliknij przycisk edycji
        editButton.click();
        
        // Poczekaj na pojawienie się formularza edycji
        const contentInput = await this.waitForElement(this.selectors.contentInput);
        
        // Aktualizuj treść
        const inputEvent = new Event('input', { bubbles: true });
        contentInput.value = content;
        contentInput.dispatchEvent(inputEvent);
        
        // Poczekaj na przycisk zapisz i kliknij go
        const saveButton = await this.waitForElement(this.selectors.saveButton);
        saveButton.click();
        
        // Poczekaj na zamknięcie formularza
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
      } catch (error) {
        console.error('Błąd podczas aktualizacji zawartości:', error);
        throw new Error(`Nie udało się zaktualizować zawartości: ${error.message}`);
      }
    }
  
    /**
     * Sprawdza, czy strona jest projektem Claude
     * @return {boolean} True jeśli strona to projekt Claude
     */
    isClaudeProjectPage() {
      // Sprawdź URL
      if (!window.location.href.includes('anthropic.com/claude')) {
        return false;
      }
      
      // Sprawdź obecność charakterystycznych elementów projektu
      return Boolean(
        document.querySelector(this.selectors.projectTabs) ||
        document.querySelector(this.selectors.addButton)
      );
    }
  }
  
  // content.js
  /**
   * @fileoverview Skrypt wykonywany na stronie Claude
   * @author GitHub Claude Synchronizer Team
   * @version 1.0.0
   */
  
  // Inicjalizuj interfejs Claude
  const claudeInterface = new ClaudeInterface();
  
  // Nasłuchuj wiadomości z popup.js
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Sprawdź, czy strona to projekt Claude
    if (!claudeInterface.isClaudeProjectPage()) {
      sendResponse({
        success: false,
        message: 'Ta strona nie jest projektem Claude. Otwórz projekt Claude i spróbuj ponownie.'
      });
      return true;
    }
    
    // Obsłuż żądanie synchronizacji
    if (request.action === 'syncFiles') {
      syncFilesWithClaude(request)
        .then(result => {
          sendResponse({
            success: true,
            ...result
          });
        })
        .catch(error => {
          console.error('Błąd synchronizacji:', error);
          sendResponse({
            success: false,
            message: `Błąd synchronizacji: ${error.message}`
          });
        });
      
      return true; // Informuje Chrome, że odpowiedź zostanie wysłana asynchronicznie
    }
    
    // Obsłuż żądanie sprawdzenia strony
    if (request.action === 'checkPage') {
      sendResponse({
        success: true,
        isClaudeProject: claudeInterface.isClaudeProjectPage()
      });
      return true;
    }
  });
  
  /**
   * Główna funkcja synchronizacji plików z GitHub do Claude
   * @param {Object} options - Opcje synchronizacji
   * @return {Promise<Object>} Promise rozwiązywany wynikiem synchronizacji
   */
  async function syncFilesWithClaude(options) {
    const {
      token,
      repo,
      branch = 'main',
      path = '',
      updateExisting = true,
      addNew = true,
      skipBinary = true
    } = options;
    
    // Inicjalizuj API GitHub
    const github = new GitHubAPI(token);
    
    // Sprawdź, czy mamy wszystkie potrzebne dane
    if (!token || !repo) {
      throw new Error('Brak wymaganych danych: token lub repozytorium');
    }
    
    try {
      // Pobierz pliki z GitHub
      console.log(`Pobieranie plików z ${repo} (gałąź: ${branch}, ścieżka: ${path || 'root'})`);
      const files = await github.getAllFiles(repo, path, branch);
      console.log(`Znaleziono ${files.length} plików`);
      
      // Filtruj pliki binarne jeśli trzeba
      const filteredFiles = skipBinary 
        ? files.filter(file => !Utils.isBinaryFile(file.name))
        : files;
      
      console.log(`Po filtrowaniu pozostało ${filteredFiles.length} plików do przetworzenia`);
      
      if (filteredFiles.length === 0) {
        return {
          message: 'Nie znaleziono pasujących plików do synchronizacji.',
          updated: 0,
          added: 0,
          skipped: 0,
          total: 0
        };
      }
      
      // Pobierz istniejące tytuły zawartości w Claude
      const existingContent = await claudeInterface.getExistingContentTitles();
      console.log(`Znaleziono ${existingContent.length} istniejących elementów zawartości w Claude`);
      
      // Przygotuj zmapowanie tytułów do elementów DOM
      const titleToElement = new Map();
      existingContent.forEach(item => {
        titleToElement.set(item.title, item.element);
        // Dodaj również mapowanie bez rozszerzenia pliku
        const titleWithoutExt = Utils.getFilenameWithoutExtension(item.title);
        if (titleWithoutExt !== item.title) {
          titleToElement.set(titleWithoutExt, item.element);
        }
      });
      
      // Przetwarzaj pliki
      let updated = 0, added = 0, skipped = 0;
      
      // Przetwarzaj pliki sekwencyjnie aby uniknąć konfliktów z interfejsem
      for (const file of filteredFiles) {
        try {
          // Pobierz pełną zawartość pliku
          const fileData = await github.getFileContent(repo, file.path, branch);
          const fileName = file.name;
          const fileNameWithoutExt = Utils.getFilenameWithoutExtension(fileName);
          
          // Sprawdź, czy tytuł istnieje (z rozszerzeniem lub bez)
          const existingElement = titleToElement.get(fileName) || titleToElement.get(fileNameWithoutExt);
          
          if (existingElement && updateExisting) {
            // Aktualizuj istniejącą zawartość
            await claudeInterface.updateExistingContent(existingElement, fileData.content);
            console.log(`✅ Zaktualizowano: ${fileName}`);
            updated++;
          } else if (!existingElement && addNew) {
            // Dodaj nową zawartość
            await claudeInterface.addNewContent(fileName, fileData.content);
            console.log(`✅ Dodano: ${fileName}`);
            added++;
          } else {
            console.log(`⏩ Pominięto: ${fileName}`);
            skipped++;
          }
        } catch (error) {
          console.error(`❌ Błąd przetwarzania pliku ${file.name}:`, error);
          skipped++;
        }
      }
      
      // Zwróć podsumowanie
      return {
        message: `Zakończono synchronizację. Zaktualizowano: ${updated}, Dodano: ${added}, Pominięto: ${skipped} plików.`,
        updated,
        added,
        skipped,
        total: filteredFiles.length
      };
    } catch (error) {
      console.error('Błąd podczas synchronizacji:', error);
      throw error;
    }
  }
  
  // popup.js
  /**
   * @fileoverview Skrypt dla interfejsu popup rozszerzenia
   * @author GitHub Claude Synchronizer Team
   * @version 1.0.0
   */
  
  document.addEventListener('DOMContentLoaded', async function() {
    // Elementy DOM
    const tokenInput = document.getElementById('github-token');
    const toggleTokenBtn = document.getElementById('toggle-token');
    const repoSelect = document.getElementById('repo');
    const branchSelect = document.getElementById('branch');
    const pathInput = document.getElementById('path');
    const updateExistingCheck = document.getElementById('update-existing');
    const addNewCheck = document.getElementById('add-new');
    const skipBinaryCheck = document.getElementById('skip-binary');
    const syncBtn = document.getElementById('sync-btn');
    const statusElement = document.getElementById('status');
    const repoLoadingElement = document.getElementById('repo-loading');
    
    // Załaduj zapisane ustawienia
    const settings = await Utils.getFromStorage([
      'githubToken',
      'selectedRepo',
      'selectedBranch',
      'path',
      'updateExisting',
      'addNew',
      'skipBinary'
    ]);
    
    // Wypełnij formularz zapisanymi wartościami
    if (settings.githubToken) tokenInput.value = settings.githubToken;
    if (settings.path) pathInput.value = settings.path;
    if (settings.selectedBranch) {
      // Dodaj opcję i wybierz ją
      const option = new Option(settings.selectedBranch, settings.selectedBranch, true, true);
      branchSelect.appendChild(option);
    }
    
    // Ustaw checkboxy
    updateExistingCheck.checked = settings.updateExisting !== false;
    addNewCheck.checked = settings.addNew !== false;
    skipBinaryCheck.checked = settings.skipBinary !== false;
    
    // Jeśli token istnieje, pobierz listę repozytoriów
    if (settings.githubToken) {
      fetchRepositories(settings.githubToken, settings.selectedRepo);
    }
    
    // Obsługa przełączania widoczności tokenu
    toggleTokenBtn.addEventListener('click', function() {
      const isPassword = tokenInput.type === 'password';
      tokenInput.type = isPassword ? 'text' : 'password';
      toggleTokenBtn.textContent = isPassword ? '🙈' : '👁️';
    });
    
    // Nasłuchuj zmiany tokenu
    tokenInput.addEventListener('change', function() {
      const token = this.value.trim();
      Utils.saveToStorage({githubToken: token});
      
      if (token) {
        fetchRepositories(token);
      } else {
        // Wyczyść select, jeśli token jest pusty
        repoSelect.innerHTML = '';
      }
    });
    
    // Nasłuchuj zmiany repozytorium
    repoSelect.addEventListener('change', function() {
      const selectedRepo = this.value;
      Utils.saveToStorage({selectedRepo});
      
      // Pobierz gałęzie dla wybranego repozytorium
      if (selectedRepo && tokenInput.value) {
        fetchBranches(tokenInput.value, selectedRepo);
      }
    });
    
    // Nasłuchuj zmiany gałęzi
    branchSelect.addEventListener('change', function() {
      Utils.saveToStorage({selectedBranch: this.value});
    });
    
    // Nasłuchuj zmiany ścieżki
    pathInput.addEventListener('input', function() {
      Utils.saveToStorage({path: this.value.trim()});
    });
    
    // Nasłuchuj zmian checkboxów
    updateExistingCheck.addEventListener('change', function() {
      Utils.saveToStorage({updateExisting: this.checked});
    });
    
    addNewCheck.addEventListener('change', function() {
      Utils.saveToStorage({addNew: this.checked});
    });
    
    skipBinaryCheck.addEventListener('change', function() {
      Utils.saveToStorage({skipBinary: this.checked});
    });
    
    // Obsługa przycisku synchronizacji
    syncBtn.addEventListener('click', async function() {
      const token = tokenInput.value.trim();
      const repo = repoSelect.value;
      const branch = branchSelect.value;
      const path = pathInput.value.trim();
      const updateExisting = updateExistingCheck.checked;
      const addNew = addNewCheck.checked;
      const skipBinary = skipBinaryCheck.checked;
      
      if (!token) {
        Utils.showStatus('Wprowadź token GitHub', 'error');
        return;
      }
      
      if (!repo) {
        Utils.showStatus('Wybierz repozytorium', 'error');
        return;
      }
      
      // Wyłącz przycisk i pokaż status ładowania
      syncBtn.disabled = true;
      Utils.showStatus('Rozpoczynanie synchronizacji...', 'loading');
      
      try {
        // Najpierw sprawdź, czy aktywna karta to projekt Claude
        const checkResponse = await Utils.sendMessageToActiveTab({action: 'checkPage'});
        
        if (!checkResponse.success || !checkResponse.isClaudeProject) {
          Utils.showStatus('Ta strona nie jest projektem Claude. Otwórz projekt Claude i spróbuj ponownie.', 'error');
          syncBtn.disabled = false;
          return;
        }
        
        // Wyślij wiadomość do aktywnej karty z prośbą o synchronizację
        const response = await Utils.sendMessageToActiveTab({
          action: 'syncFiles',
          token,
          repo,
          branch,
          path,
          updateExisting,
          addNew,
          skipBinary
        });
        
        // Pokaż wynik
        if (response.success) {
          Utils.showStatus(response.message, 'success');
        } else {
          Utils.showStatus(response.message, 'error');
        }
      } catch (error) {
        console.error('Błąd podczas synchronizacji:', error);
        Utils.showStatus(`Błąd: ${error.message}`, 'error');
      } finally {
        // Włącz przycisk
        syncBtn.disabled = false;
      }
    });
    
    /**
     * Pobiera listę repozytoriów dla aktualnego tokenu
     * @param {string} token - Token GitHub
     * @param {string} selectedRepo - Aktualnie wybrane repozytorium
     */
    async function fetchRepositories(token, selectedRepo = null) {
      try {
        repoSelect.innerHTML = '';
        repoLoadingElement.style.display = 'block';
        
        const github = new GitHubAPI(token);
        const repos = await github.getRepositories();
        
        repoLoadingElement.style.display = 'none';
        
        // Dodaj pustą opcję na początku
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Wybierz repozytorium...';
        repoSelect.appendChild(emptyOption);
        
        // Dodaj repozytorium do selecta
        repos.forEach(repo => {
          const option = document.createElement('option');
          option.value = repo.fullName;
          option.textContent = repo.fullName;
          
          // Jeśli to wcześniej wybrane repozytorium, zaznacz je
          if (selectedRepo === repo.fullName) {
            option.selected = true;
            // Pobierz również gałęzie dla tego repozytorium
            fetchBranches(token, repo.fullName, repo.defaultBranch);
          }
          
          repoSelect.appendChild(option);
        });
        
        // Jeśli nie ma repozytoriów, pokaż komunikat
        if (repos.length === 0) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'Brak dostępnych repozytoriów';
          repoSelect.appendChild(option);
        }
      } catch (error) {
        console.error('Błąd podczas pobierania repozytoriów:', error);
        repoLoadingElement.style.display = 'none';
        Utils.showStatus(`Błąd pobierania repozytoriów: ${error.message}`, 'error');
        
        // Dodaj opcję błędu
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Błąd pobierania repozytoriów';
        repoSelect.appendChild(option);
      }
    }
    
    /**
     * Pobiera gałęzie dla wybranego repozytorium
     * @param {string} token - Token GitHub
     * @param {string} repo - Nazwa repozytorium
     * @param {string} defaultBranch - Domyślna gałąź repozytorium
     */
    async function fetchBranches(token, repo, defaultBranch = null) {
      try {
        branchSelect.innerHTML = '';
        
        const github = new GitHubAPI(token);
        const branches = await github.getBranches(repo);
        
        // Sortuj gałęzie: domyślna pierwsza, potem alfabetycznie
        branches.sort((a, b) => {
          if (a.name === defaultBranch) return -1;
          if (b.name === defaultBranch) return 1;
          return a.name.localeCompare(b.name);
        });
        
        // Dodaj gałęzie do selecta
        branches.forEach(branch => {
          const option = document.createElement('option');
          option.value = branch.name;
          option.textContent = branch.name;
          
          // Jeśli to domyślna gałąź, zaznacz ją
          if (branch.name === defaultBranch) {
            option.selected = true;
          }
          
          branchSelect.appendChild(option);
        });
        
        // Zapisz wybraną gałąź
        if (branches.length > 0) {
          const selectedBranch = branchSelect.value;
          Utils.saveToStorage({selectedBranch});
        }
      } catch (error) {
        console.error('Błąd podczas pobierania gałęzi:', error);
        
        // Dodaj domyślne gałęzie jako zapasowe
        const defaultBranches = ['main', 'master'];
        defaultBranches.forEach(branch => {
          const option = document.createElement('option');
          option.value = branch;
          option.textContent = branch;
          branchSelect.appendChild(option);
        });
      }
    }
    
    // Sprawdź, czy aktywna karta to projekt Claude
    try {
      const response = await Utils.sendMessageToActiveTab({action: 'checkPage'});
      if (!response || !response.success || !response.isClaudeProject) {
        Utils.showStatus('Otwórz projekt Claude w aktywnej karcie, aby użyć rozszerzenia.', 'error');
        syncBtn.disabled = true;
      }
    } catch (error) {
      Utils.showStatus('Nie można sprawdzić aktywnej karty. Upewnij się, że jesteś na stronie projektu Claude.', 'error');
      syncBtn.disabled = true;
    }
  });