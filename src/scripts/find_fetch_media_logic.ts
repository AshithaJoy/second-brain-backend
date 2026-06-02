import fs from "fs";

const content = fs.readFileSync("../second-brain/src/App.jsx", "utf-8");
const lines = content.split("\n");

lines.forEach((line, index) => {
  if (line.includes("handleFetchInstagramMedia") || line.includes("apiFetchInstagramMedia")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
