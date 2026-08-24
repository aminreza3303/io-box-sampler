"""Safe end-to-end booking-flow simulation for Shati Flight.

This intentionally uses an in-memory mock provider. It exercises the same
request sequence as the documented API without sending reserve requests to
Shati or creating orders.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass, asdict
from datetime import date, timedelta


ROUTES = [
    ("MHD", "THR"),
    ("THR", "MCT"),
    ("MHD", "MCT"),
    ("THR", "BGW"),
    ("THR", "IST"),
]

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

CONTACT = {
    "full_name": "Test Passenger",
    "country_iso2": "IR",
    "mobile": "+989000000000",
    "email": "load-test@example.invalid",
}


@dataclass
class MockTicket:
    id: str
    origin: str
    destination: str
    total_price: str = "138000000"
    currency_code: str = "IRR"


class MockShati:
    def __init__(self) -> None:
        self.orders: dict[str, dict] = {}
        self.sequence = 0

    def search(self, origin: str, destination: str, departure_date: str) -> list[MockTicket]:
        return [
            MockTicket(f"mock-ticket-{origin}-{destination}-1", origin, destination),
            MockTicket(f"mock-ticket-{origin}-{destination}-2", origin, destination, "151000000"),
        ]

    def min_price(self, origin: str, destination: str, departure_date: str) -> dict:
        return {"amount": "138000000", "currency_code": "IRR", "departure_date": departure_date}

    def pre_reserve(self, ticket: MockTicket) -> dict:
        self.sequence += 1
        order_id = f"mock-order-{self.sequence:05d}"
        order = {"id": order_id, "status": "pending", "ticket": asdict(ticket)}
        self.orders[order_id] = order
        return order

    def passenger_details(self, order_id: str, passenger: dict, contact: dict) -> dict:
        order = self.orders[order_id]
        order["passenger"] = passenger
        order["contact"] = contact
        return {"code": "200", "data": []}

    def reserve(self, order_id: str) -> dict:
        order = self.orders[order_id]
        order["status"] = "confirmed"
        order["pnr"] = f"MOCK{order_id[-5:]}"
        return order

    def info(self, order_id: str) -> dict:
        return self.orders[order_id]


def run_route(api: MockShati, origin: str, destination: str, departure_date: str) -> dict:
    started = time.perf_counter()
    tickets = api.search(origin, destination, departure_date)
    price = api.min_price(origin, destination, departure_date)
    selected = tickets[0]
    order = api.pre_reserve(selected)
    api.passenger_details(order["id"], PASSENGER, CONTACT)
    reserved = api.reserve(order["id"])
    latest = api.info(order["id"])
    return {
        "route": f"{origin} → {destination}",
        "search_results": len(tickets),
        "min_price": price,
        "order_id": reserved["id"],
        "status": latest["status"],
        "pnr": latest["pnr"],
        "elapsed_ms": round((time.perf_counter() - started) * 1000, 3),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Shati booking flow locally without external requests.")
    parser.add_argument("--repeat", type=int, default=1, help="Number of mock bookings per route")
    args = parser.parse_args()
    if args.repeat < 1 or args.repeat > 1000:
        raise SystemExit("repeat must be between 1 and 1000")

    departure_date = (date.today() + timedelta(days=7)).isoformat()
    api = MockShati()
    results = []
    for _ in range(args.repeat):
        for origin, destination in ROUTES:
            results.append(run_route(api, origin, destination, departure_date))

    print(json.dumps({
        "mode": "local-mock-only",
        "external_requests": 0,
        "routes": [f"{origin} → {destination}" for origin, destination in ROUTES],
        "bookings_simulated": len(results),
        "confirmed": sum(item["status"] == "confirmed" for item in results),
        "passenger": {"birthday": PASSENGER["birthday"], "passport_expire_date": PASSENGER["passport_expire_date"]},
        "results": results,
    }, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
