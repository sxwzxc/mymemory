// 给 out/ 下所有 HTML 文件头部注入 UTF-8 BOM
// 解决 EdgeOne Pages 静态托管时 Content-Type 不带 charset 导致中文乱码的问题
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (extname(entry.name) === '.html') out.push(full);
  }
  return out;
}

const root = 'out';
let touched = 0;
for (const file of await walk(root)) {
  const buf = await readFile(file);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) continue; // 已有 BOM
  await writeFile(file, Buffer.concat([BOM, buf]));
  touched++;
}
console.log(`[add-bom] 已为 ${touched} 个 HTML 文件注入 UTF-8 BOM`);
