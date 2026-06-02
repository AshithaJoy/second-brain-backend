import fs from "fs";

const content = fs.readFileSync("../second-brain/src/App.jsx", "utf-8");

const lines = content.split("\n");
console.log("=== Matching Lines in App.jsx ===");
lines.forEach((line, index) => {
  if (line.includes("instagram_connect") || line.includes("InstagramConnectionCard") || line.includes("/instagram/media") || line.includes("instagram_error")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
