from ttapi_client import (
    build_gemini_parser,
    resolve_api_key_from_args,
    resolve_output_dir,
    run_gemini_image_job,
)


def main() -> None:
    parser = build_gemini_parser(
        "TTAPI Nano Banana Pro 生图脚本",
        default_model="gemini-3-pro-image-preview",
    )
    args = parser.parse_args()

    run_gemini_image_job(
        model=args.model,
        prompt=args.prompt,
        api_key=resolve_api_key_from_args(args),
        output_dir=resolve_output_dir(args.output_dir),
        refer_images=args.refer_image,
        aspect_ratio=args.aspect_ratio,
        image_size=args.image_size,
        google_search=args.google_search,
        image_search=args.image_search,
        thinking_level=args.thinking_level,
        print_response=args.print_response,
    )


if __name__ == "__main__":
    main()
