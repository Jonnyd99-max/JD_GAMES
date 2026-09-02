# Flappy King artwork

`atlas.webp` is original, AI-generated pixel artwork made for JD Games, not extracted from another game. Generated using the built-in imagegen tool (new-image mode); alpha was preserved without background processing.

Prompt: a cohesive transparent pixel-art atlas containing a crowned, red-caped flying king, a purple-clad adult prince, a grey stone castle tower with battlements, and a fantasy castle landscape. Crisp original pixel art; no labels, gridlines or existing game branding.

The renderer uses source rectangles in the unchanged 1254 × 1254 atlas. Towers tile a shaft region beneath the battlements. Character capes intentionally extend beyond the forgiving gameplay hitbox.

## Princess replacement

`princess.webp` replaces the prince in both the menu and the rescue scene. It was generated with the built-in imagegen tool using the original atlas as a style reference. The original atlas remains unchanged; its prince region is no longer rendered.

Prompt summary: one original, full-body adult princess facing left, wearing a golden crown and a purple/lavender royal dress, with long flowing hair and a friendly open hand toward the arriving king. Match the existing crisp pixel-art game sprites, with a transparent background and no scenery or text. Alpha is preserved, including the generated subtle glow. The renderer retains the image's natural proportions.

Deployment assets are losslessly encoded WebP. Every decoded RGBA pixel was verified identical to the generated PNG originals; no visual editing or background removal was performed.
