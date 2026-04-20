from ttapi_client import (
    build_flux_parser,
    resolve_api_key_from_args,
    resolve_output_dir,
    run_flux_job,
)


def main() -> None:
    parser = build_flux_parser(
        "TTAPI Flux Kontext Max 生图脚本",
        default_mode="flux-kontext-max",
    )
    args = parser.parse_args()

    run_flux_job(
        mode=args.mode,
        prompt=args.prompt,
        api_key=resolve_api_key_from_args(args),
        size=args.size,
        aspect_ratio=args.aspect_ratio,
        output_dir=resolve_output_dir(args.output_dir),
        input_images=args.input_image,
        compose_input_images=args.compose_input_images,
        stitch_preset=args.stitch_preset,
        stitch_background=args.stitch_background,
        seed=args.seed,
        prompt_upsampling=(
            None
            if args.prompt_upsampling is None
            else args.prompt_upsampling == "true"
        ),
        output_format=args.output_format,
        safety_tolerance=args.safety_tolerance,
        hook_url=args.hook_url,
        poll_interval=args.poll_interval,
        poll_attempts=args.poll_attempts,
        print_response=args.print_response,
    )


if __name__ == "__main__":
    main()
