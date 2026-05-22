/**
 * ClayStory Studio Pro
 * Storage and Serialization Utilities
 */

import { ProjectHistoryItem } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'claystory_projects_v1',
  THEME: 'claystory_theme_v1',
};

export const storageService = {
  /**
   * Fetches all projects from LocalStorage
   */
  getProjects(): ProjectHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!data) return [];
      const projects: ProjectHistoryItem[] = JSON.parse(data);
      if (!Array.isArray(projects)) return [];
      return projects;
    } catch (e) {
      console.error('Failed to parse projects from storage', e);
      return [];
    }
  },

  /**
   * Saves or updates a project in history
   */
  saveProject(project: ProjectHistoryItem): ProjectHistoryItem[] {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);

    if (index !== -1) {
      projects[index] = { ...project };
    } else {
      projects.unshift(project); // Insert at the beginning of history
    }

    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to write projects to storage', e);
    }
    return projects;
  },

  /**
   * Deletes a project from history
   */
  deleteProject(id: string): ProjectHistoryItem[] {
    const projects = this.getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to write projects to storage', e);
    }
    return filtered;
  },

  /**
   * Clears entire project history
   */
  clearAllProjects(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },

  /**
   * Gets dark mode preference
   */
  getDarkMode(): boolean {
    try {
      const setting = localStorage.getItem(STORAGE_KEYS.THEME);
      return setting === 'dark';
    } catch (e) {
      return false;
    }
  },

  /**
   * Saves dark mode preference
   */
  setDarkMode(isDark: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to set theme setting', e);
    }
  },
};
