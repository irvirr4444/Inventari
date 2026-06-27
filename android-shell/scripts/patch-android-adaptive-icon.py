#!/usr/bin/env python3
"""Use white adaptive-icon background behind the logo."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
ICON_BG = "#FFFFFF"

ADAPTIVE_ICON_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
"""

BACKGROUND_COLOR_XML = f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{ICON_BG}</color>
</resources>
"""


def main() -> None:
    values_dir = RES / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    (values_dir / "ic_launcher_background.xml").write_text(BACKGROUND_COLOR_XML)

    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        path = RES / "mipmap-anydpi-v26" / name
        if path.parent.is_dir():
            path.write_text(ADAPTIVE_ICON_XML)

    print("Patched adaptive icons: white @color/ic_launcher_background")


if __name__ == "__main__":
    main()
