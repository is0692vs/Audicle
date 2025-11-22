import fs from "fs";
import { createCanvas, loadImage } from "canvas";

// SVGをPNGに変換する関数
async function convertSvgToPng(svgPath, pngPath, size) {
  const svgContent = fs.readFileSync(svgPath, "utf8");
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const image = await loadImage(Buffer.from(svgContent));
  ctx.drawImage(image, 0, 0, size, size);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(pngPath, buffer);
  console.log(`Converted ${svgPath} to ${pngPath}`);
}

// 実行
convertSvgToPng("public/icon.svg", "public/icon-192x192.png", 192);
convertSvgToPng("public/icon.svg", "public/icon-512x512.png", 512);
