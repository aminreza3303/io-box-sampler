"""Safe local reserve-load simulation.

This script never calls Shati. It validates a passenger payload and simulates
reserve responses in memory, because the real reserve endpoint creates orders
and requires a real order_id from pre-reserve.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from datetime import date


PASSENGER = {
    "type": "adult",
    "first_name": "Test",
    "last_name": "Passenger",
    "gender": "male",
    "birthday": "2000-10-01",
    "nationality": "IR",
    "passport_number": "A110709",
    "passport_expire_date": "2027-12-31",
    "passport_issue_country": "IR",
}


def validate_passenger(passenger: dict) -> list[str]:
    errors = []
    required = (
        "type", "first_name", "last_name", "gender", "birthday",
        "nationality", "passport_number", "passport_expire_date",
        "passport_issue_country",
    )
    errors.extend(f"missing:{field}" for field in required if not passenger.get(field))
    try:
        birthday = date.fromisoformat(passenger["birthday"])
        expiry = date.fromisoformat(passenger["passport_expire_date"])
        if birthday >= date.today():
            errors.append("birthday_must_be_in_the_past")
        if expiry <= date.today():
            errors.append("passport_must_not_be_expired")
    except (KeyError, ValueError):
        errors.append("invalid_date_format")
    if len(passenger.get("nationality", "")) != 2:
        errors.append("nationality_must_be_iso2")
    if len(passenger.get("passport_issue_country", "")) != 2:
        errors.append("passport_issue_country_must_be_iso2")
    return errors


def simulate_reserve(index: int, order_id: str) -> dict:
    started = time.perf_counter()
    # In-memory stand-in for a successful reserve response.
    response = {
        "code": "200",
        "status": "confirmed",
        "order_id": order_id,
        "request_index": index,
    }
    response["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
    return response


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a safe, local reserve-load simulation.")
    parser.add_argument("--count", type=int, default=1000)
    parser.add_argument("--duration", type=int, default=60, help="Target test window in seconds")
    args = parser.parse_args()

    if args.count < 1 or args.count > 1000:
        raise SystemExit("count must be between 1 and 1000")
    if args.duration < 1:
        raise SystemExit("duration must be at least 1 second")

    errors = validate_passenger(PASSENGER)
    if errors:
        print(json.dumps({"valid": False, "errors": errors}, indent=2))
        return 1

    results = [simulate_reserve(index, f"mock-order-{index:04d}") for index in range(args.count)]
    latencies = [item["latency_ms"] for item in results]
    summary = {
        "mode": "local-mock-only",
        "external_requests": 0,
        "simulated_reserves": len(results),
        "target_rate_per_minute": round(args.count / args.duration * 60, 2),
        "passenger": {"type": PASSENGER["type"], "birthday": PASSENGER["birthday"], "passport_expire_date": PASSENGER["passport_expire_date"]},
        "status_counts": {"confirmed": len(results)},
        "latency_ms": {"p50": round(statistics.median(latencies), 3), "max": round(max(latencies), 3)},
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
