/**
 * Screenshot capture using Puppeteer in Docker container
 */

import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { ScreenshotOptions } from "./types";

let browserInstance: Browser | null = null;

/**
 * Get or create Puppeteer browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

/**
 * Close browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Capture screenshot of a URL
 */
export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<string> {
  const {
    url,
    outputPath,
    width = 1920,
    height = 1080,
    waitForSelector,
    fullPage = false,
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport
    await page.setViewport({ width, height });

    // Navigate to URL
    console.log(`📸 Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      console.log(`⏳ Waiting for selector: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Capture screenshot
    console.log(`📸 Capturing screenshot to ${outputPath}...`);
    await page.screenshot({
      path: outputPath,
      fullPage,
    });

    console.log(`✅ Screenshot saved: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Screenshot failed:`, error);
    throw new Error(
      `Failed to capture screenshot: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  } finally {
    await page.close();
  }
}

/**
 * Capture multiple screenshots of different pages
 */
export async function captureMultipleScreenshots(
  screenshots: ScreenshotOptions[]
): Promise<string[]> {
  const results: string[] = [];

  for (const screenshotOptions of screenshots) {
    try {
      const outputPath = await captureScreenshot(screenshotOptions);
      results.push(outputPath);
    } catch (error) {
      console.error(`Failed to capture screenshot for ${screenshotOptions.url}:`, error);
      // Continue with other screenshots even if one fails
    }
  }

  return results;
}

/**
 * Capture screenshot of local dev server
 */
export async function captureDevServerScreenshot(
  projectId: string,
  port: number = 3000,
  routes: string[] = ["/"]
): Promise<string[]> {
  const outputDir = path.join(process.cwd(), "project-output", projectId, "screenshots");

  const screenshotOptions: ScreenshotOptions[] = routes.map((route) => ({
    url: `http://localhost:${port}${route}`,
    outputPath: path.join(
      outputDir,
      `${route.replace(/\//g, "_") || "home"}.png`
    ),
    fullPage: true,
  }));

  return captureMultipleScreenshots(screenshotOptions);
}

/**
 * Capture screenshot and check for common issues
 */
export async function captureAndValidateScreenshot(
  options: ScreenshotOptions
): Promise<{
  screenshotPath: string;
  issues: string[];
}> {
  const issues: string[] = [];
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: options.width || 1920,
      height: options.height || 1080,
    });

    // Navigate and capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        issues.push(`Console error: ${msg.text()}`);
      }
    });

    page.on("pageerror", (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(`Page error: ${message}`);
    });

    await page.goto(options.url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img"));
      return images.filter((img) => !img.complete || img.naturalWidth === 0).length;
    });

    if (brokenImages > 0) {
      issues.push(`${brokenImages} broken image(s) detected`);
    }

    // Check for 404 text
    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText?.includes("404") || bodyText?.includes("Not Found")) {
      issues.push("Page may be showing 404 error");
    }

    // Wait for selector if provided
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      } catch {
        issues.push(`Selector not found: ${options.waitForSelector}`);
      }
    }

    // Ensure output directory exists
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Capture screenshot
    await page.screenshot({
      path: options.outputPath,
      fullPage: options.fullPage || false,
    });

    return {
      screenshotPath: options.outputPath,
      issues,
    };
  } catch (error) {
    issues.push(
      `Screenshot capture failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Capture screenshots for common responsive breakpoints
 */
export async function captureResponsiveScreenshots(
  url: string,
  outputDir: string
): Promise<string[]> {
  const breakpoints = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1920, height: 1080 },
  ];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const screenshots: ScreenshotOptions[] = breakpoints.map((bp) => ({
    url,
    outputPath: path.join(outputDir, `screenshot-${bp.name}.png`),
    width: bp.width,
    height: bp.height,
    fullPage: true,
  }));

  return captureMultipleScreenshots(screenshots);
}
