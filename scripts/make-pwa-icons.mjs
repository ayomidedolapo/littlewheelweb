import sharp from "sharp";
import { mkdirSync } from "fs";

const src = "public/uploads/Layer_x0020_1.png"; // <-- your source
mkdirSync("public/icons", { recursive: true });

const tasks = [
  { out: "public/icons/manifest-icon-192.png", size: 192 },
  { out: "public/icons/manifest-icon-512.png", size: 512 },
];

for (const t of tasks) {
  await sharp(src)
    .resize(t.size, t.size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(t.out);
  console.log("Wrote", t.out);
}
console.log("Done");
