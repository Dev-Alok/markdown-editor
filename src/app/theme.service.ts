import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly DARK_MODE_KEY = 'markdown-editor-dark-mode';

  isDarkMode(): boolean {
    return localStorage.getItem(this.DARK_MODE_KEY) === 'true';
  }

  toggleTheme() {
    const currentMode = this.isDarkMode();
    localStorage.setItem(this.DARK_MODE_KEY, (!currentMode).toString());
  }

  setDarkMode(isDark: boolean) {
    localStorage.setItem(this.DARK_MODE_KEY, isDark.toString());
  }
}