"""
Temir Daftar ilovasi uchun logotip generatsiya qiluvchi skript.
Ishlatish: python3 scripts/generate-logo.py
Chiqish: mobile/assets/images/ ichidagi icon.png, splash-icon.png,
favicon.png va android adaptive ikonkalar.
"""
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("PIL topilmadi. O'rnatish: pip install Pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "assets", "images")

INDIGO = (79, 70, 229)        # #4F46E5 — ilova brend rangi
INDIGO_DARK = (67, 56, 202)   # #4338CA
WHITE = (255, 255, 255)


def load_font(size):
    """Mavjud tizim shriftlaridan qalin (bold) shrift yuklaydi."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_t_icon(radius_ratio=0.22, letter_ratio=0.62):
    """
    Brend uslubidagi T-ikonka: indigo gradient kvadrat (yumaloq burchak),
    oq qalin T harfi. 1024x1024 asosda chiziladi.
    """
    base = 1024
    img = Image.new("RGBA", (base, base), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient fon (yuqoridan pastga: indigo -> to'q indigo)
    gradient = Image.new("RGBA", (base, base))
    gdraw = ImageDraw.Draw(gradient)
    for y in range(base):
        t = y / base
        color = tuple(
            int(INDIGO[i] + (INDIGO_DARK[i] - INDIGO[i]) * t) for i in range(3)
        ) + (255,)
        gdraw.line([(0, y), (base, y)], fill=color)

    # Yumaloq burchakli kvadrat mask
    mask = Image.new("L", (base, base), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [0, 0, base - 1, base - 1], radius=int(base * radius_ratio), fill=255
    )
    img.paste(gradient, (0, 0), mask)

    # Oq T harfi — markazda
    font = load_font(int(base * letter_ratio))
    bbox = draw.textbbox((0, 0), "T", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (base - tw) / 2 - bbox[0]
    y = (base - th) / 2 - bbox[1]
    draw.text((x, y), "T", font=font, fill=WHITE)

    return img


def make_adaptive_foreground(icon):
    """
    Android adaptive foreground: T harfi faqat markaziy 66% xavfsiz zonada
    bo'lishi kerak. Shuning uchun ikonkani kichraytirib, shaffof canvasga joylaymiz.
    """
    base = 1024
    canvas = Image.new("RGBA", (base, base), (0, 0, 0, 0))
    inner = int(base * 0.62)
    resized = icon.resize((inner, inner), Image.LANCZOS)
    offset = (base - inner) // 2
    canvas.paste(resized, (offset, offset), resized)
    return canvas


def main():
    os.makedirs(IMAGES, exist_ok=True)
    icon = draw_t_icon()

    # 1. Asosiy ikonka (iOS + Android legacy)
    icon.resize((1024, 1024), Image.LANCZOS).save(
        os.path.join(IMAGES, "icon.png")
    )

    # 2. Android adaptive foreground (logo xavfsiz zonada)
    make_adaptive_foreground(icon).save(
        os.path.join(IMAGES, "android-icon-foreground.png")
    )

    # 3. Android adaptive background — bir rangli indigo
    bg = Image.new("RGBA", (1024, 1024), INDIGO + (255,))
    bg.save(os.path.join(IMAGES, "android-icon-background.png"))

    # 4. Android monochrome (oq T, shaffof fon)
    font = load_font(640)
    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mono)
    bbox = mdraw.textbbox((0, 0), "T", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    mdraw.text(
        ((1024 - tw) / 2 - bbox[0], (1024 - th) / 2 - bbox[1]),
        "T",
        font=font,
        fill=(255, 255, 255, 255),
    )
    mono.save(os.path.join(IMAGES, "android-icon-monochrome.png"))

    # 5. Splash ikonka — yumaloq burchakli ikonka, shaffof fon
    splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    inner = 560
    resized = icon.resize((inner, inner), Image.LANCZOS)
    splash.paste(resized, ((1024 - inner) // 2, (1024 - inner) // 2), resized)
    splash.save(os.path.join(IMAGES, "splash-icon.png"))

    # 6. Favicon (web) — 48x48
    icon.resize((48, 48), Image.LANCZOS).save(
        os.path.join(IMAGES, "favicon.png")
    )

    print("✅ Logotip fayllari yaratildi:")
    for f in [
        "icon.png",
        "android-icon-foreground.png",
        "android-icon-background.png",
        "android-icon-monochrome.png",
        "splash-icon.png",
        "favicon.png",
    ]:
        path = os.path.join(IMAGES, f)
        print(f"   {f} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()
