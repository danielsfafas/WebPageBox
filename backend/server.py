from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------- App ----------------
app = FastAPI(title="Boxing Gym API")
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


# ---------------- Helpers ----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            d = datetime.fromisoformat(value.replace('Z', '+00:00'))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, os.environ['JWT_SECRET'], algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.environ['JWT_SECRET'], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def clean_doc(doc: dict) -> dict:
    if doc is None:
        return doc
    doc.pop("_id", None)
    return doc


# ---------------- Models ----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]


class ProductIn(BaseModel):
    name: str
    description: str = ""
    category: str = ""
    price: float = 0.0
    stock: int = 0
    images: List[str] = Field(default_factory=list)  # base64 data URLs
    youtube_url: Optional[str] = None
    video_clip: Optional[str] = None  # base64 mp4 data URL
    tags: List[str] = Field(default_factory=list)
    active: bool = True


class PackageIn(BaseModel):
    name: str
    description: str = ""
    inscription_cost: float = 0.0
    monthly_cost: float = 0.0
    duration: str = "monthly"  # monthly, quarterly, yearly, custom
    duration_days: int = 30
    benefits: List[str] = Field(default_factory=list)
    active: bool = True


class PhysicalRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str = Field(default_factory=lambda: iso(now_utc()))
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hip_cm: Optional[float] = None
    biceps_cm: Optional[float] = None
    thigh_cm: Optional[float] = None
    calf_cm: Optional[float] = None
    body_fat_pct: Optional[float] = None
    notes: str = ""


class MediaEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str = Field(default_factory=lambda: iso(now_utc()))
    type: str = "image"  # image or video
    data: str = ""  # base64 data URL
    note: str = ""


class SubscriberIn(BaseModel):
    full_name: str
    birth_date: Optional[str] = None
    gender: str = ""
    phone: str = ""
    email: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    profile_photo: Optional[str] = None  # base64
    package_id: Optional[str] = None
    active: bool = True
    fitness_goal: str = ""


class PaymentIn(BaseModel):
    subscriber_id: str
    amount: float
    method: str = "cash"  # cash, transfer, online
    payment_date: Optional[str] = None
    period_days: int = 30
    notes: str = ""
    type: str = "monthly"  # monthly or inscription


class EventIn(BaseModel):
    title: str
    type: str = "fight"  # fight, tournament, internal, seminar
    date: str  # ISO datetime
    location: str = ""
    description: str = ""
    poster: Optional[str] = None  # base64
    registration_url: Optional[str] = None
    active: bool = True
    priority: int = 0


class ContactMessageIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    message: str


class SettingsIn(BaseModel):
    gym_name: str = "BOXING GYM"
    logo: Optional[str] = None
    address: str = ""
    phone: str = ""
    contact_email: str = ""
    facebook: str = ""
    instagram: str = ""
    twitter: str = ""
    youtube: str = ""
    currency: str = "USD"
    currency_symbol: str = "$"
    timezone: str = "UTC"


class CheckoutRequest(BaseModel):
    package_id: str
    subscriber_id: Optional[str] = None
    origin_url: str
    include_inscription: bool = True


# ---------------- Auth Endpoints ----------------
@api.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_access_token(user["id"], user["email"])
    user_out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return LoginResponse(token=token, user=user_out)


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout():
    return {"ok": True}


# ---------------- Public: Settings ----------------
async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"id": "main"})
    if not doc:
        default = SettingsIn().model_dump()
        default["id"] = "main"
        await db.settings.insert_one(default)
        doc = default
    return clean_doc(doc)


@api.get("/settings")
async def public_settings():
    return await get_settings_doc()


