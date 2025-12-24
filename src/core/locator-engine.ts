/**
 * Locator Engine - Core locator generation logic for LocatorLabs MCP
 *
 * @author Naveen AutomationLabs
 * @license MIT
 * @date 2025
 * @see https://github.com/naveenanimation20/locatorlabs-mcp
 */

import { Page, Locator } from "playwright";
import { BrowserManager } from "./browser.js";

interface ElementInfo {
  tagName: string;
  id?: string;
  name?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  text?: string;
  ariaLabel?: string;
  role?: string;
  testId?: string;
  href?: string;
  title?: string;
  value?: string;
  xpath: string;
  selector: string;
}

interface LocatorResult {
  type: string;
  locator: string;
  reliability: number;
  description: string;
}

interface PageElement {
  element: string;
  type: string;
  locators: LocatorResult[];
  recommended: string;
}

interface ValidationResult {
  isValid: boolean;
  matchCount: number;
  isUnique: boolean;
  suggestions: string[];
}

export class LocatorEngine {
  constructor(private browserManager: BrowserManager) {}

  async getLocators(url: string, elementDescription: string): Promise<{
    element: string;
    locators: LocatorResult[];
    recommended: string;
  }> {
    const page = await this.browserManager.navigateTo(url);
    const elements = await this.findMatchingElements(page, elementDescription);

    if (elements.length === 0) {
      return {
        element: elementDescription,
        locators: [],
        recommended: "No matching elements found",
      };
    }

    const element = elements[0];
    const locators = this.generateLocators(element);
    const ranked = this.rankLocators(locators);

    return {
      element: elementDescription,
      locators: ranked,
      recommended: ranked[0]?.locator || "No locator found",
    };
  }

  async analyzePage(url: string, elementTypes?: string[]): Promise<{
    url: string;
    totalElements: number;
    elements: PageElement[];
  }> {
    const page = await this.browserManager.navigateTo(url);
    const allElements = await this.getAllInteractiveElements(page);

    let filtered = allElements;
    if (elementTypes && elementTypes.length > 0) {
      filtered = allElements.filter((el) =>
        elementTypes.some((t) => el.tagName.toLowerCase().includes(t) || el.type?.includes(t))
      );
    }

    const results: PageElement[] = filtered.map((el) => {
      const locators = this.generateLocators(el);
      const ranked = this.rankLocators(locators);
      return {
        element: this.describeElement(el),
        type: el.tagName.toLowerCase(),
        locators: ranked.slice(0, 3),
        recommended: ranked[0]?.locator || "N/A",
      };
    });

    return {
      url,
      totalElements: results.length,
      elements: results,
    };
  }

  async generatePageObject(url: string, className: string, language: string): Promise<string> {
    const page = await this.browserManager.navigateTo(url);
    const elements = await this.getAllInteractiveElements(page);

    const pageElements = elements.map((el) => {
      const locators = this.generateLocators(el);
      const ranked = this.rankLocators(locators);
      return {
        name: this.generatePropertyName(el),
        locator: ranked[0]?.locator || `locator('${el.selector}')`,
        element: el,
      };
    });

    switch (language) {
      case "python":
        return this.generatePythonPOM(className, pageElements, url);
      case "javascript":
        return this.generateJavaScriptPOM(className, pageElements, url);
      default:
        return this.generateTypeScriptPOM(className, pageElements, url);
    }
  }

