/**
 * Test Runner - Core test execution engine for LocatorLabs MCP
 *
 * @author Naveen AutomationLabs
 * @license MIT
 * @date 2025
 * @see https://github.com/naveenanimation20/locatorlabs-mcp
 */

import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface TestStep {
  action: "navigate" | "click" | "fill" | "assert_visible" | "assert_text" | "screenshot" | "wait";
  locator?: string;
  value?: string;
  description: string;
}

export interface TestResult {
  testName: string;
  status: "passed" | "failed";
  duration: number;
  steps: StepResult[];
  screenshotPath?: string;
  error?: string;
}

export interface StepResult {
  step: string;
  status: "passed" | "failed";
  duration: number;
  error?: string;
}

export class TestRunner {
  private browser: Browser | null = null;

  async runTest(
    testName: string,
    steps: TestStep[],
    options: { headless?: boolean; slowMo?: number } = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let page: Page | null = null;
    let screenshotPath: string | undefined;

    try {
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
        slowMo: options.slowMo ?? 0,
      });

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      page = await context.newPage();

      for (const step of steps) {
        const stepStart = Date.now();
        try {
          await this.executeStep(page, step);
          stepResults.push({
            step: step.description,
            status: "passed",
            duration: Date.now() - stepStart,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          stepResults.push({
            step: step.description,
            status: "failed",
            duration: Date.now() - stepStart,
            error: errorMsg,
          });

          // Take failure screenshot
          screenshotPath = path.join(os.tmpdir(), `test-failure-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath });

          return {
            testName,
            status: "failed",
            duration: Date.now() - startTime,
            steps: stepResults,
            screenshotPath,
            error: errorMsg,
          };
        }
      }

      // Take success screenshot
      screenshotPath = path.join(os.tmpdir(), `test-success-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath });

      return {
        testName,
        status: "passed",
        duration: Date.now() - startTime,
        steps: stepResults,
        screenshotPath,
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  private async executeStep(page: Page, step: TestStep): Promise<void> {
    const timeout = 10000;

    switch (step.action) {
      case "navigate":
        await page.goto(step.value!, { waitUntil: "networkidle", timeout });
        break;

      case "click":
        await this.getLocator(page, step.locator!).click({ timeout });
        break;

      case "fill":
        await this.getLocator(page, step.locator!).fill(step.value!, { timeout });
        break;

      case "assert_visible":
        await this.getLocator(page, step.locator!).waitFor({ state: "visible", timeout });
        break;

      case "assert_text":
        const element = this.getLocator(page, step.locator!);
        await element.waitFor({ state: "visible", timeout });
        const text = await element.textContent();
        if (!text?.includes(step.value!)) {
          throw new Error(`Expected text "${step.value}" not found. Actual: "${text}"`);
        }
        break;

      case "screenshot":
        const ssPath = path.join(os.tmpdir(), `step-${Date.now()}.png`);
        await page.screenshot({ path: ssPath });
        break;

      case "wait":
        await page.waitForTimeout(parseInt(step.value!) || 1000);
        break;

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }

  private getLocator(page: Page, locatorStr: string) {
    // Parse Playwright locator strings
    if (locatorStr.startsWith("getByRole")) {
      const match = locatorStr.match(/getByRole\('(\w+)'(?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)/);
      if (match) return page.getByRole(match[1] as any, match[2] ? { name: match[2] } : undefined);
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
    // Default to CSS/XPath selector
    return page.locator(locatorStr);
  }

  async generateTestScript(
    testName: string,
    steps: TestStep[],
    language: "typescript" | "javascript" | "python" = "typescript"
  ): Promise<string> {
    switch (language) {
      case "python":
        return this.generatePythonTest(testName, steps);
      case "javascript":
        return this.generateJavaScriptTest(testName, steps);
      default:
        return this.generateTypeScriptTest(testName, steps);
    }
  }

  private generateTypeScriptTest(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToTypeScript(s)).join("\n");
    
    return `import { test, expect } from '@playwright/test';

test('${testName}', async ({ page }) => {
${stepCode}
});
`;
  }

  private generateJavaScriptTest(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToTypeScript(s)).join("\n");
    
    return `const { test, expect } = require('@playwright/test');

test('${testName}', async ({ page }) => {
${stepCode}
});
`;
  }

  private generatePythonTest(testName: string, steps: TestStep[]): string {
    const stepCode = steps.map((s) => this.stepToPython(s)).join("\n");
    const funcName = testName.toLowerCase().replace(/\s+/g, "_");
    
    return `import pytest
from playwright.sync_api import Page, expect


def test_${funcName}(page: Page):
${stepCode}
`;
  }

  private stepToTypeScript(step: TestStep): string {
    const indent = "  ";
    switch (step.action) {
      case "navigate":
        return `${indent}// ${step.description}\n${indent}await page.goto('${step.value}');`;
      case "click":
        return `${indent}// ${step.description}\n${indent}await page.${step.locator}.click();`;
      case "fill":
        return `${indent}// ${step.description}\n${indent}await page.${step.locator}.fill('${step.value}');`;
      case "assert_visible":
        return `${indent}// ${step.description}\n${indent}await expect(page.${step.locator}).toBeVisible();`;
      case "assert_text":
        return `${indent}// ${step.description}\n${indent}await expect(page.${step.locator}).toContainText('${step.value}');`;
      case "wait":
        return `${indent}// ${step.description}\n${indent}await page.waitForTimeout(${step.value});`;
      default:
        return `${indent}// ${step.description}`;
    }
  }

  private stepToPython(step: TestStep): string {
    const indent = "    ";
    const pyLocator = step.locator
      ?.replace(/getByRole/g, "get_by_role")
      .replace(/getByText/g, "get_by_text")
      .replace(/getByTestId/g, "get_by_test_id")
      .replace(/getByPlaceholder/g, "get_by_placeholder")
      .replace(/getByLabel/g, "get_by_label");

    switch (step.action) {
      case "navigate":
        return `${indent}# ${step.description}\n${indent}page.goto('${step.value}')`;
      case "click":
        return `${indent}# ${step.description}\n${indent}page.${pyLocator}.click()`;
      case "fill":
        return `${indent}# ${step.description}\n${indent}page.${pyLocator}.fill('${step.value}')`;
      case "assert_visible":
        return `${indent}# ${step.description}\n${indent}expect(page.${pyLocator}).to_be_visible()`;
      case "assert_text":
        return `${indent}# ${step.description}\n${indent}expect(page.${pyLocator}).to_contain_text('${step.value}')`;
      case "wait":
        return `${indent}# ${step.description}\n${indent}page.wait_for_timeout(${step.value})`;
      default:
        return `${indent}# ${step.description}`;
    }
  }
}