# Vent Snap

A Mindustry mod that snaps turbine condensers and vent condensers onto steam vents.

![Vent Snap](https://raw.githubusercontent.com/m3rcur1e/vent-snap/media/vent-snap.gif)

These blocks only work when all nine tiles sit on a vent, and vents are hard to see under the placement preview. With this mod you don't have to aim: the preview jumps onto the vent.

## Usage

Hold a turbine condenser or a vent condenser and move the cursor near a steam vent. Within 6 tiles of the cursor, the preview jumps onto the best vent spot and a click places it there. Move away from the vents and the block follows the cursor as usual.

Schematics work the same way if they contain exactly one such block. The whole schematic shifts so that block sits on the vent. Rotating or flipping it keeps the block on the same vent.

In **Settings › Vent Snap** you can turn snapping off or change the radius (2–10 tiles). Changes apply right away.

If more of my mods are installed, they share a single **Cur1e Mods** settings tab, with one section per mod.

## Install

In the in-game mod browser, search for **Vent Snap**. Alternatively, download this repository as a zip and import it through **Mods › Import Mod**.

The mod is client-side only. It doesn't add content, so it can be used on any server.

Tested on v160.7 (desktop).

## How it works

Any 3x3 block that runs on the floor's steam attribute counts as a vent block. The mod looks at every spot within the radius and picks the one with the most steam under the block that the game would accept, closest to the cursor on a tie. The steam check is the same one the game uses for the block's efficiency. A spot where the same block already stands counts too.

Only the aim changes: the mod moves the preview, and placing and building stay vanilla. A single block is held as a one-block schematic while it is snapped, because vanilla draws a single block straight under the mouse. It turns back into a normal block when no vent is in range. The quick-rotate key doesn't turn the building under the cursor while a schematic is in hand, so rotating a snapped schematic doesn't also rotate that building.

It costs about 10–20 µs per frame with nothing in hand and about 0.1 ms per frame while a vent block is in hand.

## License

Copyright (C) 2026 m3rcur1e. Licensed under [GPL-3.0](LICENSE): you may use, modify and share it, and derivative works must stay under the GPL-3.0 as well.
