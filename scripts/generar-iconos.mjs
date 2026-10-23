// Exporta el logo vectorial existente a los formatos de navegador y Google.
// Usa sharp, ya incluido por Next.js; no requiere dependencias nuevas.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const marca = (await readFile('public/kodigodota-mark.svg', 'utf8'))
  .replace('<svg ', '<svg x="48" y="48" width="416" height="416" ');
const cuadrado = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0a0e17"/>${marca}</svg>`);
const png = lado => sharp(cuadrado).resize(lado, lado).png().toBuffer();

for (const [ruta, lado] of [['src/app/icon.png', 96], ['src/app/apple-icon.png', 180], ['public/kodigodota-icon.png', 512]]) {
  await writeFile(ruta, await png(lado));
}

// ICO admite PNG en cada entrada: conserva 16–256 px sin deformar el SVG.
const lados = [16, 32, 48, 64, 96, 256];
const imagenes = await Promise.all(lados.map(png));
const cabecera = Buffer.alloc(6 + 16 * lados.length);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(lados.length, 4);
let offset = cabecera.length;
imagenes.forEach((imagen, i) => {
  const inicio = 6 + 16 * i;
  cabecera[inicio] = lados[i] === 256 ? 0 : lados[i];
  cabecera[inicio + 1] = cabecera[inicio];
  cabecera.writeUInt16LE(1, inicio + 4);
  cabecera.writeUInt16LE(32, inicio + 6);
  cabecera.writeUInt32LE(imagen.length, inicio + 8);
  cabecera.writeUInt32LE(offset, inicio + 12);
  offset += imagen.length;
});
await writeFile('src/app/favicon.ico', Buffer.concat([cabecera, ...imagenes]));
console.log('Iconos exportados desde kodigodota-mark.svg: ICO, PNG 96/180/512.');
