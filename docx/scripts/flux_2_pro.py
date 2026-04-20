from ttapi_client import (
    build_flux_parser,
    resolve_api_key_from_args,
    resolve_output_dir,
    run_flux_job,
)


def main() -> None:
    parser = build_flux_parser("TTAPI Flux 2 Pro 生图脚本", default_mode="flux-2-pro")
    args = parser.parse_args()

    run_flux_job(
        mode=args.mode,
        prompt=args.prompt,
        api_key=resolve_api_key_from_args(args),
        size=args.size,
        aspect_ratio=args.aspect_ratio,
        output_dir=resolve_output_dir(args.output_dir),
        hook_url=args.hook_url,
        poll_interval=args.poll_interval,
        poll_attempts=args.poll_attempts,
        print_response=args.print_response,
    )


if __name__ == "__main__":
    main()
