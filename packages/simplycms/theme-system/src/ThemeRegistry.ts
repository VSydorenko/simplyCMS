import type { ThemeModule } from "./types";

type ThemeLoader = () => Promise<{ default: ThemeModule }>;

class ThemeRegistryClass {
  private themes: Map<string, ThemeLoader> = new Map();
  private loadedThemes: Map<string, ThemeModule> = new Map();

  /** Зареєструвати loader для теми */
  register(name: string, loader: ThemeLoader): void {
    this.themes.set(name, loader);
  }

  /** Видалити тему з реєстру */
  unregister(name: string): void {
    this.themes.delete(name);
    this.loadedThemes.delete(name);
  }

  /** Чи зареєстрована тема */
  has(name: string): boolean {
    return this.themes.has(name);
  }

  /** Список зареєстрованих тем */
  getRegisteredThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /** Завантажити тему за назвою (з кешуванням) */
  async load(name: string): Promise<ThemeModule> {
    const cached = this.loadedThemes.get(name);
    if (cached) return cached;

    const loader = this.themes.get(name);
    if (!loader) {
      throw new Error(`Theme "${name}" is not registered`);
    }

    try {
      const themeModule = await loader();
      const theme = themeModule.default;

      this.validateTheme(name, theme);
      this.loadedThemes.set(name, theme);

      return theme;
    } catch (error) {
      console.error(`[ThemeRegistry] Failed to load theme: ${name}`, error);
      throw error;
    }
  }

  /** Валідація структури ThemeModule */
  private validateTheme(name: string, theme: ThemeModule): void {
    if (!theme.manifest) {
      throw new Error(`Theme "${name}" is missing manifest`);
    }
    if (
      !theme.manifest.name ||
      !theme.manifest.displayName ||
      !theme.manifest.version
    ) {
      throw new Error(`Theme "${name}" manifest is incomplete`);
    }
    if (!theme.MainLayout) {
      throw new Error(`Theme "${name}" is missing MainLayout`);
    }
    if (!theme.CatalogLayout) {
      throw new Error(`Theme "${name}" is missing CatalogLayout`);
    }
    if (!theme.ProfileLayout) {
      throw new Error(`Theme "${name}" is missing ProfileLayout`);
    }
    if (!theme.pages) {
      throw new Error(`Theme "${name}" is missing pages`);
    }

    const requiredPages = [
      "HomePage",
      "CatalogPage",
      "ProductPage",
      "CartPage",
      "CheckoutPage",
      "ProfilePage",
      "NotFoundPage",
    ];

    for (const page of requiredPages) {
      if (!theme.pages[page as keyof typeof theme.pages]) {
        throw new Error(
          `Theme "${name}" is missing required page: ${page}`
        );
      }
    }
  }

  /** Очистити кеш завантажених тем */
  clearCache(): void {
    this.loadedThemes.clear();
  }

  /** Отримати завантажену тему з кешу (без завантаження) */
  getCached(name: string): ThemeModule | undefined {
    return this.loadedThemes.get(name);
  }
}

// Singleton
export const ThemeRegistry = new ThemeRegistryClass();
