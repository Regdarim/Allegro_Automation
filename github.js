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
