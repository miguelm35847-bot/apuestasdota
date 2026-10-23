# Convergencia de los Ancestros

Nueva escena del hero generada con la herramienta integrada `image_gen` (habilidad `imagegen`), el 23/10/2026. El movimiento usa capas WebP independientes para Invoker y Void Spirit, más bruma y partículas CSS. El control de pausa se ha retirado por petición del usuario; se respeta la preferencia del sistema de reducir movimiento.

La escena anterior se conserva en `public/hero-arena-v2.webp` y en `HERO_ESCENAS['sf-phantom']`. Para recuperarla, cambia `HERO_ESCENA_ACTIVA` en `src/lib/heroEscenas.ts` a `'sf-phantom'`.

## Archivos

- `public/hero-convergencia-fondo.webp`: escenario panorámico 2172×724, 211114 bytes.
- `public/hero-convergencia-invoker.webp`: figura con transparencia, 800×1200, 344788 bytes.
- `public/hero-convergencia-void-spirit.webp`: figura con transparencia, 800×1200, 304246 bytes.

Peso de las tres capas originales: 860148 bytes (unos 840 KiB); Next Image sirve las variantes ajustadas al ancho del dispositivo.

Exportados como WebP con Sharp ya instalado, conservando alfa en las figuras. Texto, sala destacada, altura y métricas del hero se mantienen en sus elementos originales.

## Prompts finales

### fondo

Fondo transparente solicitado: `false`.

```text
Use case: stylized-concept. Asset type: panoramic background scenery for a premium Dota 2 esports homepage hero, an original art direction called Convergence of the Ancients. Create only the scenery, NO CHARACTERS. Extremely wide 3:1 landscape composition, ideally 3072x1024. Magnificent impossible Dota fantasy world: enormous fragments of ancient carved stone and suspended ruined temples float above a deep misty chasm; a shattered celestial ring and sweeping fractured stone arches subtly frame the far edges, linking a warmer radiant realm at far left with a mysterious violet astral realm at far right. A distant ancient fortress at the horizon, bridges disappearing into darkness, tiny gold and purple seams of arcane energy, deeply layered clouds, some stars in the midnight sky. High-end AAA Dota 2 cinematic key art, painterly but tangible and richly detailed rock, bronze and crystalline materials, bold confident fantasy shapes, extremely polished composition with genuine depth. Elegant restrained antique gold/amber lighting on far left, indigo/amethyst and a little cool silver at far right, charcoal and midnight navy dominating, matching a refined dark indigo esports brand. The middle 25–78% must stay calm, very dark and low contrast, with generous negative space for real white website title at center left and a dark featured-room card at center right. Most beautiful detailed architecture at outer edges and bottom, distant structures visible very softly through the central mist. The image will be cropped to a shallow 1920x460 website hero so keep the main horizon and scenic structures in the middle vertical band. Awe-inspiring, sophisticated, distinctive, no stock esports neon, no oversaturated rainbow and no generic red vs blue split. No heroes, people, creatures, text, logos, readable runes, watermarks, UI or frames. This scenery will be composited behind separately animated Invoker and Void Spirit character cutouts, so it must not contain those characters.
```

### invoker

Fondo transparente solicitado: `true`.

```text
Use case: stylized-concept. Asset type: isolated transparent foreground character layer for an original cinematic Dota 2 esports web hero titled Convergence of the Ancients. Genuine fully transparent background, not a gray checkerboard or flat backdrop. Portrait 2:3 composition, around1024x1536. Create Invoker from Dota 2, instantly recognizable: imperious ancient elven mage, pale handsome stern face, long swept-back white blond hair, high dramatic sculptural collar, richly crafted purple and aged gold robes and armor, layered ivory silk, embroidered arcane mantle. Heroic three-quarter figure from head to below knees, facing slightly toward the viewer's RIGHT (towards the middle of the final banner). Both arms and hands anatomically clear, one hand lifted near chest holding a single small intensely golden magical orb with soft amber sparks; the other relaxed near the waist. Do NOT spread arms into a wide silhouette. Cloak and cloth trail gracefully down and out behind him with a sense of restrained levitation, with a tasteful, softly transparent amber aura at the outer silhouette. Beautiful confident silhouette and superb face/detail, deliberate Dota 2 cinematic key art aesthetic, premium painterly AAA game rendering, tactile matte materials, sophisticated rim light. Warm antique gold lighting mixed with restrained indigo shadows, dramatic but not overexposed. He will be placed on the extreme LEFT edge of a dark wide website hero, with white website text to his right, so no outstretched weapons or bright large magic effects to the right of his torso. Keep a small 8% transparent safety margin around head, shoulders and arms; all visible silhouette cleanly isolated, lower cloth may fade gently into transparency at the bottom. No scenery, ground plane, rock pedestal, other characters, backdrop, writing, logos, watermark or border. Do not include any design mockup. Entire background must be transparent.
```

### void-spirit

Fondo transparente solicitado: `true`.

```text
Use case: stylized-concept. Asset type: isolated transparent foreground character layer for an original cinematic Dota 2 esports web hero titled Convergence of the Ancients. Genuine fully transparent background, not a checkerboard or a solid color. Portrait 2:3 composition, around1024x1536. Create Void Spirit from Dota 2, instantly recognizable: enigmatic ancient spirit warrior sage with lavender violet skin, luminous pale eyes, swept white hair, flowing white moustache and long white beard, dark sculptural purple and midnight-indigo segmented robes, dignified intricate armor and pale silver accents. Heroic three-quarter figure from head to below knees, facing slightly toward the viewer's LEFT (towards the middle of the final banner), with calm intense expression and a strong elegant posture. Hold his signature curved double-ended astral glaive close along the body and angled toward the outer RIGHT edge, its blade edge lit with restrained amethyst energy; avoid a huge weapon crossing far left. Flowing long robe panels and hair trail gently behind him as if suspended in the astral void. A subtle translucent violet astral aura and a few wisps can frame the figure, keep it compact, no complete portal or oversized effects. Premium Dota 2 cinematic key art to pair with an Invoker cutout lit by antique gold on the opposite side: painterly AAA game rendering, meticulously crafted tactile materials, crisp face and beautifully detailed elegant silhouette, dramatic violet/indigo rim light and soft cool silver highlights, not plastic or generic neon. He will be placed on the extreme RIGHT edge of a wide dark website hero with a UI card to his left; preserve clean silhouette and avoid large bright effects at his left edge. Small 8% transparent safety margin around head shoulders and arms; lower robe may fade gracefully to transparent at bottom. No scenery, ground plane, rock pedestal, other characters, backdrop, writing, logos, watermark, frame or UI. Entire background genuinely transparent.
```

