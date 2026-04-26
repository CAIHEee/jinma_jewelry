import argparse
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional


DEFAULT_BASE_URL = "https://api.wuyinkeji.com"
DEFAULT_TIMEOUT = 120


def _read_api_key(cli_api_key: Optional[str]) -> str:
    api_key = cli_api_key or os.getenv("WUYIN_API_KEY")
    if api_key:
        return api_key
    raise SystemExit(
        "Missing API key. Set WUYIN_API_KEY or pass --api-key on the command line."
    )


def _ensure_dir(path: pathlib.Path) -> pathlib.Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def _default_output_dir() -> pathlib.Path:
    root = pathlib.Path(__file__).resolve().parent.parent
    return root / "outputs" / pathlib.Path(__file__).stem


def _request_json(
    *,
    url: str,
    api_key: str,
    method: str,
    payload: Optional[Dict[str, Any]] = None,
    query: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    if query:
        encoded_query = urllib.parse.urlencode(query)
        url = f"{url}?{encoded_query}"

    headers = {
        "Authorization": api_key,
        "Accept": "application/json",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} for {url}\n{body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Request failed for {url}: {exc}") from exc


def _download_file(url: str, target_path: pathlib.Path) -> pathlib.Path:
    _ensure_dir(target_path.parent)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=DEFAULT_TIMEOUT) as response:
        target_path.write_bytes(response.read())
    return target_path


def _guess_extension(url: str, fallback: str = ".png") -> str:
    suffix = pathlib.Path(urllib.parse.urlparse(url).path).suffix
    return suffix or fallback


def _extract_image_urls(response: Dict[str, Any]) -> List[str]:
    data = response.get("data") or {}
    result = data.get("result")
    if isinstance(result, list):
        return [item for item in result if isinstance(item, str) and item]
    if isinstance(result, str) and result:
        return [result]
    return []


def _status_text(status: Any) -> str:
    mapping = {
        0: "processing",
        1: "failed",
        2: "succeeded",
    }
    return mapping.get(status, f"unknown:{status}")


def generate_image(
    *,
    api_key: str,
    prompt: str,
    size: str,
    count: int,
    output_dir: pathlib.Path,
    base_url: str,
    poll_interval: int,
    poll_attempts: int,
    print_response: bool,
) -> List[pathlib.Path]:
    submit_response = _request_json(
        url=f"{base_url.rstrip('/')}/api/async/image_gpt",
        api_key=api_key,
        method="POST",
        payload={
            "prompt": prompt,
            "size": size,
            "count": str(count),
        },
    )
    if print_response:
        print("\nSubmit response")
        print(json.dumps(submit_response, ensure_ascii=False, indent=2))

    job_id = (
        submit_response.get("data", {}).get("id")
        or submit_response.get("data", {}).get("task_id")
        or submit_response.get("id")
    )
    if not job_id:
        raise SystemExit(
            "Submit succeeded but no task id was returned.\n"
            f"{json.dumps(submit_response, ensure_ascii=False, indent=2)}"
        )

    print(f"Submitted task: {job_id}")

    last_response: Dict[str, Any] = {}
    for attempt in range(1, poll_attempts + 1):
        detail_response = _request_json(
            url=f"{base_url.rstrip('/')}/api/async/detail",
            api_key=api_key,
            method="GET",
            query={"id": job_id},
        )
        last_response = detail_response
        if print_response:
            print(f"\nDetail response #{attempt}")
            print(json.dumps(detail_response, ensure_ascii=False, indent=2))

        data = detail_response.get("data") or {}
        status = data.get("status")
        image_urls = _extract_image_urls(detail_response)
        if image_urls:
            saved_paths: List[pathlib.Path] = []
            for index, image_url in enumerate(image_urls, start=1):
                extension = _guess_extension(image_url)
                filename = f"{job_id}_{index}{extension}"
                target_path = output_dir / filename
                _download_file(image_url, target_path)
                saved_paths.append(target_path)
                print(f"Image {index}: {image_url}")
                print(f"Saved to: {target_path}")
            return saved_paths

        message = data.get("message") or detail_response.get("msg") or ""
        print(
            f"[{attempt}/{poll_attempts}] waiting..."
            f" status={_status_text(status)} message={message or '-'}"
        )

        if status == 1:
            raise SystemExit(
                "Image generation failed.\n"
                f"{json.dumps(detail_response, ensure_ascii=False, indent=2)}"
            )

        time.sleep(poll_interval)

    raise SystemExit(
        "Polling timed out before any image URL was returned.\n"
        f"{json.dumps(last_response, ensure_ascii=False, indent=2)}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="五音科技中转 GPT Image 2 生图脚本"
    )
    parser.add_argument("--api-key", help="API key. Defaults to WUYIN_API_KEY env var.")
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"API base URL. Default: {DEFAULT_BASE_URL}",
    )
    parser.add_argument(
        "--prompt",
        default="一枚18K金钻石戒指产品图，白色无影背景，超写实商业棚拍，高清细节",
        help="Prompt text for generation.",
    )
    parser.add_argument(
        "--size",
        default="1:1",
        help="Image size ratio accepted by the relay, for example 1:1 or 4:3.",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1,
        help="Number of images to request. Default: 1.",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory to save generated images. Defaults to outputs/wuyinkeji_gpt_image2/.",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=3,
        help="Seconds between status polling attempts.",
    )
    parser.add_argument(
        "--poll-attempts",
        type=int,
        default=40,
        help="Maximum polling attempts before timing out.",
    )
    parser.add_argument(
        "--print-response",
        action="store_true",
        help="Print raw submit/detail responses for debugging.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    output_dir = (
        pathlib.Path(args.output_dir).expanduser().resolve()
        if args.output_dir
        else _default_output_dir()
    )
    _ensure_dir(output_dir)

    generate_image(
        api_key=_read_api_key(args.api_key),
        prompt=args.prompt,
        size=args.size,
        count=args.count,
        output_dir=output_dir,
        base_url=args.base_url,
        poll_interval=args.poll_interval,
        poll_attempts=args.poll_attempts,
        print_response=args.print_response,
    )


if __name__ == "__main__":
    main()
