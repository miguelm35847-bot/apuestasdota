# Luna integrada en el cielo

Corrección del 23/10/2026 realizada con la herramienta integrada `image_gen` (habilidad `imagegen`), sin CLI ni API externa. Se editó el paisaje original para situar la luna en el cielo, con nubes por delante de su borde inferior y las montañas conservadas en primer plano. Se retiró la luna SVG superpuesta; la profundidad ya forma parte del arte y se conserva durante el movimiento del fondo y el recorte responsive.

- Resultado: `public/hero-convergencia-cielo.webp`, 2172×724 px, 191386 bytes.
- Origen conservado: `public/hero-convergencia-fondo.webp`.
- PNG generado conservado: `C:/Users/Usuario/.codex/generated_images/01a16733-f6b1-7e61-afd1-6c6149f529a2/exec-282c97c3-5e92-4d1e-9455-d8b6e1c827e3.png`.
- Exportación WebP a calidad 88 con Sharp existente, sin recorte ni cambios de resolución.
- No se modificaron los retratos ni su levitación (20/18 px en ciclos de 4.8/5.6 s), el hero, la destacada o las tarjetas.
- Encuadre de Convergencia en `center 35%` y vignette gradual desde el cielo: conserva margen superior de la luna y evita oscurecerla en exceso, manteniendo la lectura del contenido.
- SF/Phantom y el paisaje de Convergencia sin luna permanecen guardados.

## Prompt final

Entrada de edición: `public/hero-convergencia-fondo.webp`. Fondo transparente solicitado: `false`.

```text
Use case: precise-object-edit. Edit target: the attached panoramic Dota fantasy scenery, NOT a reference for a new composition. Preserve the entire architecture, floating rocks, mountains, foreground, perspective, colors, gold realm on the left, purple realm on the right, dark center, dimensions and panoramic 3:1 framing as closely as possible. Make one restrained change: add a single realistic, distant pale silver moon in the open dark sky, around 44% of the image width and 18% of the image height (approximately center x=955, y=130 on the 2172x724 original), with diameter about 130 pixels. It should feel like a celestial body very far behind EVERYTHING in the landscape, not a sticker, icon, flat vector orb, planet in front of cliffs, or oversized foreground object. Natural faint crater/maria texture, soft atmospheric contrast, restrained cool silver luminance matching the existing cinematic painted scenery. IMPORTANT OCCLUSION: existing mountains, floating stone silhouettes, distant architecture and all clouds must remain IN FRONT of the moon wherever they intersect. The lower third of the moon must be partially veiled by an organic, thin band of the existing dark blue-gray clouds, with varied translucent wisps and one denser cloud hiding part of the lower rim. Avoid an entirely exposed, hard, perfectly circular disk. The top rim should still be sufficiently visible to recognize the moon through the haze. Keep the moon in open sky above the mountain skyline; do not erase, cover, relight or replace the mountains to make room. Blend its light into the cloud atmosphere very subtly without brightening the center or changing the scene. No new heroes, people, creatures, UI, text, logos, watermarks or other objects. Leave the rest of the supplied artwork intact. The resulting asset is the actual background of a dark esports website, with separately animated characters and real HTML text added later.
```

