import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const messagesPath = path.join(root, "messages/th.json");
const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
const invalidKeys = Object.keys(messages).filter((key) => key.includes("."));

if (invalidKeys.length) {
  console.error("Invalid next-intl message keys:");
  for (const key of invalidKeys) console.error(`- ${key}`);
  process.exit(1);
}

if (fs.existsSync(path.join(root, "messages/en.json"))) {
  console.error("English locale is not allowed: messages/en.json");
  process.exit(1);
}

console.log("UI i18n scan passed (Thai-only locale and valid next-intl keys).");