  async validateLocator(url: string, locatorStr: string): Promise<ValidationResult> {
    const page = await this.browserManager.navigateTo(url);

    try {
      const locator = this.parseLocatorString(page, locatorStr);
      const count = await locator.count();

      const suggestions: string[] = [];
      if (count === 0) {
        suggestions.push("Element not found. Check if the page has loaded completely.");
        suggestions.push("Verify the locator syntax is correct.");
      } else if (count > 1) {
        suggestions.push(`Found ${count} elements. Consider adding more specificity.`);
        suggestions.push("Try using getByRole with name option for uniqueness.");
      }

      return {
        isValid: count > 0,
        matchCount: count,
        isUnique: count === 1,
        suggestions,
      };
    } catch (e) {
      return {
        isValid: false,
        matchCount: 0,
        isUnique: false,
        suggestions: [`Invalid locator syntax: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  }

  private async findMatchingElements(page: Page, description: string): Promise<ElementInfo[]> {
    const keywords = description.toLowerCase().split(/\s+/);
    const allElements = await this.getAllInteractiveElements(page);

    return allElements.filter((el) => {
      const searchText = [
        el.id, el.name, el.className, el.text, el.placeholder,
        el.ariaLabel, el.type, el.title, el.tagName
      ].filter(Boolean).join(" ").toLowerCase();

      return keywords.some((kw) => searchText.includes(kw));
    });
  }

  private async getAllInteractiveElements(page: Page): Promise<ElementInfo[]> {
    return await page.evaluate(() => {
      const interactiveSelectors = [
        "button", "a", "input", "select", "textarea",
        "[role='button']", "[role='link']", "[role='textbox']",
        "[role='checkbox']", "[role='radio']", "[role='combobox']",
        "[onclick]", "[tabindex]"
      ];

      const elements: ElementInfo[] = [];
      const seen = new Set<Element>();

      interactiveSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const htmlEl = el as HTMLElement;
          const inputEl = el as HTMLInputElement;

          elements.push({
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            name: inputEl.name || undefined,
            className: el.className || undefined,
            type: inputEl.type || undefined,
            placeholder: inputEl.placeholder || undefined,
            text: htmlEl.innerText?.trim().substring(0, 50) || undefined,
            ariaLabel: el.getAttribute("aria-label") || undefined,
            role: el.getAttribute("role") || undefined,
            testId: el.getAttribute("data-testid") || el.getAttribute("data-test-id") || undefined,
            href: (el as HTMLAnchorElement).href || undefined,
            title: el.getAttribute("title") || undefined,
            value: inputEl.value || undefined,
            xpath: getXPath(el),
            selector: getUniqueSelector(el),
          });
        });
      });

      function getXPath(el: Element): string {
        if (el.id) return `//*[@id="${el.id}"]`;
        const parts: string[] = [];
        let current: Element | null = el;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sibling = current.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === current.tagName) index++;
            sibling = sibling.previousElementSibling;
          }
          parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
          current = current.parentElement;
        }
        return "/" + parts.join("/");
      }

