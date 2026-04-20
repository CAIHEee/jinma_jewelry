import argparse
import base64
import json
import mimetypes
import os
import pathlib
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional

from PIL import Image, ImageColor


DEFAULT_TIMEOUT = 120


def _read_api_key(cli_api_key: Optional[str]) -> str:
    api_key = cli_api_key or os.getenv("TT_API_KEY")
    if api_key:
        return api_key
    raise SystemExit(
        "Missing API key. Set TT_API_KEY or pass --api-key on the command line."
    )


def _request_json(
    url: str,
    method: str,
    api_key: str,
    payload: Optional[Dict[str, Any]] = None,
    query: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    if query:
        encoded_query = urllib.parse.urlencode(query)
        url = f"{url}?{encoded_query}"

    data = None
    headers = {
        "TT-API-KEY": api_key,
        "Accept": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} for {url}\n{body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Request failed for {url}: {exc}") from exc


def _ensure_dir(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _download_file(url: str, target_path: pathlib.Path) -> pathlib.Path:
    _ensure_dir(target_path.parent)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT) as response:
        target_path.write_bytes(response.read())
    return target_path


def _read_binary_source(source: str) -> bytes:
    parsed = urllib.parse.urlparse(source)
    if parsed.scheme in {"http", "https"}:
        request = urllib.request.Request(source, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT) as response:
            return response.read()

    return pathlib.Path(source).expanduser().resolve().read_bytes()


def _image_source_to_data_uri(source: str) -> str:
    if source.startswith("data:"):
        return source

    parsed = urllib.parse.urlparse(source)
    if parsed.scheme in {"http", "https"}:
        mime_type = "image/png"
        encoded = base64.b64encode(_read_binary_source(source)).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    path = pathlib.Path(source).expanduser().resolve()
    mime_type, _ = mimetypes.guess_type(path.name)
    mime_type = mime_type or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _load_pil_image(source: str) -> Image.Image:
    image_bytes = _read_binary_source(source)
    temp = tempfile.SpooledTemporaryFile()
    temp.write(image_bytes)
    temp.seek(0)
    with Image.open(temp) as image:
        return image.convert("RGBA")


def _normalize_color(color: str) -> tuple[int, int, int, int]:
    rgba = ImageColor.getcolor(color, "RGBA")
    return rgba


def _stitch_two_images(
    image1: Image.Image,
    image2: Image.Image,
    *,
    direction: str,
    padding: int,
    background: str,
) -> Image.Image:
    bg = _normalize_color(background)
    direction = direction.lower()
    if direction not in {"up", "down", "left", "right"}:
        raise SystemExit(
            f"Unsupported stitch direction '{direction}'. Use up/down/left/right."
        )

    if direction in {"up", "down"}:
        width = max(image1.width, image2.width)
        height = image1.height + image2.height + padding
        canvas = Image.new("RGBA", (width, height), bg)
        x1 = (width - image1.width) // 2
        x2 = (width - image2.width) // 2
        if direction == "up":
            canvas.alpha_composite(image2, (x2, 0))
            canvas.alpha_composite(image1, (x1, image2.height + padding))
        else:
            canvas.alpha_composite(image1, (x1, 0))
            canvas.alpha_composite(image2, (x2, image1.height + padding))
        return canvas

    width = image1.width + image2.width + padding
    height = max(image1.height, image2.height)
    canvas = Image.new("RGBA", (width, height), bg)
    y1 = (height - image1.height) // 2
    y2 = (height - image2.height) // 2
    if direction == "left":
        canvas.alpha_composite(image2, (0, y2))
        canvas.alpha_composite(image1, (image2.width + padding, y1))
    else:
        canvas.alpha_composite(image1, (0, y1))
        canvas.alpha_composite(image2, (image1.width + padding, y2))
    return canvas


def _compose_input_images(
    sources: List[str],
    *,
    preset: str,
    background: str,
    output_dir: pathlib.Path,
) -> pathlib.Path:
    if len(sources) < 2:
        raise SystemExit("Need at least 2 input images when --compose-input-images is used.")

    images = [_load_pil_image(source) for source in sources]

    if preset == "comfy-kontext-3":
        if len(images) != 3:
            raise SystemExit(
                "--stitch-preset comfy-kontext-3 requires exactly 3 input images."
            )
        stitched = _stitch_two_images(
            images[0], images[1], direction="up", padding=8, background=background
        )
        stitched = _stitch_two_images(
            stitched, images[2], direction="right", padding=20, background=background
        )
    else:
        raise SystemExit(
            f"Unsupported stitch preset '{preset}'. Supported: comfy-kontext-3."
        )

    compose_dir = _ensure_dir(output_dir / "_composed_inputs")
    target_path = compose_dir / f"stitched_{int(time.time())}.png"
    stitched.convert("RGB").save(target_path, format="PNG")
    return target_path


def _guess_extension(url: str, fallback: str = ".png") -> str:
    suffix = pathlib.Path(urllib.parse.urlparse(url).path).suffix
    return suffix or fallback


def _default_output_dir(script_name: str) -> pathlib.Path:
    root = pathlib.Path(__file__).resolve().parent.parent
    return root / "outputs" / script_name


def _print_json(title: str, payload: Dict[str, Any]) -> None:
    print(f"\n{title}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def add_common_text_image_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--api-key", help="TTAPI key. Defaults to TT_API_KEY env var.")
    parser.add_argument(
        "--prompt",
        default="一枚高级珠宝戒指产品图，棚拍布光，18K金镶嵌钻石，白色无影背景，超写实，商业广告质感",
        help="Prompt text for image generation.",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory to save generated images. Defaults to outputs/<script-name>/",
    )
    parser.add_argument(
        "--print-response",
        action="store_true",
        help="Print raw JSON response for debugging.",
    )


def run_flux_job(
    *,
    mode: str,
    prompt: str,
    api_key: str,
    size: str,
    aspect_ratio: str,
    output_dir: pathlib.Path,
    input_images: Optional[List[str]] = None,
    compose_input_images: bool = False,
    stitch_preset: str = "comfy-kontext-3",
    stitch_background: str = "white",
    seed: Optional[int] = None,
    prompt_upsampling: Optional[bool] = None,
    output_format: Optional[str] = None,
    safety_tolerance: Optional[int] = None,
    hook_url: Optional[str] = None,
    poll_interval: int = 3,
    poll_attempts: int = 40,
    print_response: bool = False,
) -> pathlib.Path:
    payload: Dict[str, Any] = {
        "prompt": prompt,
        "mode": mode,
        "size": size,
        "aspect_ratio": aspect_ratio,
    }
    cleaned_images = [item for item in (input_images or []) if item]
    if cleaned_images:
        if compose_input_images:
            composed_path = _compose_input_images(
                cleaned_images,
                preset=stitch_preset,
                background=stitch_background,
                output_dir=output_dir,
            )
            payload["input_image"] = _image_source_to_data_uri(str(composed_path))
            print(f"Composed input image: {composed_path}")
        else:
            for index, source in enumerate(cleaned_images, start=1):
                key = "input_image" if index == 1 else f"input_image_{index}"
                payload[key] = _image_source_to_data_uri(source)
    if seed is not None:
        payload["seed"] = seed
    if prompt_upsampling is not None:
        payload["prompt_upsampling"] = prompt_upsampling
    if output_format:
        payload["output_format"] = output_format
    if safety_tolerance is not None:
        payload["safety_tolerance"] = safety_tolerance
    if hook_url:
        payload["hookUrl"] = hook_url

    submit = _request_json(
        url="https://api.ttapi.io/flux/generate",
        method="POST",
        api_key=api_key,
        payload=payload,
    )
    if print_response:
        _print_json("Flux submit response", submit)

    job_id = (
        submit.get("data", {}).get("job_id")
        or submit.get("data", {}).get("jobId")
        or submit.get("jobId")
    )
    if not job_id:
        raise SystemExit(f"Flux submit succeeded but no job id was returned: {submit}")

    print(f"Submitted Flux job: {job_id}")

    last_response: Dict[str, Any] = {}
    for attempt in range(1, poll_attempts + 1):
        result = _request_json(
            url="https://api.ttapi.io/flux/fetch",
            method="GET",
            api_key=api_key,
            query={"jobId": job_id},
        )
        last_response = result
        if print_response:
            _print_json(f"Flux fetch response #{attempt}", result)

        image_url = result.get("data", {}).get("imageUrl") or result.get("data", {}).get(
            "image_url"
        )
        if image_url:
            extension = _guess_extension(image_url, fallback=".webp")
            filename = f"{mode}_{job_id}{extension}"
            target_path = output_dir / filename
            _download_file(image_url, target_path)
            print(f"Image URL: {image_url}")
            print(f"Saved to: {target_path}")
            return target_path

        status = result.get("status", "UNKNOWN")
        message = result.get("message", "")
        print(
            f"[{attempt}/{poll_attempts}] waiting for Flux result..."
            f" status={status} message={message or '-'}"
        )
        time.sleep(poll_interval)

    raise SystemExit(
        "Flux polling timed out before imageUrl was returned.\n"
        f"Last response:\n{json.dumps(last_response, ensure_ascii=False, indent=2)}"
    )


def run_gemini_image_job(
    *,
    model: str,
    prompt: str,
    api_key: str,
    output_dir: pathlib.Path,
    refer_images: Optional[Iterable[str]] = None,
    aspect_ratio: str = "1:1",
    image_size: str = "1K",
    google_search: str = "false",
    image_search: str = "false",
    thinking_level: str = "Minimal",
    print_response: bool = False,
) -> pathlib.Path:
    payload: Dict[str, Any] = {
        "prompt": prompt,
        "model": model,
        "aspect_ratio": aspect_ratio,
        "image_size": image_size,
        "google_search": google_search,
        "image_search": image_search,
        "thinking_level": thinking_level,
    }
    cleaned_images = [item for item in (refer_images or []) if item]
    if cleaned_images:
        payload["refer_images"] = cleaned_images

    response = _request_json(
        url="https://api.ttapi.org/gemini/image/generate",
        method="POST",
        api_key=api_key,
        payload=payload,
    )
    if print_response:
        _print_json("Nano Banana response", response)

    image_url = response.get("data", {}).get("image_url")
    if not image_url:
        raise SystemExit(
            "Nano Banana request completed but no image_url was returned.\n"
            f"{json.dumps(response, ensure_ascii=False, indent=2)}"
        )

    extension = _guess_extension(image_url)
    filename = f"{model.replace('.', '_')}{extension}"
    target_path = output_dir / filename
    _download_file(image_url, target_path)
    print(f"Image URL: {image_url}")
    print(f"Saved to: {target_path}")
    return target_path


def build_flux_parser(description: str, default_mode: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    add_common_text_image_args(parser)
    parser.add_argument("--mode", default=default_mode, help="Flux mode parameter.")
    parser.add_argument("--size", default="1024x1024", help="Flux size parameter.")
    parser.add_argument(
        "--aspect-ratio", default="1:1", help="Flux aspect_ratio parameter."
    )
    parser.add_argument("--hook-url", help="Optional webhook URL.")
    parser.add_argument(
        "--input-image",
        action="append",
        default=[],
        help=(
            "Reference or edit image. Repeat this option for multiple images. "
            "Accepts local paths, http(s) URLs, or data URIs."
        ),
    )
    parser.add_argument(
        "--compose-input-images",
        action="store_true",
        help=(
            "Compose multiple --input-image values locally into one image before upload. "
            "Useful for matching a ComfyUI ImageStitch workflow."
        ),
    )
    parser.add_argument(
        "--stitch-preset",
        default="comfy-kontext-3",
        help="Local composition preset. Default: comfy-kontext-3.",
    )
    parser.add_argument(
        "--stitch-background",
        default="white",
        help="Background color for local image composition. Example: white or #FFFFFF.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Optional seed for models/endpoints that support deterministic edits.",
    )
    parser.add_argument(
        "--prompt-upsampling",
        choices=["true", "false"],
        help="Optional prompt_upsampling parameter for endpoints that support it.",
    )
    parser.add_argument(
        "--output-format",
        help="Optional output format, for example png or jpeg.",
    )
    parser.add_argument(
        "--safety-tolerance",
        type=int,
        help="Optional safety_tolerance parameter if supported by the endpoint.",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=3,
        help="Seconds between Flux fetch polling attempts.",
    )
    parser.add_argument(
        "--poll-attempts",
        type=int,
        default=40,
        help="Maximum number of Flux fetch attempts.",
    )
    return parser


def build_gemini_parser(description: str, default_model: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    add_common_text_image_args(parser)
    parser.add_argument("--model", default=default_model, help="Nano Banana model name.")
    parser.add_argument(
        "--refer-image",
        action="append",
        default=[],
        help="Repeat this option to pass one or more reference image URLs.",
    )
    parser.add_argument(
        "--aspect-ratio",
        default="1:1",
        help="Supported values depend on the model. Example: 1:1, 3:4, 16:9.",
    )
    parser.add_argument(
        "--image-size",
        default="1K",
        help="Nano Banana image_size parameter. Example: 1K.",
    )
    parser.add_argument(
        "--google-search",
        default="false",
        help="Nano Banana google_search parameter.",
    )
    parser.add_argument(
        "--image-search",
        default="false",
        help="Nano Banana image_search parameter.",
    )
    parser.add_argument(
        "--thinking-level",
        default="Minimal",
        help="Nano Banana thinking_level parameter.",
    )
    return parser


def resolve_output_dir(output_dir_arg: Optional[str]) -> pathlib.Path:
    script_name = pathlib.Path(sys.argv[0]).stem
    output_dir = (
        pathlib.Path(output_dir_arg).expanduser().resolve()
        if output_dir_arg
        else _default_output_dir(script_name)
    )
    return _ensure_dir(output_dir)


def resolve_api_key_from_args(args: argparse.Namespace) -> str:
    return _read_api_key(getattr(args, "api_key", None))
