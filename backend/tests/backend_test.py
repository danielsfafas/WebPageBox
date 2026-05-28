"""
Boxing Gym API - Comprehensive backend tests.
Hits the public REACT_APP_BACKEND_URL endpoints with /api prefix.
"""
import os
import uuid
import time
import base64
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@boxinggym.com"
ADMIN_PASSWORD = "admin123"

PNG_1x1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def auth(session, token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# Tracks created ids so we can cleanup
created = {"products": [], "packages": [], "subscribers": [], "events": [], "messages": [], "payments": []}


# ---------- AUTH ----------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["token"], str) and len(d["token"]) > 10
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        assert "password_hash" not in d["user"]

    def test_login_invalid_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_token(self, auth):
        r = auth.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- PUBLIC ----------
class TestPublic:
    def test_settings(self, session):
        r = session.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        assert d.get("id") == "main"
        assert d.get("gym_name")

    def test_products_list(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_packages_list(self, session):
        r = session.get(f"{API}/packages")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_events_list(self, session):
        r = session.get(f"{API}/events")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_contact_submit(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "TEST_Contact",
            "email": "test_contact@example.com",
            "phone": "555",
            "message": "Hola, quiero info",
        })
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- ADMIN PRODUCTS ----------
class TestProducts:
    def test_crud(self, auth):
        # CREATE
        r = auth.post(f"{API}/admin/products", json={
            "name": "TEST_Guantes",
            "description": "Guantes de boxeo",
            "category": "guantes",
            "price": 99.5,
            "stock": 10,
            "images": [PNG_1x1],
            "tags": ["boxeo"],
            "active": True,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        pid = d["id"]
        created["products"].append(pid)
        assert d["name"] == "TEST_Guantes"
        assert "_id" not in d

        # LIST
        r = auth.get(f"{API}/admin/products")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # PUBLIC LIST (active)
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # UPDATE
        r = auth.put(f"{API}/admin/products/{pid}", json={
            "name": "TEST_Guantes2", "description": "x", "category": "c",
            "price": 120.0, "stock": 5, "images": [], "tags": [], "active": True,
        })
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Guantes2"
        assert r.json()["price"] == 120.0

        # DELETE
        r = auth.delete(f"{API}/admin/products/{pid}")
        assert r.status_code == 200
        # Verify deleted
        r = auth.put(f"{API}/admin/products/{pid}", json={"name": "x"})
        assert r.status_code in (404, 422)
        created["products"].remove(pid)

    def test_admin_requires_auth(self, session):
        r = session.get(f"{API}/admin/products")
        assert r.status_code == 401


# ---------- ADMIN PACKAGES ----------
class TestPackages:
    @pytest.fixture(scope="class")
    def pkg(self, auth):
        r = auth.post(f"{API}/admin/packages", json={
            "name": "TEST_Mensual",
            "description": "Plan mensual",
            "inscription_cost": 50.0,
            "monthly_cost": 80.0,
            "duration": "monthly",
            "duration_days": 30,
            "benefits": ["acceso", "clases"],
            "active": True,
        })
        assert r.status_code == 200
        d = r.json()
        created["packages"].append(d["id"])
        yield d
        auth.delete(f"{API}/admin/packages/{d['id']}")

    def test_create_and_list(self, auth, pkg):
        r = auth.get(f"{API}/admin/packages")
        assert r.status_code == 200
        assert any(p["id"] == pkg["id"] for p in r.json())

    def test_update(self, auth, pkg):
        r = auth.put(f"{API}/admin/packages/{pkg['id']}", json={
            "name": "TEST_Mensual2", "description": "y", "inscription_cost": 50.0,
            "monthly_cost": 90.0, "duration": "monthly", "duration_days": 30,
            "benefits": [], "active": True,
        })
        assert r.status_code == 200
        assert r.json()["monthly_cost"] == 90.0

    def test_analytics(self, auth, pkg):
        r = auth.get(f"{API}/admin/packages/{pkg['id']}/analytics")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_subscribers", "active_subscribers", "inactive_subscribers", "total_revenue", "total_payments"]:
            assert k in d


# ---------- ADMIN SUBSCRIBERS + Progress + Media + Payments ----------
class TestSubscribers:
    @pytest.fixture(scope="class")
    def pkg(self, auth):
        r = auth.post(f"{API}/admin/packages", json={
            "name": "TEST_PkgSub", "description": "", "inscription_cost": 30.0,
            "monthly_cost": 60.0, "duration": "monthly", "duration_days": 30,
            "benefits": [], "active": True,
        })
        assert r.status_code == 200
        d = r.json()
        yield d
        auth.delete(f"{API}/admin/packages/{d['id']}")

    @pytest.fixture(scope="class")
    def sub(self, auth, pkg):
        r = auth.post(f"{API}/admin/subscribers", json={
            "full_name": "TEST_Subscriber",
            "phone": "555",
            "email": "test_sub@example.com",
            "package_id": pkg["id"],
            "active": True,
            "fitness_goal": "perder peso",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        yield d
        auth.delete(f"{API}/admin/subscribers/{d['id']}")

    def test_enriched_initial(self, auth, sub):
        # No payments yet
        assert sub["payment_status"] in ("unknown",)
        r = auth.get(f"{API}/admin/subscribers/{sub['id']}")
        assert r.status_code == 200
        d = r.json()
        for k in ["payment_status", "progress_records", "media", "payments", "package"]:
            assert k in d
        assert d["package"]["name"] == "TEST_PkgSub"

    def test_progress(self, auth, sub):
        r = auth.post(f"{API}/admin/subscribers/{sub['id']}/progress", json={
            "weight_kg": 80.5,
            "chest_cm": 100,
            "waist_cm": 90,
            "notes": "inicial",
        })
        assert r.status_code == 200, r.text
        rec = r.json()
        assert "id" in rec
        assert rec["weight_kg"] == 80.5
        # verify in GET
        r = auth.get(f"{API}/admin/subscribers/{sub['id']}")
        assert any(p["id"] == rec["id"] for p in r.json()["progress_records"])
        # delete
        r = auth.delete(f"{API}/admin/subscribers/{sub['id']}/progress/{rec['id']}")
        assert r.status_code == 200

    def test_media(self, auth, sub):
        r = auth.post(f"{API}/admin/subscribers/{sub['id']}/media", json={
            "type": "image",
            "data": PNG_1x1,
            "note": "antes",
        })
        assert r.status_code == 200
        m = r.json()
        assert m["id"]
        r = auth.delete(f"{API}/admin/subscribers/{sub['id']}/media/{m['id']}")
        assert r.status_code == 200

    def test_payment_monthly_and_status(self, auth, sub):
        # Create monthly payment with payment_date in past (more than 30 days back to make overdue)
        past = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
        r = auth.post(f"{API}/admin/payments", json={
            "subscriber_id": sub["id"],
            "amount": 60.0,
            "method": "cash",
            "payment_date": past,
            "period_days": 30,
            "notes": "test pago",
            "type": "monthly",
        })
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["next_due_date"] is not None  # computed for monthly
        # Status should be overdue now
        r = auth.get(f"{API}/admin/subscribers/{sub['id']}")
        assert r.status_code == 200
        assert r.json()["payment_status"] == "overdue"

        # Inscription payment should NOT set next_due_date
        r = auth.post(f"{API}/admin/payments", json={
            "subscriber_id": sub["id"],
            "amount": 30.0,
            "method": "cash",
            "type": "inscription",
        })
        assert r.status_code == 200
        assert r.json()["next_due_date"] is None

        # Recent monthly -> valid
        recent = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        r = auth.post(f"{API}/admin/payments", json={
            "subscriber_id": sub["id"],
            "amount": 60.0,
            "method": "transfer",
            "payment_date": recent,
            "period_days": 30,
            "type": "monthly",
        })
        assert r.status_code == 200
        r = auth.get(f"{API}/admin/subscribers/{sub['id']}")
        assert r.json()["payment_status"] == "valid"

        # Payments list has subscriber_name
        r = auth.get(f"{API}/admin/payments")
        assert r.status_code == 200
        mine = [p for p in r.json() if p.get("subscriber_id") == sub["id"]]
        assert len(mine) >= 3
        assert all("subscriber_name" in p for p in mine)
        assert mine[0]["subscriber_name"] == "TEST_Subscriber"


# ---------- ADMIN EVENTS ----------
class TestEvents:
    def test_crud(self, auth):
        r = auth.post(f"{API}/admin/events", json={
            "title": "TEST_Pelea",
            "type": "fight",
            "date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "location": "Arena",
            "description": "noche",
            "active": True,
            "priority": 1,
        })
        assert r.status_code == 200
        eid = r.json()["id"]
        # list (public)
        r2 = requests.get(f"{API}/events")
        assert r2.status_code == 200
        assert any(e["id"] == eid for e in r2.json())
        # update
        r = auth.put(f"{API}/admin/events/{eid}", json={
            "title": "TEST_Pelea2", "type": "fight",
            "date": (datetime.now(timezone.utc) + timedelta(days=12)).isoformat(),
            "location": "X", "description": "", "active": True, "priority": 1,
        })
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Pelea2"
        # delete
        r = auth.delete(f"{API}/admin/events/{eid}")
        assert r.status_code == 200


# ---------- ADMIN MESSAGES ----------
class TestMessages:
    def test_list_read_delete(self, session, auth):
        # First submit a contact
        r = session.post(f"{API}/contact", json={
            "name": "TEST_Msg", "email": "msg@test.com", "message": "Hola"
        })
        assert r.status_code == 200
        r = auth.get(f"{API}/admin/messages")
        assert r.status_code == 200
        msgs = r.json()
        target = next((m for m in msgs if m.get("name") == "TEST_Msg"), None)
        assert target is not None
        mid = target["id"]
        r = auth.put(f"{API}/admin/messages/{mid}/read")
        assert r.status_code == 200
        r = auth.delete(f"{API}/admin/messages/{mid}")
        assert r.status_code == 200


# ---------- ADMIN SETTINGS ----------
class TestSettings:
    def test_update_and_persist(self, auth):
        # Get current
        cur = requests.get(f"{API}/settings").json()
        original_name = cur.get("gym_name")
        new_name = "TEST_GYM_NAME"
        payload = {
            "gym_name": new_name,
            "logo": cur.get("logo"),
            "address": cur.get("address", ""),
            "phone": cur.get("phone", ""),
            "contact_email": cur.get("contact_email", ""),
            "facebook": cur.get("facebook", ""),
            "instagram": cur.get("instagram", ""),
            "twitter": cur.get("twitter", ""),
            "youtube": cur.get("youtube", ""),
            "currency": cur.get("currency", "USD"),
            "currency_symbol": cur.get("currency_symbol", "$"),
            "timezone": cur.get("timezone", "UTC"),
        }
        r = auth.put(f"{API}/admin/settings", json=payload)
        assert r.status_code == 200
        assert r.json()["gym_name"] == new_name
        # Verify persisted
        r = requests.get(f"{API}/settings")
        assert r.status_code == 200
        assert r.json()["gym_name"] == new_name
        # Restore
        payload["gym_name"] = original_name or "BOXING GYM"
        r = auth.put(f"{API}/admin/settings", json=payload)
        assert r.status_code == 200


# ---------- DASHBOARD ----------
class TestDashboard:
    def test_dashboard_metrics(self, auth):
        r = auth.get(f"{API}/admin/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_subscribers", "active_subscribers", "month_revenue",
                  "overdue_count", "overdue_amount", "upcoming_count", "package_breakdown"]:
            assert k in d
        assert isinstance(d["package_breakdown"], list)


# ---------- STRIPE ----------
class TestStripe:
    def test_checkout_session_and_status(self, auth):
        # need a package
        r = auth.post(f"{API}/admin/packages", json={
            "name": "TEST_Stripe", "description": "", "inscription_cost": 10.0,
            "monthly_cost": 20.0, "duration": "monthly", "duration_days": 30,
            "benefits": [], "active": True,
        })
        assert r.status_code == 200
        pkg = r.json()
        try:
            r = auth.post(f"{API}/payments/checkout", json={
                "package_id": pkg["id"],
                "origin_url": BASE_URL,
                "include_inscription": True,
            })
            # Don't require 200; just must not 500 in general OR we accept 200 only
            assert r.status_code == 200, f"checkout failed: {r.status_code} {r.text}"
            d = r.json()
            assert d.get("url") and d.get("session_id")
            sid = d["session_id"]
            r2 = auth.get(f"{API}/payments/checkout/status/{sid}")
            assert r2.status_code == 200, r2.text
            d2 = r2.json()
            assert "payment_status" in d2
        finally:
            auth.delete(f"{API}/admin/packages/{pkg['id']}")
