/**
 * Analyze Page Tool - Scan pages and identify interactive elements
 *
 * @author Naveen AutomationLabs
 * @license MIT
 * @date 2025
 * @see https://github.com/naveenanimation20/locatorlabs-mcp
 */

import { Page } from "playwright";
import { BrowserManager } from "../core/browser.js";

// Limits to prevent huge responses
const MAX_ELEMENTS = 50;
const MAX_TEXT_LENGTH = 100;
const MAX_LOCATORS_PER_ELEMENT = 5;

export interface ElementInfo {
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
  xpath: string;
  selector: string;
}

export interface LocatorResult {
  type: string;
  locator: string;
  reliability: number;
  description: string;
}

export interface PageElement {
  element: string;
  type: string;
  locators: LocatorResult[];
  recommended: string;
}

export interface AnalyzePageResult {
  url: string;
  totalElements: number;
  returnedElements: number;
  truncated: boolean;
  elements: PageElement[];
}

export class AnalyzePageTool {
  constructor(private browserManager: BrowserManager) {}

  async execute(url: string, elementTypes?: string[]): Promise<AnalyzePageResult> {
    const page = await this.browserManager.navigateTo(url);
    const allElements = await this.getAllInteractiveElements(page);

    // Filter by element types if specified
    let filtered = allElements;
    if (elementTypes && elementTypes.length > 0) {
      filtered = allElements.filter((el) =>
        elementTypes.some(
          (t) =>
            el.tagName.toLowerCase().includes(t.toLowerCase()) ||
            el.type?.toLowerCase().includes(t.toLowerCase()) ||
            el.role?.toLowerCase().includes(t.toLowerCase())
        )
      );
    }

    // Apply limits
    const truncated = filtered.length > MAX_ELEMENTS;
    const limited = filtered.slice(0, MAX_ELEMENTS);

    // Generate locators for each element
    const elements: PageElement[] = limited.map((el) => {
      const locators = this.generateLocators(el);
      const ranked = this.rankLocators(locators).slice(0, MAX_LOCATORS_PER_ELEMENT);

      return {
        element: this.describeElement(el),
        type: el.tagName.toLowerCase(),
        locators: ranked,
        recommended: ranked[0]?.locator || "N/A",
      };
    });

    return {
      url,
      totalElements: allElements.length,
      returnedElements: elements.length,
      truncated,
      elements,
    };
  }

