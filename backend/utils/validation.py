import io
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_PIXELS = 40_000_000  # 40 MP DecompressionBomb protection
MIN_DIMENSION = 32
MAX_DIMENSION = 8192

ALLOWED_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}

ALLOWED_PIL_FORMATS = {"PNG", "JPEG", "WEBP"}

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


async def validate_and_load_image(file: UploadFile) -> tuple[Image.Image, bytes]:
    """
    Safely validate uploaded image bytes in memory without writing to disk.
    Checks content type, non-empty payload, 10 MB max size, Pillow format verification,
    and safe image dimensions.
    """
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="No image file was provided.")

    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported image format '{file.content_type}'. Allowed formats: PNG, JPEG, WebP.",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        size_mb = len(raw_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"Image size ({size_mb:.2f} MB) exceeds the 10 MB upload limit.",
        )

    try:
        # Verify integrity first
        with Image.open(io.BytesIO(raw_bytes)) as probe:
            fmt = (probe.format or "").upper()
            if fmt not in ALLOWED_PIL_FORMATS:
                raise HTTPException(
                    status_code=415,
                    detail=f"Invalid image container format '{fmt}'. Only PNG, JPEG, and WebP are accepted.",
                )
            probe.verify()

        # Re-open cleanly for pixel decoding
        img = Image.open(io.BytesIO(raw_bytes))
        img.load()
    except HTTPException:
        raise
    except Image.DecompressionBombError:
        raise HTTPException(
            status_code=413,
            detail="Image resolution is too large to process safely (exceeds maximum pixel limit).",
        )
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Corrupted or unreadable image file: {exc}",
        )

    width, height = img.size
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions ({width}x{height}) are too small. Minimum size is {MIN_DIMENSION}x{MIN_DIMENSION} px.",
        )
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Image dimensions ({width}x{height}) exceed the maximum supported dimension ({MAX_DIMENSION} px).",
        )

    # Convert palette / RGBA / grayscale safely to RGB
    rgb_image = img.convert("RGB")
    return rgb_image, raw_bytes
