import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly DARK_MODE_KEY = 'markdown-editor-dark-mode';

  public isDarkMode(): boolean {
    const stored = localStorage.getItem(this.DARK_MODE_KEY);
    return stored === null ? true : stored === 'true';
  }

  public toggleTheme(): void {
    const currentMode = this.isDarkMode();
    localStorage.setItem(this.DARK_MODE_KEY, (!currentMode).toString());
  }

  public setDarkMode(isDark: boolean): void {
    localStorage.setItem(this.DARK_MODE_KEY, isDark.toString());
  }
}