@api.put("/admin/settings")
async def update_settings(payload: SettingsIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    await db.settings.update_one({"id": "main"}, {"$set": data}, upsert=True)
    return await get_settings_doc()


# ---------------- Products ----------------
@api.get("/products")
async def list_products_public():
    items = await db.products.find({"active": True}, {"_id": 0}).to_list(1000)
    return items


@api.get("/admin/products")
async def list_products_admin(user: dict = Depends(get_current_user)):
    items = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@api.post("/admin/products")
async def create_product(payload: ProductIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = iso(now_utc())
    await db.products.insert_one(doc)
    return clean_doc(doc)


@api.put("/admin/products/{product_id}")
async def update_product(product_id: str, payload: ProductIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["updated_at"] = iso(now_utc())
    result = await db.products.update_one({"id": product_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(404, "Producto no encontrado")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc


@api.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Producto no encontrado")
    return {"ok": True}


# ---------------- Packages ----------------
@api.get("/packages")
async def list_packages_public():
    items = await db.packages.find({"active": True}, {"_id": 0}).to_list(1000)
    return items


@api.get("/admin/packages")
async def list_packages_admin(user: dict = Depends(get_current_user)):
    items = await db.packages.find({}, {"_id": 0}).to_list(2000)
    return items


@api.post("/admin/packages")
async def create_package(payload: PackageIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = iso(now_utc())
    await db.packages.insert_one(doc)
    return clean_doc(doc)


@api.put("/admin/packages/{package_id}")
async def update_package(package_id: str, payload: PackageIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["updated_at"] = iso(now_utc())
    result = await db.packages.update_one({"id": package_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(404, "Paquete no encontrado")
    return await db.packages.find_one({"id": package_id}, {"_id": 0})


@api.delete("/admin/packages/{package_id}")
async def delete_package(package_id: str, user: dict = Depends(get_current_user)):
    result = await db.packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Paquete no encontrado")
    return {"ok": True}


@api.get("/admin/packages/{package_id}/analytics")
async def package_analytics(package_id: str, user: dict = Depends(get_current_user)):
    subs = await db.subscribers.find({"package_id": package_id}, {"_id": 0}).to_list(5000)
    active_subs = [s for s in subs if s.get("active", True)]
    payments = await db.payments.find({"package_id": package_id}, {"_id": 0}).to_list(20000)
    total_revenue = sum(p.get("amount", 0) for p in payments)
    return {
        "total_subscribers": len(subs),
        "active_subscribers": len(active_subs),
        "inactive_subscribers": len(subs) - len(active_subs),
        "total_revenue": total_revenue,
        "total_payments": len(payments),
    }


# ---------------- Subscribers ----------------
def calc_payment_status(next_due_date: Optional[str]) -> str:
    if not next_due_date:
        return "unknown"
    dt = parse_dt(next_due_date)
    if not dt:
        return "unknown"
    delta = (dt - now_utc()).days
    if delta < 0:
        return "overdue"
    if delta <= 7:
        return "expiring_soon"
    return "valid"


async def enrich_subscriber(sub: dict) -> dict:
    if not sub:
        return sub
    clean_doc(sub)
    last_payment = await db.payments.find_one(
        {"subscriber_id": sub["id"], "type": "monthly"},
        sort=[("payment_date", -1)],
        projection={"_id": 0},
    )
    sub["last_payment"] = last_payment
    sub["next_due_date"] = last_payment.get("next_due_date") if last_payment else None
    sub["payment_status"] = calc_payment_status(sub["next_due_date"])
    # Attach package summary
    if sub.get("package_id"):
        pkg = await db.packages.find_one({"id": sub["package_id"]}, {"_id": 0, "name": 1, "monthly_cost": 1})
        sub["package"] = pkg
    return sub


@api.get("/admin/subscribers")
async def list_subscribers(user: dict = Depends(get_current_user)):
    items = await db.subscribers.find({}, {"_id": 0}).sort("enrolled_at", -1).to_list(5000)
    out = []
    for s in items:
        out.append(await enrich_subscriber(s))
    return out


@api.get("/admin/subscribers/{sub_id}")
async def get_subscriber(sub_id: str, user: dict = Depends(get_current_user)):
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Suscriptor no encontrado")
    sub = await enrich_subscriber(sub)
    # progress records
    records = await db.physical_records.find({"subscriber_id": sub_id}, {"_id": 0}).sort("date", 1).to_list(5000)
    media = await db.media_entries.find({"subscriber_id": sub_id}, {"_id": 0}).sort("date", -1).to_list(5000)
    payments = await db.payments.find({"subscriber_id": sub_id}, {"_id": 0}).sort("payment_date", -1).to_list(5000)
    sub["progress_records"] = records
    sub["media"] = media
    sub["payments"] = payments
    return sub


@api.post("/admin/subscribers")
async def create_subscriber(payload: SubscriberIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["enrolled_at"] = iso(now_utc())
    await db.subscribers.insert_one(doc)
    return await enrich_subscriber(clean_doc(doc))


@api.put("/admin/subscribers/{sub_id}")
async def update_subscriber(sub_id: str, payload: SubscriberIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["updated_at"] = iso(now_utc())
    result = await db.subscribers.update_one({"id": sub_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(404, "Suscriptor no encontrado")
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    return await enrich_subscriber(sub)


@api.delete("/admin/subscribers/{sub_id}")
async def delete_subscriber(sub_id: str, user: dict = Depends(get_current_user)):
    result = await db.subscribers.delete_one({"id": sub_id})
    await db.physical_records.delete_many({"subscriber_id": sub_id})
    await db.media_entries.delete_many({"subscriber_id": sub_id})
    await db.payments.delete_many({"subscriber_id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Suscriptor no encontrado")
    return {"ok": True}


# Progress records
@api.post("/admin/subscribers/{sub_id}/progress")
async def add_progress(sub_id: str, payload: PhysicalRecord, user: dict = Depends(get_current_user)):
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Suscriptor no encontrado")
    doc = payload.model_dump()
    doc["subscriber_id"] = sub_id
    if "id" not in doc or not doc["id"]:
        doc["id"] = str(uuid.uuid4())
    await db.physical_records.insert_one(doc)
    clean_doc(doc)
    return doc


@api.delete("/admin/subscribers/{sub_id}/progress/{rec_id}")
async def del_progress(sub_id: str, rec_id: str, user: dict = Depends(get_current_user)):
    await db.physical_records.delete_one({"id": rec_id, "subscriber_id": sub_id})
    return {"ok": True}


# Media entries
@api.post("/admin/subscribers/{sub_id}/media")
async def add_media(sub_id: str, payload: MediaEntry, user: dict = Depends(get_current_user)):
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Suscriptor no encontrado")
    doc = payload.model_dump()
    doc["subscriber_id"] = sub_id
    if "id" not in doc or not doc["id"]:
        doc["id"] = str(uuid.uuid4())
    await db.media_entries.insert_one(doc)
    clean_doc(doc)
    return doc


@api.delete("/admin/subscribers/{sub_id}/media/{media_id}")
async def del_media(sub_id: str, media_id: str, user: dict = Depends(get_current_user)):
    await db.media_entries.delete_one({"id": media_id, "subscriber_id": sub_id})
    return {"ok": True}


# ---------------- Payments ----------------
def compute_next_due(payment_date_iso: str, period_days: int) -> str:
    dt = parse_dt(payment_date_iso) or now_utc()
    return iso(dt + timedelta(days=period_days))


@api.post("/admin/payments")
async def create_payment(payload: PaymentIn, user: dict = Depends(get_current_user)):
    sub = await db.subscribers.find_one({"id": payload.subscriber_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Suscriptor no encontrado")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    if not doc.get("payment_date"):
        doc["payment_date"] = iso(now_utc())
    doc["next_due_date"] = compute_next_due(doc["payment_date"], doc.get("period_days", 30)) if doc.get("type") == "monthly" else None
    doc["recorded_by"] = user.get("email")
    doc["package_id"] = sub.get("package_id")
    doc["created_at"] = iso(now_utc())
    await db.payments.insert_one(doc)
    return clean_doc(doc)


@api.get("/admin/payments")
async def list_payments(user: dict = Depends(get_current_user)):
    items = await db.payments.find({}, {"_id": 0}).sort("payment_date", -1).to_list(20000)
    # attach subscriber names
    sub_ids = list({p["subscriber_id"] for p in items if p.get("subscriber_id")})
    subs = {s["id"]: s for s in await db.subscribers.find({"id": {"$in": sub_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(5000)}
    for p in items:
        s = subs.get(p.get("subscriber_id"))
        p["subscriber_name"] = s.get("full_name") if s else None
    return items


@api.delete("/admin/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Pago no encontrado")
    return {"ok": True}


# ---------------- Events ----------------
@api.get("/events")
async def list_events_public():
    items = await db.events.find({"active": True}, {"_id": 0}).sort([("priority", -1), ("date", 1)]).to_list(2000)
    return items


@api.get("/admin/events")
async def list_events_admin(user: dict = Depends(get_current_user)):
    items = await db.events.find({}, {"_id": 0}).sort([("priority", -1), ("date", 1)]).to_list(2000)
    return items


@api.post("/admin/events")
async def create_event(payload: EventIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = iso(now_utc())
    await db.events.insert_one(doc)
    return clean_doc(doc)


@api.put("/admin/events/{event_id}")
async def update_event(event_id: str, payload: EventIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    data["updated_at"] = iso(now_utc())
    result = await db.events.update_one({"id": event_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(404, "Evento no encontrado")
    return await db.events.find_one({"id": event_id}, {"_id": 0})


@api.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Evento no encontrado")
    return {"ok": True}


# ---------------- Contact ----------------
@api.post("/contact")
async def submit_contact(payload: ContactMessageIn):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = iso(now_utc())
    doc["read"] = False
    await db.contact_messages.insert_one(doc)
    clean_doc(doc)
    return {"ok": True}


@api.get("/admin/messages")
async def list_messages(user: dict = Depends(get_current_user)):
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return items


@api.put("/admin/messages/{msg_id}/read")
async def mark_read(msg_id: str, user: dict = Depends(get_current_user)):
    await db.contact_messages.update_one({"id": msg_id}, {"$set": {"read": True}})
    return {"ok": True}


@api.delete("/admin/messages/{msg_id}")
async def delete_message(msg_id: str, user: dict = Depends(get_current_user)):
    await db.contact_messages.delete_one({"id": msg_id})
    return {"ok": True}


# ---------------- Dashboard ----------------
@api.get("/admin/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    subs = await db.subscribers.find({}, {"_id": 0, "id": 1, "active": 1, "package_id": 1}).to_list(10000)
    active_subs = [s for s in subs if s.get("active", True)]

    payments = await db.payments.find({}, {"_id": 0}).to_list(50000)
    month_revenue = 0.0
    for p in payments:
        dt = parse_dt(p.get("payment_date"))
        if dt and dt >= month_start:
            month_revenue += float(p.get("amount", 0))

    # overdue and upcoming
    overdue_count = 0
    overdue_amount = 0.0
    upcoming_count = 0
    sub_map = {s["id"]: s for s in subs}
    last_monthly: Dict[str, dict] = {}
    for p in payments:
        if p.get("type") != "monthly":
            continue
        sid = p.get("subscriber_id")
        if not sid:
            continue
        cur = last_monthly.get(sid)
        if cur is None or (parse_dt(p.get("payment_date")) or now) > (parse_dt(cur.get("payment_date")) or now):
            last_monthly[sid] = p

    for sid in [s["id"] for s in active_subs]:
        lp = last_monthly.get(sid)
        status_ = calc_payment_status(lp.get("next_due_date") if lp else None)
        if status_ == "overdue":
            overdue_count += 1
            # estimate amount due from package monthly_cost
            sub = sub_map.get(sid)
            pkg_id = sub.get("package_id") if sub else None
            if pkg_id:
                pkg = await db.packages.find_one({"id": pkg_id}, {"_id": 0, "monthly_cost": 1})
                if pkg:
                    overdue_amount += float(pkg.get("monthly_cost", 0))
        elif status_ == "expiring_soon":
            upcoming_count += 1

    # package revenue breakdown
    package_revenue: Dict[str, float] = {}
    for p in payments:
        pid = p.get("package_id")
        if pid:
            package_revenue[pid] = package_revenue.get(pid, 0) + float(p.get("amount", 0))
    pkgs = await db.packages.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(1000)
    pkg_breakdown = [
        {"package_id": pk["id"], "name": pk["name"], "revenue": package_revenue.get(pk["id"], 0.0)}
        for pk in pkgs
    ]

    return {
        "total_subscribers": len(subs),
        "active_subscribers": len(active_subs),
        "month_revenue": month_revenue,
        "overdue_count": overdue_count,
        "overdue_amount": overdue_amount,
        "upcoming_count": upcoming_count,
        "package_breakdown": pkg_breakdown,
    }


# ---------------- Stripe ----------------
@api.post("/payments/checkout")
async def create_checkout(payload: CheckoutRequest, request: Request):
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout,
        CheckoutSessionRequest,
    )
    pkg = await db.packages.find_one({"id": payload.package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(404, "Paquete no encontrado")
    amount = float(pkg.get("monthly_cost", 0))
    if payload.include_inscription:
        amount += float(pkg.get("inscription_cost", 0))
    if amount <= 0:
        raise HTTPException(400, "El paquete no tiene un monto válido")

    settings_doc = await get_settings_doc()
    currency = (settings_doc.get("currency") or "USD").lower()

    api_key = os.environ['STRIPE_API_KEY']
    host_url = payload.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/paquetes"

    metadata = {
        "package_id": payload.package_id,
        "subscriber_id": payload.subscriber_id or "",
        "include_inscription": "1" if payload.include_inscription else "0",
    }
    req = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await sc.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "amount": amount,
        "currency": currency,
        "package_id": payload.package_id,
        "subscriber_id": payload.subscriber_id,
        "include_inscription": payload.include_inscription,
        "metadata": metadata,
        "payment_status": "pending",
        "status": "open",
        "created_at": iso(now_utc()),
    })

    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Sesión no encontrada")

    # idempotent
    if tx.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": "complete", "amount": tx["amount"], "currency": tx["currency"]}

    host_url = str(request.base_url).rstrip('/')
    sc = StripeCheckout(api_key=os.environ['STRIPE_API_KEY'], webhook_url=f"{host_url}/api/webhook/stripe")
    result = await sc.get_checkout_status(session_id)

    update = {
        "payment_status": result.payment_status,
        "status": result.status,
        "updated_at": iso(now_utc()),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    # On first paid, also create a Payment record if subscriber present
    if result.payment_status == "paid" and tx.get("payment_status") != "paid":
        sub_id = tx.get("subscriber_id")
        pkg_id = tx.get("package_id")
        if sub_id:
            payment_doc = {
                "id": str(uuid.uuid4()),
                "subscriber_id": sub_id,
                "amount": tx["amount"],
                "method": "online",
                "payment_date": iso(now_utc()),
                "period_days": 30,
                "notes": f"Stripe session {session_id}",
                "type": "monthly",
                "next_due_date": compute_next_due(iso(now_utc()), 30),
                "package_id": pkg_id,
                "recorded_by": "stripe",
                "created_at": iso(now_utc()),
            }
            await db.payments.insert_one(payment_doc)

    return {
        "payment_status": result.payment_status,
        "status": result.status,
        "amount": result.amount_total / 100 if isinstance(result.amount_total, int) else result.amount_total,
        "currency": result.currency,
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip('/')
    sc = StripeCheckout(api_key=os.environ['STRIPE_API_KEY'], webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        wr = await sc.handle_webhook(body, sig)
    except Exception as e:
        raise HTTPException(400, f"webhook error: {e}")
    if wr and wr.session_id:
        await db.payment_transactions.update_one(
            {"session_id": wr.session_id},
            {"$set": {"payment_status": wr.payment_status, "event_type": wr.event_type, "webhook_updated_at": iso(now_utc())}},
        )
    return {"ok": True}


# ---------------- Startup ----------------
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@boxinggym.com").lower()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(password),
            "name": "Admin",
            "role": "admin",
            "created_at": iso(now_utc()),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password)}},
        )


async def seed_settings():
    existing = await db.settings.find_one({"id": "main"})
    if not existing:
        await db.settings.insert_one({
            "id": "main",
            "gym_name": "IRONFIST BOXING GYM",
            "address": "Av. de los Campeones 123, Ciudad",
            "phone": "+1 555 0100",
            "contact_email": "info@ironfistboxing.com",
            "facebook": "https://facebook.com",
            "instagram": "https://instagram.com",
            "twitter": "https://twitter.com",
            "youtube": "https://youtube.com",
            "currency": "USD",
            "currency_symbol": "$",
            "timezone": "UTC",
            "logo": None,
        })


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.packages.create_index("id", unique=True)
    await db.subscribers.create_index("id", unique=True)
    await db.payments.create_index("id", unique=True)
    await db.events.create_index("id", unique=True)
    await seed_admin()
    await seed_settings()


# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