      function getUniqueSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList).slice(0, 2).join(".");
        return classes ? `${tag}.${classes}` : tag;
      }

      return elements;
    });
  }

  private generateLocators(el: ElementInfo): LocatorResult[] {
    const locators: LocatorResult[] = [];

    // Role-based (highest priority for Playwright)
    if (el.role || this.inferRole(el)) {
      const role = el.role || this.inferRole(el);
      const name = el.text || el.ariaLabel || el.title;
      if (name) {
        locators.push({
          type: "role",
          locator: `getByRole('${role}', { name: '${this.escape(name)}' })`,
          reliability: 95,
          description: "Playwright recommended - accessible and stable",
        });
      }
    }

    // Test ID (if exists)
    if (el.testId) {
      locators.push({
        type: "testId",
        locator: `getByTestId('${el.testId}')`,
        reliability: 98,
        description: "Best choice - explicitly set for testing",
      });
    }

    // Placeholder (for inputs)
    if (el.placeholder) {
      locators.push({
        type: "placeholder",
        locator: `getByPlaceholder('${this.escape(el.placeholder)}')`,
        reliability: 85,
        description: "Good for form inputs",
      });
    }

    // Label (for form elements)
    if (el.ariaLabel) {
      locators.push({
        type: "label",
        locator: `getByLabel('${this.escape(el.ariaLabel)}')`,
        reliability: 88,
        description: "Accessible label-based locator",
      });
    }

    // Text-based
    if (el.text && el.tagName !== "input") {
      locators.push({
        type: "text",
        locator: `getByText('${this.escape(el.text)}')`,
        reliability: 75,
        description: "Text content based - may break if text changes",
      });
    }

    // ID-based
    if (el.id) {
      locators.push({
        type: "id",
        locator: `locator('#${el.id}')`,
        reliability: 90,
        description: "ID selector - stable if ID is meaningful",
      });
    }

    // CSS selector
    locators.push({
      type: "css",
      locator: `locator('${el.selector}')`,
      reliability: 60,
      description: "CSS selector - may be brittle",
    });

    // XPath (lowest priority)
    locators.push({
      type: "xpath",
      locator: `locator('${el.xpath}')`,
      reliability: 40,
      description: "XPath - avoid unless necessary",
    });

    return locators;
  }

  private inferRole(el: ElementInfo): string | null {
    const tag = el.tagName.toLowerCase();
    const type = el.type?.toLowerCase();

    if (tag === "button" || type === "submit" || type === "button") return "button";
    if (tag === "a") return "link";
    if (tag === "input" && type === "checkbox") return "checkbox";
    if (tag === "input" && type === "radio") return "radio";
    if (tag === "input" || tag === "textarea") return "textbox";
    if (tag === "select") return "combobox";
    if (tag === "img") return "img";

    return null;
  }

  private rankLocators(locators: LocatorResult[]): LocatorResult[] {
    return locators.sort((a, b) => b.reliability - a.reliability);
  }

  private describeElement(el: ElementInfo): string {
    const parts: string[] = [];
    if (el.text) parts.push(`"${el.text}"`);
    if (el.placeholder) parts.push(`placeholder: "${el.placeholder}"`);
    if (el.type) parts.push(`type: ${el.type}`);
    parts.push(`<${el.tagName}>`);
    return parts.join(" ") || el.tagName;
  }

  private generatePropertyName(el: ElementInfo): string {
    let name = el.id || el.name || el.text || el.placeholder || el.ariaLabel || el.tagName;
    name = name.replace(/[^a-zA-Z0-9]/g, " ").trim();
    const words = name.split(/\s+/).slice(0, 3);
    return words.map((w, i) => 
      i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join("");
  }

  private escape(str: string): string {
    return str.replace(/'/g, "\\'").substring(0, 50);
  }

  private parseLocatorString(page: Page, str: string): Locator {
    if (str.startsWith("getByRole")) {
      const match = str.match(/getByRole\('(\w+)'(?:,\s*\{\s*name:\s*'([^']+)'\s*\})?\)/);
      if (match) return page.getByRole(match[1] as any, match[2] ? { name: match[2] } : undefined);
    }
    if (str.startsWith("getByText")) {
      const match = str.match(/getByText\('([^']+)'\)/);
      if (match) return page.getByText(match[1]);
    }
    if (str.startsWith("getByTestId")) {
      const match = str.match(/getByTestId\('([^']+)'\)/);
      if (match) return page.getByTestId(match[1]);
    }
    if (str.startsWith("getByPlaceholder")) {
      const match = str.match(/getByPlaceholder\('([^']+)'\)/);
      if (match) return page.getByPlaceholder(match[1]);
    }
    if (str.startsWith("locator")) {
      const match = str.match(/locator\('([^']+)'\)/);
      if (match) return page.locator(match[1]);
    }
    return page.locator(str);
  }

  private generateTypeScriptPOM(className: string, elements: any[], url: string): string {
    const props = elements.map((e) => `  readonly ${e.name}: Locator;`).join("\n");
    const inits = elements.map((e) => `    this.${e.name} = page.${e.locator};`).join("\n");

    return `import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for: ${url}
 * Generated by LocatorLabs MCP
 */
export class ${className} {
  readonly page: Page;
${props}

  constructor(page: Page) {
    this.page = page;
${inits}
  }

  async navigate() {
    await this.page.goto('${url}');
  }
}
`;
  }

  private generateJavaScriptPOM(className: string, elements: any[], url: string): string {
    const inits = elements.map((e) => `    this.${e.name} = page.${e.locator};`).join("\n");

    return `/**
 * Page Object Model for: ${url}
 * Generated by LocatorLabs MCP
 */
class ${className} {
  constructor(page) {
    this.page = page;
${inits}
  }

  async navigate() {
    await this.page.goto('${url}');
  }
}

module.exports = { ${className} };
`;
  }

  private generatePythonPOM(className: string, elements: any[], url: string): string {
    const props = elements.map((e) => {
      const pyLocator = e.locator
        .replace(/getByRole/g, "get_by_role")
        .replace(/getByText/g, "get_by_text")
        .replace(/getByTestId/g, "get_by_test_id")
        .replace(/getByPlaceholder/g, "get_by_placeholder");
      return `        self.${this.toSnakeCase(e.name)} = page.${pyLocator}`;
    }).join("\n");

    return `"""
Page Object Model for: ${url}
Generated by LocatorLabs MCP
"""
from playwright.sync_api import Page


class ${className}:
    def __init__(self, page: Page):
        self.page = page
${props}

    def navigate(self):
        self.page.goto('${url}')
`;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
  }
}