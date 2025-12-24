/**
 * Run Test Tool - Execute Playwright tests with pass/fail results
 *
 * @author Naveen AutomationLabs
 * @license MIT
 * @date 2025
 * @see https://github.com/naveenanimation20/locatorlabs-mcp
 */

import { chromium, Browser, Page, Locator } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TestStep {
  action:
    | "navigate"
    | "click"
    | "fill"
    | "clear"
    | "check"
    | "uncheck"
    | "select"
    | "hover"
    | "press"
    | "assert_visible"
    | "assert_hidden"
    | "assert_text"
    | "assert_value"
    | "assert_url"
    | "assert_title"
    | "wait"
    | "wait_for_element"
    | "screenshot";
  locator?: string;
  value?: string;
  description: string;
}

export interface StepResult {
  step: string;
  action: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
}

export interface TestResult {
  testName: string;
  status: "passed" | "failed";
  duration: number;
  steps: StepResult[];
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  screenshotPath?: string;
  finalUrl?: string;
  error?: string;
}

export interface TestOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  viewport?: { width: number; height: number };
}

export class RunTestTool {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async execute(
    testName: string,
    steps: TestStep[],
    options: TestOptions = {}
  ): Promise<TestResult> {
    const {
      headless = true,
      slowMo = 0,
      timeout = 30000,
      viewport = { width: 1280, height: 720 },
    } = options;

    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let screenshotPath: string | undefined;

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless,
        slowMo,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const context = await this.browser.newContext({
        viewport,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });

      this.page = await context.newPage();
      this.page.setDefaultTimeout(timeout);

      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepStart = Date.now();

        try {
          await this.executeStep(step);
          stepResults.push({
            step: step.description,
            action: step.action,
            status: "passed",
            duration: Date.now() - stepStart,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);

          stepResults.push({
            step: step.description,
            action: step.action,
            status: "failed",
            duration: Date.now() - stepStart,
            error: errorMsg,
          });

          // Take failure screenshot
          screenshotPath = await this.takeScreenshot("failure");

          // Mark remaining steps as skipped
          for (let j = i + 1; j < steps.length; j++) {
            stepResults.push({
              step: steps[j].description,
              action: steps[j].action,
              status: "skipped",
              duration: 0,
            });
          }

          return this.buildResult(testName, "failed", startTime, stepResults, screenshotPath, errorMsg);
        }
      }

      // Take success screenshot
      screenshotPath = await this.takeScreenshot("success");

      return this.buildResult(testName, "passed", startTime, stepResults, screenshotPath);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return this.buildResult(testName, "failed", startTime, stepResults, undefined, errorMsg);
    } finally {
      await this.cleanup();
    }
  }

  private async executeStep(step: TestStep): Promise<void> {
    if (!this.page) throw new Error("Page not initialized");

    const page = this.page;

    switch (step.action) {
      case "navigate":
        if (!step.value) throw new Error("URL is required for navigate action");
        await page.goto(step.value, { waitUntil: "domcontentloaded" });
        break;

      case "click":
        await this.getLocator(step.locator!).click();
        break;

      case "fill":
        if (!step.value) throw new Error("Value is required for fill action");
        await this.getLocator(step.locator!).fill(step.value);
        break;

      case "clear":
        await this.getLocator(step.locator!).clear();
        break;

      case "check":
        await this.getLocator(step.locator!).check();
        break;

      case "uncheck":
        await this.getLocator(step.locator!).uncheck();
        break;

      case "select":
        if (!step.value) throw new Error("Value is required for select action");
        await this.getLocator(step.locator!).selectOption(step.value);
        break;

      case "hover":
        await this.getLocator(step.locator!).hover();
        break;

      case "press":
        if (!step.value) throw new Error("Key is required for press action");
        await this.getLocator(step.locator!).press(step.value);
        break;

      case "assert_visible":
        await this.getLocator(step.locator!).waitFor({ state: "visible" });
        break;

      case "assert_hidden":
        await this.getLocator(step.locator!).waitFor({ state: "hidden" });
        break;

      case "assert_text":
        if (!step.value) throw new Error("Expected text is required");
        const text = await this.getLocator(step.locator!).textContent();
        if (!text?.includes(step.value)) {
          throw new Error(`Expected text "${step.value}" not found. Actual: "${text}"`);
        }
        break;

      case "assert_value":
        if (!step.value) throw new Error("Expected value is required");
        const value = await this.getLocator(step.locator!).inputValue();
        if (value !== step.value) {
          throw new Error(`Expected value "${step.value}" but got "${value}"`);
        }
        break;

      case "assert_url":
        if (!step.value) throw new Error("Expected URL pattern is required");
        const url = page.url();
        if (!url.includes(step.value)) {
          throw new Error(`URL "${url}" does not contain "${step.value}"`);
        }
        break;

      case "assert_title":
        if (!step.value) throw new Error("Expected title is required");
        const title = await page.title();
        if (!title.includes(step.value)) {
          throw new Error(`Title "${title}" does not contain "${step.value}"`);
        }
        break;

      case "wait":
        const waitTime = parseInt(step.value || "1000");
        await page.waitForTimeout(waitTime);
        break;

      case "wait_for_element":
        await this.getLocator(step.locator!).waitFor({ state: "visible" });
        break;

      case "screenshot":
        await this.takeScreenshot(step.value || "step");
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private getLocator(locatorStr: string): Locator {
    if (!this.page) throw new Error("Page not initialized");
    const page = this.page;

    // Parse different locator formats
    if (locatorStr.startsWith("getByRole")) {
      const match = locatorStr.match(/getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)/);
      if (match) {
        return page.getByRole(match[1] as any, match[2] ? { name: match[2] } : undefined);
      }
    }

    if (locatorStr.startsWith("getByText")) {
      const match = locatorStr.match(/getByText\(['"]([^'"]+)['"]\)/);
      if (match) return page.getByText(match[1]);
    }

    if (locatorStr.startsWith("getByTestId")) {
      const match = locatorStr.match(/getByTestId\(['"]([^'"]+)['"]\)/);
      if (match) return page.getByTestId(match[1]);
    }

    if (locatorStr.startsWith("getByPlaceholder")) {
      const match = locatorStr.match(/getByPlaceholder\(['"]([^'"]+)['"]\)/);
      if (match) return page.getByPlaceholder(match[1]);
    }

    if (locatorStr.startsWith("getByLabel")) {
      const match = locatorStr.match(/getByLabel\(['"]([^'"]+)['"]\)/);
      if (match) return page.getByLabel(match[1]);
    }

    if (locatorStr.startsWith("getByAltText")) {
      const match = locatorStr.match(/getByAltText\(['"]([^'"]+)['"]\)/);
      if (match) return page.getByAltText(match[1]);
    }

    if (locatorStr.startsWith("locator")) {
      const match = locatorStr.match(/locator\(['"]([^'"]+)['"]\)/);
      if (match) return page.locator(match[1]);
    }

    // Default: treat as CSS selector or XPath
    return page.locator(locatorStr);
  }

  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) return "";

    const timestamp = Date.now();
    const filename = `locatorlabs-${name}-${timestamp}.png`;
    const filepath = path.join(os.tmpdir(), filename);

    await this.page.screenshot({ path: filepath, fullPage: false });

    return filepath;
  }

  private buildResult(
    testName: string,
    status: "passed" | "failed",
    startTime: number,
    steps: StepResult[],
    screenshotPath?: string,
    error?: string
  ): TestResult {
    const passedSteps = steps.filter((s) => s.status === "passed").length;
    const failedSteps = steps.filter((s) => s.status === "failed").length;

    return {
      testName,
      status,
      duration: Date.now() - startTime,
      steps,
      totalSteps: steps.length,
      passedSteps,
      failedSteps,
      screenshotPath,
      finalUrl: this.page?.url(),
      error,
    };
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  // Generate executable test script
  async generateScript(
    testName: string,
    steps: TestStep[],
    language: "typescript" | "javascript" | "python" = "typescript"
  ): Promise<string> {
    switch (language) {
      case "python":
        return this.generatePythonScript(testName, steps);
      case "javascript":
        return this.generateJavaScriptScript(testName, steps);
      default:
        return this.generateTypeScriptScript(testName, steps);
    }
  }

  private generateTypeScriptScript(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToTypeScript(s)).join("\n\n");

    return `import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
${stepCode}
});
`;
  }

  private generateJavaScriptScript(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToTypeScript(s)).join("\n\n");

    return `const { test, expect } = require('@playwright/test');

test('${testName}', async ({ page }) => {
${stepCode}
});
`;
  }

  private generatePythonScript(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToPython(s)).join("\n\n");
    const funcName = testName.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    return `import pytest
from playwright.sync_api import Page, expect


def test_${funcName}(page: Page) -> None:
    """${testName}"""
${stepCode}
`;
  }

  private stepToTypeScript(step: TestStep): string {
    const indent = "  ";
    const locator = step.locator ? `page.${step.locator}` : "";

    switch (step.action) {
      case "navigate":
        return `${indent}// ${step.description}\n${indent}await page.goto('${step.value}');`;

      case "click":
        return `${indent}// ${step.description}\n${indent}await ${locator}.click();`;

      case "fill":
        return `${indent}// ${step.description}\n${indent}await ${locator}.fill('${step.value}');`;

      case "clear":
        return `${indent}// ${step.description}\n${indent}await ${locator}.clear();`;

      case "check":
        return `${indent}// ${step.description}\n${indent}await ${locator}.check();`;

      case "uncheck":
        return `${indent}// ${step.description}\n${indent}await ${locator}.uncheck();`;

      case "select":
        return `${indent}// ${step.description}\n${indent}await ${locator}.selectOption('${step.value}');`;

      case "hover":
        return `${indent}// ${step.description}\n${indent}await ${locator}.hover();`;

      case "press":
        return `${indent}// ${step.description}\n${indent}await ${locator}.press('${step.value}');`;

      case "assert_visible":
        return `${indent}// ${step.description}\n${indent}await expect(${locator}).toBeVisible();`;

      case "assert_hidden":
        return `${indent}// ${step.description}\n${indent}await expect(${locator}).toBeHidden();`;

      case "assert_text":
        return `${indent}// ${step.description}\n${indent}await expect(${locator}).toContainText('${step.value}');`;

      case "assert_value":
        return `${indent}// ${step.description}\n${indent}await expect(${locator}).toHaveValue('${step.value}');`;

      case "assert_url":
        return `${indent}// ${step.description}\n${indent}await expect(page).toHaveURL(/${step.value}/);`;

      case "assert_title":
        return `${indent}// ${step.description}\n${indent}await expect(page).toHaveTitle(/${step.value}/);`;

      case "wait":
        return `${indent}// ${step.description}\n${indent}await page.waitForTimeout(${step.value || 1000});`;

      case "wait_for_element":
        return `${indent}// ${step.description}\n${indent}await ${locator}.waitFor({ state: 'visible' });`;

      case "screenshot":
        return `${indent}// ${step.description}\n${indent}await page.screenshot({ path: '${step.value || "screenshot"}.png' });`;

      default:
        return `${indent}// ${step.description} (${step.action})`;
    }
  }

  private stepToPython(step: TestStep): string {
    const indent = "    ";
    const pyLocator = step.locator
      ? `page.${step.locator
          .replace(/getByRole/g, "get_by_role")
          .replace(/getByText/g, "get_by_text")
          .replace(/getByTestId/g, "get_by_test_id")
          .replace(/getByPlaceholder/g, "get_by_placeholder")
          .replace(/getByLabel/g, "get_by_label")
          .replace(/getByAltText/g, "get_by_alt_text")}`
      : "";

    switch (step.action) {
      case "navigate":
        return `${indent}# ${step.description}\n${indent}page.goto('${step.value}')`;

      case "click":
        return `${indent}# ${step.description}\n${indent}${pyLocator}.click()`;

      case "fill":
        return `${indent}# ${step.description}\n${indent}${pyLocator}.fill('${step.value}')`;

      case "clear":
        return `${indent}# ${step.description}\n${indent}${pyLocator}.clear()`;

      case "check":
        return `${indent}# ${step.description}\n${indent}${pyLocator}.check()`;

      case "assert_visible":
        return `${indent}# ${step.description}\n${indent}expect(${pyLocator}).to_be_visible()`;

      case "assert_text":
        return `${indent}# ${step.description}\n${indent}expect(${pyLocator}).to_contain_text('${step.value}')`;

      case "assert_url":
        return `${indent}# ${step.description}\n${indent}expect(page).to_have_url(re.compile('${step.value}'))`;

      case "wait":
        return `${indent}# ${step.description}\n${indent}page.wait_for_timeout(${step.value || 1000})`;

      default:
        return `${indent}# ${step.description} (${step.action})`;
    }
  }
}