  private async getAllInteractiveElements(page: Page): Promise<ElementInfo[]> {
    return await page.evaluate((maxTextLen: number) => {
      const interactiveSelectors = [
        "button",
        "a",
        "input",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
        "[role='textbox']",
        "[role='checkbox']",
        "[role='radio']",
        "[role='combobox']",
        "[role='menuitem']",
        "[role='tab']",
        "[onclick]",
        "[tabindex]:not([tabindex='-1'])",
      ];

      const elements: ElementInfo[] = [];
      const seen = new Set<Element>();

      interactiveSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);

          // Skip hidden elements
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === "none" ||
            style.visibility === "hidden"
          ) {
            return;
          }

          const htmlEl = el as HTMLElement;
          const inputEl = el as HTMLInputElement;

          elements.push({
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            name: inputEl.name || undefined,
            className: el.className?.toString() || undefined,
            type: inputEl.type || undefined,
            placeholder: inputEl.placeholder || undefined,
            text: htmlEl.innerText?.trim().substring(0, maxTextLen) || undefined,
            ariaLabel: el.getAttribute("aria-label") || undefined,
            role: el.getAttribute("role") || undefined,
            testId:
              el.getAttribute("data-testid") ||
              el.getAttribute("data-test-id") ||
              el.getAttribute("data-cy") ||
              undefined,
            href: (el as HTMLAnchorElement).href || undefined,
            title: el.getAttribute("title") || undefined,
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
        if (el.id) return `#${CSS.escape(el.id)}`;

        const tag = el.tagName.toLowerCase();
        const classes = Array.from(el.classList)
          .filter((c) => !c.includes(":") && c.length < 30)
          .slice(0, 2)
          .map((c) => CSS.escape(c))
          .join(".");

        if (classes) return `${tag}.${classes}`;
        return tag;
      }

      return elements;
    }, MAX_TEXT_LENGTH);
  }

  private generateLocators(el: ElementInfo): LocatorResult[] {
    const locators: LocatorResult[] = [];

    // 1. Test ID (highest priority)
    if (el.testId) {
      locators.push({
        type: "testId",
        locator: `getByTestId('${el.testId}')`,
        reliability: 98,
        description: "Best - explicitly set for testing",
      });
    }

    // 2. Role-based with name
    const role = el.role || this.inferRole(el);
    if (role) {
      const name = el.ariaLabel || el.text || el.title;
      if (name) {
        locators.push({
          type: "role",
          locator: `getByRole('${role}', { name: '${this.escape(name)}' })`,
          reliability: 95,
          description: "Playwright recommended - accessible and stable",
        });
      } else {
        locators.push({
          type: "role",
          locator: `getByRole('${role}')`,
          reliability: 70,
          description: "Role without name - may match multiple elements",
        });
      }
    }

    // 3. Label (for form elements)
    if (el.ariaLabel) {
      locators.push({
        type: "label",
        locator: `getByLabel('${this.escape(el.ariaLabel)}')`,
        reliability: 90,
        description: "Accessible label-based locator",
      });
    }

    // 4. Placeholder
    if (el.placeholder) {
      locators.push({
        type: "placeholder",
        locator: `getByPlaceholder('${this.escape(el.placeholder)}')`,
        reliability: 85,
        description: "Good for form inputs",
      });
    }

    // 5. Text-based (not for inputs)
    if (el.text && !["input", "textarea"].includes(el.tagName)) {
      locators.push({
        type: "text",
        locator: `getByText('${this.escape(el.text)}')`,
        reliability: 75,
        description: "Text content - may break if text changes",
      });
    }

    // 6. ID-based
    if (el.id) {
      locators.push({
        type: "id",
        locator: `locator('#${el.id}')`,
        reliability: 90,
        description: "ID selector - stable if ID is meaningful",
      });
    }

    // 7. CSS selector
    if (el.selector && el.selector !== el.tagName) {
      locators.push({
        type: "css",
        locator: `locator('${el.selector}')`,
        reliability: 60,
        description: "CSS selector - may be brittle",
      });
    }

    // 8. XPath (lowest priority)
    locators.push({
      type: "xpath",
      locator: `locator("${el.xpath}")`,
      reliability: 40,
      description: "XPath - avoid unless necessary",
    });

    return locators;
  }

  private inferRole(el: ElementInfo): string | null {
    const tag = el.tagName.toLowerCase();
    const type = el.type?.toLowerCase();

    const roleMap: Record<string, string> = {
      button: "button",
      a: "link",
      select: "combobox",
      textarea: "textbox",
      img: "img",
    };

    if (roleMap[tag]) return roleMap[tag];

    if (tag === "input") {
      const inputRoles: Record<string, string> = {
        submit: "button",
        button: "button",
        checkbox: "checkbox",
        radio: "radio",
        text: "textbox",
        email: "textbox",
        password: "textbox",
        search: "searchbox",
        number: "spinbutton",
      };
      return inputRoles[type || "text"] || "textbox";
    }

    return null;
  }

  private rankLocators(locators: LocatorResult[]): LocatorResult[] {
    return [...locators].sort((a, b) => b.reliability - a.reliability);
  }

  private describeElement(el: ElementInfo): string {
    const parts: string[] = [];

    if (el.text) parts.push(`"${el.text.substring(0, 30)}"`);
    if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
    if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`);
    if (el.type && el.type !== el.tagName) parts.push(`type=${el.type}`);
    if (el.name) parts.push(`name="${el.name}"`);

    parts.push(`<${el.tagName}>`);

    return parts.join(" ") || el.tagName;
  }

  private escape(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .substring(0, MAX_TEXT_LENGTH);
  }
}