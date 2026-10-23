# Opción guardada: Shadow Fiend y Phantom Assassin

Arte generado el 23/10/2026 con la herramienta integrada `image_gen` (habilidad `imagegen`), para el banner principal existente. No se utilizó la API por CLI.

- Archivo del proyecto: `public/hero-arena-v2.webp`.
- Resolución: 2172 × 724 px, panorámica 3:1.
- Peso: 210 654 bytes; WebP a calidad 88, exportado con Sharp ya disponible en el proyecto.
- Dirección visual: Shadow Fiend en rojo volcánico a la izquierda, Phantom Assassin en azul/cian a la derecha y ruinas oscuras en el centro para mantener legibles la marca y la sala destacada.
- Disponible como `HERO_ESCENAS['sf-phantom']`. Para recuperarlo, cambia `HERO_ESCENA_ACTIVA` en `src/lib/heroEscenas.ts` a `'sf-phantom'`.
- El movimiento ambiental se aplica en CSS al fondo y la bruma, respetando la preferencia de reducir movimiento. El control de pausa se retiró por petición del usuario. El título y las tarjetas permanecen quietos.
- La nueva opción activa y sus prompts están en `docs/HERO-CONVERGENCIA.md`.

## Prompt final

```text
Create a brand-new premium cinematic panoramic background illustration for the real KódigoDota 2 esports homepage hero banner. Landscape extremely wide 3:1 composition, ideally 3072x1024 or similarly crisp high resolution. This is ONLY the artwork, not a website mockup: absolutely no text, logos, typography, UI, frames, watermarks, emblems or branding. Visually stunning sophisticated dark Dota 2 fantasy key art, painterly AAA game cinematic finish with beautifully crafted materials, strong shapes and atmospheric depth, not glossy plastic and not generic AI neon. Leftmost 0–18%: imposing Shadow Fiend emerging from charcoal-black volcanic rock, recognizable horned obsidian silhouette, molten crimson fissures inside black armor, intense red eyes, restrained glowing embers, facing slightly inward. Rightmost 83–100%: Phantom Assassin in dark blue-teal armor with her signature helmet and hood, focused face and a graceful curved blade framing the far right, cold moonlit highlights, facing inward. Keep both heroes on the extreme outer edges, key heads centered vertically around 35–45% of canvas so a very wide shallow website crop retains their faces. The center 22–80% must stay very dark, spacious, calm and relatively low detail so white real website typography and a dark featured-room UI card can be overlaid and read easily. Atmospheric ancient battlefield in the background: receding stone bridge, distant ruined tower silhouettes, subtle smoke and mist above an abyss, understated violet light far below at center bottom. Rich midnight navy and obsidian base, controlled crimson illumination on left and icy cyan-teal rim light on right, with very subtle indigo in the middle. Strong depth, volumetric light mainly at the edges, beautiful fantasy detail on the two heroes, softer atmospheric scenery. Balanced, confident, high-end esports art direction. Avoid busy action in the center, bright central light, text, busy sparks across the middle, oversaturated rainbow colors, symmetric duplicated characters, extra limbs or weapons. Must feel like a striking upgrade from a stock gaming wallpaper and work as the background of an existing dark web hero.
```
