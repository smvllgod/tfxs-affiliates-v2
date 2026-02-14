from PIL import Image, ImageDraw, ImageFont

def make_shield_logo(size):
    scale = size / 200.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Red glow ellipse
    cx, cy = 100*scale, 95*scale
    rx, ry = 50*scale, 55*scale
    draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=(220, 38, 38, 15))

    # Shield polygon points
    shield_points = [(100*scale, 25*scale), (155*scale, 55*scale), (155*scale, 110*scale)]
    for t in [i/20.0 for i in range(1, 21)]:
        x = (1-t)**3*155 + 3*(1-t)**2*t*155 + 3*(1-t)*t**2*130 + t**3*100
        y = (1-t)**3*110 + 3*(1-t)**2*t*140 + 3*(1-t)*t**2*160 + t**3*175
        shield_points.append((x*scale, y*scale))
    for t in [i/20.0 for i in range(1, 21)]:
        x = (1-t)**3*100 + 3*(1-t)**2*t*70 + 3*(1-t)*t**2*45 + t**3*45
        y = (1-t)**3*175 + 3*(1-t)**2*t*160 + 3*(1-t)*t**2*140 + t**3*110
        shield_points.append((x*scale, y*scale))
    shield_points.append((45*scale, 55*scale))

    # Red gradient fill via masked gradient image
    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(gradient)
    for y in range(size):
        ratio = y / size
        r = int(239 * (1 - ratio) + 153 * ratio)
        g = int(68 * (1 - ratio) + 27 * ratio)
        b = int(68 * (1 - ratio) + 27 * ratio)
        grad_draw.line([(0, y), (size, y)], fill=(r, g, b, 230))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(shield_points, fill=255)
    gradient.putalpha(mask)
    img = Image.alpha_composite(img, gradient)
    draw = ImageDraw.Draw(img)

    # Glass overlay (inner shield)
    glass_points = [(100*scale, 30*scale), (150*scale, 57*scale), (150*scale, 110*scale)]
    for t in [i/20.0 for i in range(1, 21)]:
        x = (1-t)**3*150 + 3*(1-t)**2*t*150 + 3*(1-t)*t**2*127 + t**3*100
        y = (1-t)**3*110 + 3*(1-t)**2*t*137 + 3*(1-t)*t**2*155 + t**3*170
        glass_points.append((x*scale, y*scale))
    for t in [i/20.0 for i in range(1, 21)]:
        x = (1-t)**3*100 + 3*(1-t)**2*t*73 + 3*(1-t)*t**2*50 + t**3*50
        y = (1-t)**3*170 + 3*(1-t)**2*t*155 + 3*(1-t)*t**2*137 + t**3*110
        glass_points.append((x*scale, y*scale))
    glass_points.append((50*scale, 57*scale))
    glass = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glass_draw = ImageDraw.Draw(glass)
    for y in range(size):
        ratio = y / size
        alpha = int(38 * (1 - ratio) + 5 * ratio)
        glass_draw.line([(0, y), (size, y)], fill=(255, 255, 255, alpha))
    glass_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(glass_mask).polygon(glass_points, fill=255)
    glass.putalpha(glass_mask)
    img = Image.alpha_composite(img, glass)
    draw = ImageDraw.Draw(img)

    # Gold triangle outline
    tri = [(100*scale, 60*scale), (130*scale, 110*scale), (70*scale, 110*scale)]
    sw = max(1, int(2.5 * scale))
    draw.polygon(tri, fill=(251, 191, 36, 25), outline=(251, 191, 36, 230))
    for o in range(sw):
        s = o * 0.5
        pts = [(100*scale, (60+s)*scale), ((130-s*0.6)*scale, (110-s*0.3)*scale), ((70+s*0.6)*scale, (110-s*0.3)*scale)]
        draw.polygon(pts, outline=(251, 191, 36, 230))

    # Inner triangle subtle fill
    tri_in = [(100*scale, 70*scale), (122*scale, 105*scale), (78*scale, 105*scale)]
    draw.polygon(tri_in, fill=(251, 191, 36, 25))

    # Text
    fs1 = max(10, int(16 * scale))
    fs2 = max(8, int(8 * scale))
    try:
        f1 = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", fs1)
    except Exception:
        f1 = ImageFont.load_default()
    try:
        f2 = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", fs2)
    except Exception:
        f2 = ImageFont.load_default()

    bb = draw.textbbox((0, 0), "TFXS", font=f1)
    tw = bb[2] - bb[0]
    draw.text((100*scale - tw/2, 145*scale - fs1), "TFXS", fill=(255, 255, 255, 230), font=f1)

    bb2 = draw.textbbox((0, 0), "AFFILIATES", font=f2)
    aw = bb2[2] - bb2[0]
    draw.text((100*scale - aw/2, 192*scale - fs2), "AFFILIATES", fill=(156, 163, 175, 200), font=f2)

    return img

base = "/Users/jordan/Desktop/TFXS Affiliates/assets"
make_shield_logo(512).save(f"{base}/icon-512.png", "PNG")
make_shield_logo(192).save(f"{base}/icon-192.png", "PNG")
print("Done! icon-512.png and icon-192.png generated.")
