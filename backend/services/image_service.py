import base64
import io
import numpy as np
from PIL import Image


def pil_to_base64_png(image: Image.Image) -> str:
    """
    Encode a PIL image to a lossless PNG data URI strictly in memory,
    preserving its exact original dimensions without resizing or cropping.
    """
    buffer = io.BytesIO()
    try:
        image.save(buffer, format="PNG", optimize=False)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"
    finally:
        buffer.close()


def build_amplified_difference_image(
    original: Image.Image,
    cloaked: Image.Image,
    amplification: int = 12,
) -> Image.Image:
    """
    Create a visual perturbation difference map showing |cloaked - original| * amplification,
    clipped to [0, 255] so subtle adversarial noise is clearly inspectable by human eyes.
    """
    orig_arr = np.asarray(original, dtype=np.float32)
    cloak_arr = np.asarray(cloaked, dtype=np.float32)
    diff = np.abs(cloak_arr - orig_arr) * float(amplification)
    diff_uint8 = np.clip(diff, 0.0, 255.0).astype(np.uint8)
    return Image.fromarray(diff_uint8, mode="RGB")
