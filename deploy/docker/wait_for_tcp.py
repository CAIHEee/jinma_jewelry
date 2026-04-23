import socket
import sys
import time


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: wait_for_tcp.py <host> <port> <timeout_seconds>", file=sys.stderr)
        return 2

    host = sys.argv[1]
    port = int(sys.argv[2])
    timeout_seconds = float(sys.argv[3])
    deadline = time.time() + timeout_seconds

    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=3):
                print(f"{host}:{port} is reachable")
                return 0
        except OSError:
            time.sleep(1)

    print(f"timeout waiting for {host}:{port}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

