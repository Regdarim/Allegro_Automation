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
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) {
          reject(new Error("Nie znaleziono aktywnej karty"));
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
      return new TextDecoder("utf-8").decode(bytes);
    } catch (error) {
      console.error("Błąd dekodowania Base64:", error);
      return "";
    }
  },

  /**
   * Sprawdza, czy plik jest binarny na podstawie rozszerzenia
   * @param {string} filename - Nazwa pliku do sprawdzenia
   * @return {boolean} True jeśli plik jest binarny
   */
  isBinaryFile: (filename) => {
    const binaryExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".ico",
      ".svg",
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".tar",
      ".gz",
      ".rar",
      ".7z",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".mp3",
      ".mp4",
      ".avi",
      ".mov",
      ".wav",
    ];

    const lowerFilename = filename.toLowerCase();
    return binaryExtensions.some((ext) => lowerFilename.endsWith(ext));
  },

  /**
   * Pobiera nazwę pliku bez rozszerzenia
   * @param {string} filename - Pełna nazwa pliku
   * @return {string} Nazwa pliku bez rozszerzenia
   */
  getFilenameWithoutExtension: (filename) => {
    const lastDotPosition = filename.lastIndexOf(".");
    if (lastDotPosition === -1) return filename;
    return filename.substring(0, lastDotPosition);
  },

  /**
   * Wyświetla status w interfejsie użytkownika
   * @param {string} message - Wiadomość do wyświetlenia
   * @param {string} type - Typ wiadomości: 'success', 'error' lub 'loading'
   */
  showStatus: (message, type = "loading") => {
    const statusElement = document.getElementById("status");
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = "block";
  },

  /**
   * Ukrywa okno statusu
   */
  hideStatus: () => {
    const statusElement = document.getElementById("status");
    if (statusElement) {
      statusElement.style.display = "none";
    }
  },

  /**
   * Formatuje datę do standardowego formatu
   * @param {Date} date - Obiekt daty
   * @return {string} Sformatowana data
   */
  formatDate: (date) => {
    return date.toISOString().replace("T", " ").substr(0, 19);
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
  },
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
    this.baseUrl = "https://api.github.com";
    this.headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
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
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `GitHub API Error (${response.status}): ${
          errorData.message || response.statusText
        }`
      );
    }

    return response.json();
  }

  /**
   * Pobiera listę repozytoriów użytkownika
   * @return {Promise<Array>} Promise rozwiązywany listą repozytoriów
   */
  async getRepositories() {
    const repos = await this.fetchAPI("/user/repos?sort=updated&per_page=100");
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description || "",
      url: repo.html_url,
      defaultBranch: repo.default_branch,
    }));
  }

  /**
   * Pobiera listę gałęzi dla repozytorium
   * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
   * @return {Promise<Array>} Promise rozwiązywany listą gałęzi
   */
  async getBranches(repo) {
    const branches = await this.fetchAPI(`/repos/${repo}/branches`);
    return branches.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
    }));
  }

  /**
   * Pobiera zawartość folderu w repozytorium
   * @param {string} repo - Pełna nazwa repozytorium (właściciel/nazwa)
   * @param {string} path - Ścieżka do folderu w repozytorium
   * @param {string} branch - Nazwa gałęzi
   * @return {Promise<Array>} Promise rozwiązywany listą plików i folderów
   */
  async getContent(repo, path = "", branch = "main") {
    const query = path ? `?ref=${branch}` : `?ref=${branch}`;
    const endpoint = `/repos/${repo}/contents/${path}${query}`;

    try {
      const content = await this.fetchAPI(endpoint);

      // Jeśli to pojedynczy plik, zamień go na tablicę
      if (!Array.isArray(content)) {
        return [content];
      }

      return content.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type, // "file" lub "dir"
        size: item.size,
        url: item.html_url,
        downloadUrl: item.download_url,
        contentUrl: item.url,
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
  async getAllFiles(repo, path = "", branch = "main") {
    const items = await this.getContent(repo, path, branch);
    let files = [];

    for (const item of items) {
      if (item.type === "file") {
        files.push(item);
      } else if (item.type === "dir") {
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
  async getFileContent(repo, path, branch = "main") {
    const endpoint = `/repos/${repo}/contents/${path}?ref=${branch}`;
    const file = await this.fetchAPI(endpoint);

    if (file.encoding === "base64" && file.content) {
      const content = Utils.decodeBase64(file.content);
      return {
        name: file.name,
        path: file.path,
        content: content,
        size: file.size,
        type: "file",
        url: file.html_url,
      };
    } else {
      throw new Error(
        `Nieobsługiwany format pliku lub brak zawartości: ${path}`
      );
    }
  }
}
