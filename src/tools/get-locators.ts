/**
 * Get Locators Tool - Generate all possible locators for elements
 *
 * @author Naveen AutomationLabs
 * @license MIT
 * @date 2025
 * @see https://github.com/naveenanimation20/locatorlabs-mcp
 */

import { Page } from "playwright";
import { BrowserManager } from "../core/browser.js";

const MAX_TEXT_LENGTH = 100;
const MAX_LOCATORS = 10;

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
  value?: string;
  xpath: string;
  selector: string;
}

export interface LocatorResult {
  type: string;
  locator: string;
  reliability: number;
  description: string;
}

export interface SeleniumLocator {
  java: string;
  python: string;
  csharp: string;
}

interface GetLocatorsResult {
  url: string;
  elementDescription: string;
  matchedElements: number;
  locators: LocatorResult[];
  recommended: string;
  playwright: {
    recommended: string;
    all: string[];
  };
  selenium: {
    recommended: SeleniumLocator;
    all: SeleniumLocator[];
  };
  alternativeSelectors: {
    css: string;
    xpath: string;
  };
}

export class GetLocatorsTool {
  constructor(private browserManager: BrowserManager) {}

  async execute(url: string, elementDescription: string): Promise<GetLocatorsResult> {
    const page = await this.browserManager.navigateTo(url);
    const elements = await this.findMatchingElements(page, elementDescription);

    if (elements.length === 0) {
      return {
        url,
        elementDescription,
        matchedElements: 0,
        locators: [],
        recommended: "No matching elements found. Try a different description.",
        playwright: {
          recommended: "",
          all: [],
        },
        selenium: {
          recommended: { java: "", python: "", csharp: "" },
          all: [],
        },
        alternativeSelectors: {
          css: "",
          xpath: "",
        },
      };
    }

    // Use the best matching element
    const element = elements[0];
    const locators = this.generateLocators(element);
    const ranked = this.rankLocators(locators).slice(0, MAX_LOCATORS);

    // Generate Selenium locators
    const seleniumLocators = this.generateSeleniumLocators(element);

    return {
      url,
      elementDescription,
      matchedElements: elements.length,
      locators: ranked,
      recommended: ranked[0]?.locator || "No locator found",
      playwright: {
        recommended: ranked[0]?.locator || "",
        all: ranked.map((l) => l.locator),
      },
      selenium: {
        recommended: seleniumLocators[0] || { java: "", python: "", csharp: "" },
        all: seleniumLocators,
      },
      alternativeSelectors: {
        css: element.selector,
        xpath: element.xpath,
      },
    };
  }

  private async findMatchingElements(page: Page, description: string): Promise<ElementInfo[]> {
    const allElements = await this.getAllElements(page);
    const keywords = description.toLowerCase().split(/\s+/);

    // Score each element based on keyword matches
    const scored = allElements.map((el) => {
      const searchText = [
        el.id,
        el.name,
        el.className,
        el.text,
        el.placeholder,
        el.ariaLabel,
        el.type,
        el.title,
        el.tagName,
        el.role,
        el.testId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          score += 1;
          // Bonus for exact matches in important fields
          if (el.id?.toLowerCase() === keyword) score += 3;
          if (el.testId?.toLowerCase().includes(keyword)) score += 3;
          if (el.ariaLabel?.toLowerCase().includes(keyword)) score += 2;
          if (el.text?.toLowerCase().includes(keyword)) score += 2;
          if (el.placeholder?.toLowerCase().includes(keyword)) score += 2;
        }
      }

      return { element: el, score };
    });

    // Filter and sort by score
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.element);
  }

  private async getAllElements(page: Page): Promise<ElementInfo[]> {
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

    // 1. Test ID
    if (el.testId) {
      locators.push({
        type: "testId",
        locator: `getByTestId('${el.testId}')`,
        reliability: 98,
        description: "Best - explicitly set for testing",
      });
    }

    // 2. Role with name
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
      }
    }

    // 3. Label
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

    // 5. Text
    if (el.text && !["input", "textarea"].includes(el.tagName)) {
      locators.push({
        type: "text",
        locator: `getByText('${this.escape(el.text)}')`,
        reliability: 75,
        description: "Text content - may break if text changes",
      });
    }

    // 6. ID
    if (el.id) {
      locators.push({
        type: "id",
        locator: `locator('#${el.id}')`,
        reliability: 90,
        description: "ID selector - stable if ID is meaningful",
      });
    }

    // 7. Name attribute (for form elements)
    if (el.name) {
      locators.push({
        type: "name",
        locator: `locator('[name="${el.name}"]')`,
        reliability: 80,
        description: "Name attribute selector",
      });
    }

    // 8. CSS
    if (el.selector && el.selector !== el.tagName) {
      locators.push({
        type: "css",
        locator: `locator('${el.selector}')`,
        reliability: 60,
        description: "CSS selector - may be brittle",
      });
    }

    // 9. XPath
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

  private escape(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .substring(0, MAX_TEXT_LENGTH);
  }

  private generateSeleniumLocators(el: ElementInfo): SeleniumLocator[] {
    const locators: SeleniumLocator[] = [];

    // ID (highest priority for Selenium)
    if (el.id) {
      locators.push({
        java: `By.id("${el.id}")`,
        python: `By.ID, "${el.id}"`,
        csharp: `By.Id("${el.id}")`,
      });
    }

    // Name attribute
    if (el.name) {
      locators.push({
        java: `By.name("${el.name}")`,
        python: `By.NAME, "${el.name}"`,
        csharp: `By.Name("${el.name}")`,
      });
    }

    // CSS Selector
    if (el.selector) {
      locators.push({
        java: `By.cssSelector("${el.selector}")`,
        python: `By.CSS_SELECTOR, "${el.selector}"`,
        csharp: `By.CssSelector("${el.selector}")`,
      });
    }

    // XPath
    if (el.xpath) {
      locators.push({
        java: `By.xpath("${el.xpath}")`,
        python: `By.XPATH, "${el.xpath}"`,
        csharp: `By.XPath("${el.xpath}")`,
      });
    }

    // Link Text (for anchor tags)
    if (el.tagName === "a" && el.text) {
      locators.push({
        java: `By.linkText("${this.escape(el.text)}")`,
        python: `By.LINK_TEXT, "${this.escape(el.text)}"`,
        csharp: `By.LinkText("${this.escape(el.text)}")`,
      });
    }

    // Class Name (first class only)
    if (el.className) {
      const firstClass = el.className.split(" ")[0];
      if (firstClass && !firstClass.includes(":")) {
        locators.push({
          java: `By.className("${firstClass}")`,
          python: `By.CLASS_NAME, "${firstClass}"`,
          csharp: `By.ClassName("${firstClass}")`,
        });
      }
    }

    // Tag Name (lowest priority)
    locators.push({
      java: `By.tagName("${el.tagName}")`,
      python: `By.TAG_NAME, "${el.tagName}"`,
      csharp: `By.TagName("${el.tagName}")`,
    });

    return locators;
  }
}