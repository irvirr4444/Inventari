#!/usr/bin/env python3
"""Build padded Android icon layers from a transparent logo PNG.

Preferred source: android-shell/assets/logo-source.png (transparent PNG).
Falls back to frontend/public/shelf-png-blue-color-shelf-graphic-design-vector.png.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
LOGO_SOURCE = ASSETS / "logo-source.png"
FAVICON_FALLBACK = (
    ROOT.parent / "frontend" / "public" / "shelf-png-blue-color-shelf-graphic-design-vector.png"
)

ICON_SIZE = 1024
SPLASH_SIZE = 2732
SPLASH_BG_RGB = (7, 21, 40)  # #071528 — splash only
LOGO_FRACTION = 0.52
SPLASH_LOGO_FRACTION = 0.18


def resolve_source() -> Path:
    if LOGO_SOURCE.is_file():
        return LOGO_SOURCE
    if FAVICON_FALLBACK.is_file():
        print(f"Note: using favicon fallback ({FAVICON_FALLBACK.name}).")
        print(f"      For a clean icon, add transparent PNG at {LOGO_SOURCE}")
        return FAVICON_FALLBACK
    raise SystemExit(
        f"Missing logo. Add transparent PNG at {LOGO_SOURCE} "
        f"(or restore {FAVICON_FALLBACK})."
    )


def is_logo_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 40:
        return False
    # Shelf mark is blue-dominant; drop black/gray leftovers from non-transparent exports.
    if b < 60:
        return False
    return b >= r and b >= g * 0.85


def load_logo_rgba(source: Path) -> Image.Image:
    img = Image.open(source).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not is_logo_pixel(r, g, b, a):
                pixels[x, y] = (0, 0, 0, 0)
    return img


def fit_center(canvas_size: int, logo: Image.Image, fraction: float) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    max_dim = int(canvas_size * fraction)
    scale = min(max_dim / logo.width, max_dim / logo.height)
    resized = logo.resize(
        (max(1, int(logo.width * scale)), max(1, int(logo.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (canvas_size - resized.width) // 2
    y = (canvas_size - resized.height) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def solid_rgb(size: int, rgb: tuple[int, int, int]) -> Image.Image:
    return Image.new("RGB", (size, size), rgb)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    source = resolve_source()
    logo = load_logo_rgba(source)

    icon = fit_center(ICON_SIZE, logo, LOGO_FRACTION)

    splash = solid_rgb(SPLASH_SIZE, SPLASH_BG_RGB).convert("RGBA")
    splash_logo = fit_center(SPLASH_SIZE, logo, SPLASH_LOGO_FRACTION)
    splash.paste(splash_logo, (0, 0), splash_logo)

    icon.save(ASSETS / "icon-only.png", "PNG")
    icon.save(ASSETS / "icon-foreground.png", "PNG")
    splash.save(ASSETS / "splash.png", "PNG")
    icon.save(ASSETS / "logo.png", "PNG")

    # @capacitor/assets flattens transparent PNG backgrounds to black in mipmaps.
    # Adaptive icon background is set via XML color in patch-android-adaptive-icon.py.
    background_path = ASSETS / "icon-background.png"
    if background_path.exists():
        background_path.unlink()

    print(f"Source: {source}")
    print(f"Wrote icon assets to {ASSETS}")


if __name__ == "__main__":
    main()
