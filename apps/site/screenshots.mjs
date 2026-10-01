// Captures the screenshots used by the site and the README from the built
// demos (run `pnpm build` first). Needs a local Chrome or Chromium:
//
//   pnpm --filter @oaspect/site screenshots
//   CHROME_PATH=/usr/bin/chromium pnpm --filter @oaspect/site screenshots
//
// Output: public/images/*.webp, committed so the site build stays browser-free.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const root = import.meta.dirname;
const dist = resolve(root, "dist");
const out = resolve(root, "public/images");
mkdirSync(out, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  { darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", win32: "C:/Program Files/Google/Chrome/Application/chrome.exe" }[process.platform] ??
  "/usr/bin/google-chrome";

const page_ = (file) => pathToFileURL(join(dist, file)).href;
const ROASTERY = page_("demo/roastery.html");

// What "Try it" receives instead of reaching api.roastery.dev.
const MOCK_BEANS = {
  data: [
    { id: "bean_eth_guji", name: "Guji Hambela", origin: "ET", process: "washed", notes: ["jasmine", "bergamot", "peach"], price: { amount: 1850, currency: "EUR" }, in_stock: true },
    { id: "bean_col_huila", name: "Huila Pink Bourbon", origin: "CO", process: "natural", notes: ["strawberry", "cacao"], price: { amount: 2100, currency: "EUR" }, in_stock: true },
  ],
  meta: { page: 1, per_page: 20, total: 42 },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function open(url, { theme = "light", width = 1440, height = 900, scale = 2 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.evaluateOnNewDocument((value) => localStorage.setItem("oaspect:theme", value), theme);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().includes("roastery.dev")) {
      request.respond({ status: 200, contentType: "application/json", headers: { "x-request-id": "req_8f2c", "access-control-allow-origin": "*" }, body: JSON.stringify(MOCK_BEANS, null, 2) });
    } else request.continue();
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await pause(600);
  return page;
}

async function shot(page, name) {
  await page.screenshot({ path: join(out, `${name}.webp`), type: "webp", quality: 82 });
  console.log(`  ${name}.webp`);
}

async function setLocale(page, locale) {
  await page.evaluate((value) => {
    const select = [...document.querySelectorAll(".oaspect select")].find((item) => [...item.options].some((option) => option.value === value));
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, locale);
  await pause(500);
}

// Sets a React-controlled input inside the open dialog by its label.
async function fill(page, values) {
  await page.evaluate((entries) => {
    const dialog = document.querySelector("dialog[open]");
    for (const [name, value] of entries) {
      const label = [...dialog.querySelectorAll("label")].find((item) => item.querySelector("span")?.textContent.trim() === name);
      const input = label.querySelector("input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, Object.entries(values));
}

async function tryIt(page, operation, values = {}) {
  await page.evaluate((id) => {
    const section = document.getElementById(id);
    [...section.querySelectorAll("button")].find((button) => button.offsetParent && /^(Try|Dene)/.test(button.textContent.trim())).click();
  }, `operation/${operation}`);
  await pause(400);
  await fill(page, values);
  await page.evaluate(() => {
    const dialog = document.querySelector("dialog[open]");
    [...dialog.querySelectorAll("button")].find((button) => /^(Send|Gönder)$/.test(button.textContent.trim())).click();
  });
  await pause(900);
}

for (const theme of ["light", "dark"]) {
  console.log(theme);
  let page = await open(`${ROASTERY}#operation/orders-create`, { theme });
  await page.evaluate(() => window.scrollBy(0, -32));
  await pause(300);
  await shot(page, `hero-${theme}`);
  await page.close();

  page = await open(`${ROASTERY}#operation/beans-list`, { theme });
  await tryIt(page, "beans-list", { origin: "ET", in_stock: "true" });
  await shot(page, `try-it-${theme}`);
  await page.close();

  // Request body with the nested items and the oneOf payment expanded.
  page = await open(`${ROASTERY}#operation/orders-create`, { theme });
  await page.evaluate(() => {
    const section = document.getElementById("operation/orders-create");
    for (const button of section.querySelectorAll("button[aria-expanded='false']")) {
      if (/^(items|payment)/.test(button.textContent.trim())) button.click();
    }
  });
  await pause(300);
  await page.evaluate(() => {
    const section = document.getElementById("operation/orders-create");
    const heading = [...section.querySelectorAll("*")].find((item) => item.childElementCount === 0 && item.textContent.trim() === "Request body");
    window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 96);
  });
  await pause(300);
  await shot(page, `schema-${theme}`);
  await page.close();

  page = await open(`${ROASTERY}#operation/beans-list`, { theme, width: 390, height: 844, scale: 3 });
  await shot(page, `mobile-${theme}`);
  await page.close();
}

console.log("locales");
let page = await open(`${ROASTERY}#operation/orders-create`, { theme: "light" });
await setLocale(page, "tr");
await shot(page, "locale-tr");
await setLocale(page, "ar");
await page.evaluate(() => document.getElementById("operation/orders-create").scrollIntoView());
await pause(400);
await shot(page, "locale-ar");
await page.close();

console.log("demos");
for (const demo of ["roastery", "bookstore", "petstore", "events", "auth"]) {
  page = await open(page_(`demo/${demo}.html`), { width: 1280, height: 800, scale: 1 });
  await shot(page, `demo-${demo}`);
  await page.close();
}

await browser.close();
