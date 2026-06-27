#!/usr/bin/env python3
"""Rebuild legacy launcher PNGs with white background behind the logo."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON_ONLY = ROOT / "assets" / "icon-only.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
ICON_BG_RGB = (255, 255, 255)

SIZES = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def main() -> None:
    if not ICON_ONLY.is_file():
        raise SystemExit(f"Missing {ICON_ONLY} — run prepare-icon-assets.py first")

    source = Image.open(ICON_ONLY).convert("RGBA")

    for folder, size in SIZES.items():
        out_dir = RES / folder
        if not out_dir.is_dir():
            continue
        canvas = Image.new("RGBA", (size, size), ICON_BG_RGB)
        logo = source.resize((size, size), Image.Resampling.LANCZOS)
        canvas.paste(logo, (0, 0), logo)
        for name in ("ic_launcher.png", "ic_launcher_round.png"):
            canvas.save(out_dir / name, "PNG")

    print("Rebuilt legacy launcher PNGs with white background")


if __name__ == "__main__":
    main()
