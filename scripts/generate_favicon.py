import os
from PIL import Image
import numpy as np

def generate_favicons():
    workspace = r"C:\Users\admin\OneDrive\Desktop\dormex"
    src_dir = os.path.join(workspace, "docs", "stitch_dormex_hostel_allocation_platform", "dormex_hostel_brand_identity_board.png")
    
    # Check if directory or file
    if os.path.isdir(src_dir):
        src_image = os.path.join(src_dir, "screen.png")
    else:
        src_image = src_dir

    if not os.path.exists(src_image):
        raise FileNotFoundError(f"Source image not found at {src_image}")

    print(f"Loading source brand identity board from: {src_image}")
    board = Image.open(src_image).convert("RGBA")

    # Box 03 on board:
    # Coordinates for the high-rise architectural D symbol logomark
    crop_box = (1250 + 40, 80 + 18, 1250 + 204, 80 + 183)
    sym_raw = board.crop(crop_box)

    # Clean transparency extraction
    bg_color = np.array([250.0, 248.0, 244.0])
    arr = np.array(sym_raw, dtype=float)
    rgb = arr[:, :, :3]
    dist = np.linalg.norm(rgb - bg_color, axis=2)

    # Smooth anti-aliased alpha falloff
    alpha = np.clip((dist - 14.0) / (38.0 - 14.0) * 255.0, 0, 255).astype(np.uint8)

    res_arr = np.zeros((sym_raw.height, sym_raw.width, 4), dtype=np.uint8)
    res_arr[:, :, :3] = np.array(sym_raw)[:, :, :3]
    res_arr[:, :, 3] = alpha

    sym_rgba = Image.fromarray(res_arr, "RGBA")
    bbox = sym_rgba.getbbox()
    sym_tight = sym_rgba.crop(bbox)
    print(f"Extracted tight symbol size: {sym_tight.size}")

    def make_square_icon(size: int, padding_ratio: float = 0.08) -> Image.Image:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        avail_size = int(size * (1.0 - 2.0 * padding_ratio))
        avail_size = max(1, avail_size)
        
        # Scale symbol while maintaining aspect ratio
        w, h = sym_tight.size
        scale = avail_size / max(w, h)
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        
        resized = sym_tight.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (size - new_w) // 2
        offset_y = (size - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    public_dir = os.path.join(workspace, "public")
    os.makedirs(public_dir, exist_ok=True)

    # Generate icons of various sizes
    icon_512 = make_square_icon(512)
    icon_192 = make_square_icon(192)
    icon_180 = make_square_icon(180)
    icon_48 = make_square_icon(48, padding_ratio=0.04)
    icon_32 = make_square_icon(32, padding_ratio=0.04)
    icon_16 = make_square_icon(16, padding_ratio=0.02)

    # Save PNG formats
    icon_512.save(os.path.join(public_dir, "icon-512.png"), "PNG")
    icon_192.save(os.path.join(public_dir, "icon-192.png"), "PNG")
    icon_180.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    icon_32.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
    icon_32.save(os.path.join(public_dir, "favicon.png"), "PNG")
    icon_16.save(os.path.join(public_dir, "favicon-16x16.png"), "PNG")

    # Save multi-size favicon.ico (16, 32, 48)
    ico_path = os.path.join(public_dir, "favicon.ico")
    icon_32.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)]
    )

    print("Successfully generated all favicon assets in public/:")
    for f in os.listdir(public_dir):
        if "icon" in f or "favicon" in f:
            print(f" - public/{f}")

if __name__ == "__main__":
    generate_favicons()
