from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import requests
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
    offer_expires_at: Optional[str] = None
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
    username: str = ""
    password: str = ""


class SubscriberUpdateIn(BaseModel):
    full_name: str
    birth_date: Optional[str] = None
    gender: str = ""
    phone: str = ""
    email: str = ""
    emergency_contact_name: str = ""
    emergency_contact_phone: str = ""
    profile_photo: Optional[str] = None
    package_id: Optional[str] = None
    active: bool = True
    fitness_goal: str = ""
    username: str = ""
    password: str = ""


class SubscriberLoginRequest(BaseModel):
    username: str
    password: str


class SubscriberPackageChangeIn(BaseModel):
    package_id: str


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


class HeroCarouselSlideIn(BaseModel):
    type: str = "image"  # image | youtube
    src: str = ""


DEFAULT_HERO_IMAGE = (
    "https://images.pexels.com/photos/6456306/pexels-photo-6456306.jpeg"
    "?auto=compress&cs=tinysrgb&dpr=2&h=1200&w=1600"
)


class SettingsIn(BaseModel):
    gym_name: str = "BOXING GYM"
    logo: Optional[str] = None
    address: str = ""
    gym_hours: str = (
        "Lunes a Viernes: 6:00 – 22:00\n"
        "Sábado: 7:00 – 14:00\n"
        "Domingo: Cerrado"
    )
    phone: str = ""
    contact_email: str = ""
    facebook: str = ""
    instagram: str = ""
    twitter: str = ""
    youtube: str = ""
    currency: str = "USD"
    currency_symbol: str = "$"
    timezone: str = "UTC"
    theme: str = "crimson-knockout"
    mp_enabled: bool = False
    mp_public_key: str = ""
    mp_access_token: str = ""
    mp_webhook_secret: str = ""
    subscriber_site_url: str = ""
    hero_carousel_interval_sec: int = 6
    hero_carousel_slides: List[HeroCarouselSlideIn] = Field(
        default_factory=lambda: [HeroCarouselSlideIn(type="image", src=DEFAULT_HERO_IMAGE)]
    )


async def deactivate_expired_packages():
    now_iso = iso(now_utc())
    await db.packages.update_many(
        {
            "active": True,
            "offer_expires_at": {"$type": "string", "$lte": now_iso},
        },
        {"$set": {"active": False, "auto_deactivated_at": now_iso}},
    )


class CheckoutRequest(BaseModel):
    package_id: str
    subscriber_id: Optional[str] = None
    origin_url: str
    include_inscription: bool = True


class AdminCheckoutRequest(BaseModel):
    subscriber_id: str
    type: str = "monthly"
    notes: str = ""
    origin_url: str


class SubscriberCheckoutRequest(BaseModel):
    origin_url: str


class SubscriberConfirmPaymentRequest(BaseModel):
    session_id: str


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


def create_subscriber_token(subscriber_id: str, username: str) -> str:
    payload = {
        "sub": subscriber_id,
        "username": username,
        "exp": now_utc() + timedelta(hours=12),
        "type": "subscriber",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_subscriber(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(creds.credentials, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "subscriber":
            raise HTTPException(status_code=401, detail="Token invalido")
        sub = await db.subscribers.find_one({"id": payload["sub"]}, {"_id": 0})
        if not sub:
            raise HTTPException(status_code=401, detail="Suscriptor no encontrado")
        return sub
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")


@api.post("/subscriber/auth/login")
async def subscriber_login(payload: SubscriberLoginRequest):
    username = payload.username.lower().strip()
    sub = await db.subscribers.find_one({"username": username}, {"_id": 0})
    if not sub or not verify_password(payload.password, sub.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_subscriber_token(sub["id"], sub.get("username", ""))
    sub = await enrich_subscriber(sub)
    return {"token": token, "subscriber": sub}


@api.get("/subscriber/me")
async def subscriber_me(sub: dict = Depends(get_current_subscriber)):
    s = await enrich_subscriber(sub)
    return s


@api.get("/subscriber/progress")
async def subscriber_progress(sub: dict = Depends(get_current_subscriber)):
    records = await db.physical_records.find({"subscriber_id": sub["id"]}, {"_id": 0}).sort("date", 1).to_list(5000)
    return records


@api.get("/subscriber/media")
async def subscriber_media(sub: dict = Depends(get_current_subscriber)):
    media = await db.media_entries.find({"subscriber_id": sub["id"]}, {"_id": 0}).sort("date", -1).to_list(5000)
    return media


@api.get("/subscriber/payments")
async def subscriber_payments(sub: dict = Depends(get_current_subscriber)):
    payments = await db.payments.find({"subscriber_id": sub["id"]}, {"_id": 0}).sort("payment_date", -1).to_list(5000)
    return payments


# ---------------- Public: Settings ----------------
def public_settings_view(doc: dict) -> dict:
    out = dict(doc or {})
    out.pop("mp_access_token", None)
    out.pop("mp_webhook_secret", None)
    return out


def clean_subscriber_doc(doc: dict) -> dict:
    clean_doc(doc)
    if doc is None:
        return doc
    doc.pop("password_hash", None)
    return doc


async def get_settings_doc(public: bool = False) -> dict:
    doc = await db.settings.find_one({"id": "main"})
    if not doc:
        default = SettingsIn().model_dump()
        default["id"] = "main"
        await db.settings.insert_one(default)
        doc = default
    patch = {}
    if "theme" not in doc:
        patch["theme"] = "crimson-knockout"
    if "mp_enabled" not in doc:
        patch["mp_enabled"] = False
    if "mp_public_key" not in doc:
        patch["mp_public_key"] = ""
    if "mp_access_token" not in doc:
        patch["mp_access_token"] = ""
    if "mp_webhook_secret" not in doc:
        patch["mp_webhook_secret"] = ""
    if "subscriber_site_url" not in doc:
        patch["subscriber_site_url"] = ""
    if "gym_hours" not in doc:
        patch["gym_hours"] = SettingsIn().gym_hours
    if "hero_carousel_interval_sec" not in doc:
        patch["hero_carousel_interval_sec"] = 6
    if "hero_carousel_slides" not in doc or not doc.get("hero_carousel_slides"):
        patch["hero_carousel_slides"] = [HeroCarouselSlideIn(type="image", src=DEFAULT_HERO_IMAGE).model_dump()]
    if patch:
        await db.settings.update_one({"id": "main"}, {"$set": patch})
        doc.update(patch)
    clean_doc(doc)
    return public_settings_view(doc) if public else doc


@api.get("/settings")
async def public_settings():
    return await get_settings_doc(public=True)


@api.get("/admin/settings")
async def admin_settings(user: dict = Depends(get_current_user)):
    return await get_settings_doc(public=False)


@api.put("/admin/settings")
async def update_settings(payload: SettingsIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump()
    await db.settings.update_one({"id": "main"}, {"$set": data}, upsert=True)
    return await get_settings_doc(public=False)


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
    await deactivate_expired_packages()
    items = await db.packages.find({"active": True}, {"_id": 0}).to_list(1000)
    return items


@api.get("/admin/packages")
async def list_packages_admin(user: dict = Depends(get_current_user)):
    await deactivate_expired_packages()
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
    clean_subscriber_doc(sub)
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
        pkg = await db.packages.find_one({"id": sub["package_id"]}, {"_id": 0, "name": 1, "monthly_cost": 1, "benefits": 1})
        sub["package"] = pkg
    if sub.get("pending_package_id"):
        pending = await db.packages.find_one({"id": sub["pending_package_id"]}, {"_id": 0, "id": 1, "name": 1})
        sub["pending_package"] = pending
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
    username = (doc.get("username") or "").strip().lower()
    password = (doc.pop("password", "") or "").strip()
    if not username or not password:
        raise HTTPException(400, "Usuario y contraseña son requeridos")
    if len(password) < 4:
        raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres")
    existing_username = await db.subscribers.find_one({"username": username}, {"_id": 0, "id": 1})
    if existing_username:
        raise HTTPException(400, "El usuario de suscriptor ya existe")
    doc["id"] = str(uuid.uuid4())
    doc["username"] = username
    doc["password_hash"] = hash_password(password)
    doc["pending_package_id"] = None
    doc["enrolled_at"] = iso(now_utc())
    await db.subscribers.insert_one(doc)
    return await enrich_subscriber(clean_subscriber_doc(doc))


@api.put("/admin/subscribers/{sub_id}")
async def update_subscriber(sub_id: str, payload: SubscriberUpdateIn, user: dict = Depends(get_current_user)):
    data = payload.model_dump(exclude={"password"})
    username = (data.get("username") or "").strip().lower()
    if not username:
        raise HTTPException(400, "Usuario requerido")
    current = await db.subscribers.find_one({"id": sub_id}, {"_id": 0, "id": 1})
    if not current:
        raise HTTPException(404, "Suscriptor no encontrado")
    existing_username = await db.subscribers.find_one({"username": username, "id": {"$ne": sub_id}}, {"_id": 0, "id": 1})
    if existing_username:
        raise HTTPException(400, "El usuario de suscriptor ya existe")
    plain_password = (payload.password or "").strip()
    data["username"] = username
    if plain_password:
        if len(plain_password) < 4:
            raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres")
        data["password_hash"] = hash_password(plain_password)
    data["updated_at"] = iso(now_utc())
    result = await db.subscribers.update_one({"id": sub_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(404, "Suscriptor no encontrado")
    sub = await db.subscribers.find_one({"id": sub_id}, {"_id": 0})
    return await enrich_subscriber(sub)


@api.put("/admin/subscribers/{sub_id}/package-change")
async def schedule_subscriber_package_change(sub_id: str, payload: SubscriberPackageChangeIn, user: dict = Depends(get_current_user)):
    pkg = await db.packages.find_one({"id": payload.package_id}, {"_id": 0, "id": 1})
    if not pkg:
        raise HTTPException(404, "Paquete no encontrado")
    result = await db.subscribers.update_one(
        {"id": sub_id},
        {"$set": {"pending_package_id": payload.package_id, "pending_package_set_at": iso(now_utc())}},
    )
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
    if doc.get("type") == "monthly" and sub.get("pending_package_id"):
        next_pkg_id = sub["pending_package_id"]
        doc["package_id"] = next_pkg_id
        await db.subscribers.update_one(
            {"id": payload.subscriber_id},
            {"$set": {"package_id": next_pkg_id}, "$unset": {"pending_package_id": "", "pending_package_set_at": ""}},
        )
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


# ---------------- Mercado Pago ----------------
def mercado_pago_from_settings(settings_doc: dict) -> str:
    access_token = (settings_doc.get("mp_access_token") or "").strip()
    if not settings_doc.get("mp_enabled"):
        raise HTTPException(status_code=400, detail="Pagos en linea deshabilitados en configuracion.")
    if not access_token:
        raise HTTPException(status_code=400, detail="Mercado Pago no configurado: falta access token.")
    return access_token


def resolve_subscriber_site_url(origin_url: Optional[str], settings_doc: dict) -> str:
    from_settings = str(settings_doc.get("subscriber_site_url") or "").strip().rstrip("/")
    if from_settings:
        return from_settings
    env_url = str(os.environ.get("SUBSCRIBER_ORIGIN_URL") or "").strip().rstrip("/")
    if env_url:
        return env_url
    if origin_url:
        return str(origin_url).strip().rstrip("/")
    return "http://localhost:3102"


def mercado_pago_checkout_url(pref: dict, access_token: str) -> str:
    use_sandbox = access_token.startswith("TEST-")
    if use_sandbox:
        return pref.get("sandbox_init_point") or pref.get("init_point") or ""
    return pref.get("init_point") or pref.get("sandbox_init_point") or ""


def mercado_pago_create_preference(*, access_token: str, payload: dict) -> dict:
    resp = requests.post(
        "https://api.mercadopago.com/checkout/preferences",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        json=payload,
        timeout=20,
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"Error Mercado Pago: {resp.text}")
    return resp.json()


def mercado_pago_search_payment(*, access_token: str, external_reference: str) -> Optional[dict]:
    resp = requests.get(
        "https://api.mercadopago.com/v1/payments/search",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"external_reference": external_reference, "sort": "date_created", "criteria": "desc"},
        timeout=20,
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=f"No se pudo consultar pago en Mercado Pago: {resp.text}")
    data = resp.json()
    results = data.get("results") or []
    return results[0] if results else None


async def create_checkout_session_and_tx(
    *,
    amount: float,
    currency: str,
    success_url: str,
    cancel_url: str,
    metadata: dict,
    access_token: str,
):
    session_id = str(uuid.uuid4())
    success_with_query = f"{success_url}?session_id={session_id}&mp_status=success"
    pending_with_query = f"{success_url}?session_id={session_id}&mp_status=pending"
    failure_with_query = f"{cancel_url}?session_id={session_id}&mp_status=failure"
    preference_payload = {
        "items": [
            {
                "title": metadata.get("description", "Pago membresia"),
                "quantity": 1,
                "currency_id": currency.upper(),
                "unit_price": float(amount),
            }
        ],
        "external_reference": session_id,
        "back_urls": {
            "success": success_with_query,
            "failure": failure_with_query,
            "pending": pending_with_query,
        },
        "metadata": {k: str(v) for k, v in metadata.items() if v is not None},
    }
    # auto_return no funciona bien en localhost; MP muestra pantalla verde hasta pulsar "Volver"
    host = success_url.lower()
    if host.startswith("https://") and "localhost" not in host and "127.0.0.1" not in host:
        preference_payload["auto_return"] = "approved"
    pref = mercado_pago_create_preference(access_token=access_token, payload=preference_payload)
    checkout_url = mercado_pago_checkout_url(pref, access_token)
    if not checkout_url:
        raise HTTPException(status_code=400, detail="Mercado Pago no devolvio URL de checkout.")
    tx = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "provider": "mercadopago",
        "provider_reference": pref.get("id"),
        "amount": amount,
        "currency": currency,
        "package_id": metadata.get("package_id"),
        "subscriber_id": metadata.get("subscriber_id"),
        "include_inscription": metadata.get("include_inscription") == "1",
        "metadata": metadata,
        "payment_status": "pending",
        "status": "open",
        "created_at": iso(now_utc()),
    }
    await db.payment_transactions.insert_one(tx)
    return {"session_id": session_id, "checkout_url": checkout_url}


async def finalize_paid_session(session_id: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx or not tx.get("subscriber_id"):
        return
    existing = await db.payments.find_one({"provider_session_id": session_id}, {"_id": 0, "id": 1})
    if existing:
        return
    period_days = int(tx.get("metadata", {}).get("period_days", 30))
    payment_type = tx.get("metadata", {}).get("type", "monthly")
    sub = await db.subscribers.find_one({"id": tx["subscriber_id"]}, {"_id": 0, "pending_package_id": 1})
    effective_package_id = tx.get("package_id")
    if payment_type == "monthly" and sub and sub.get("pending_package_id"):
        effective_package_id = sub["pending_package_id"]
        await db.subscribers.update_one(
            {"id": tx["subscriber_id"]},
            {"$set": {"package_id": effective_package_id}, "$unset": {"pending_package_id": "", "pending_package_set_at": ""}},
        )
    payment_doc = {
        "id": str(uuid.uuid4()),
        "subscriber_id": tx["subscriber_id"],
        "amount": float(tx.get("amount", 0)),
        "method": "online",
        "payment_date": iso(now_utc()),
        "period_days": period_days,
        "notes": tx.get("metadata", {}).get("notes", ""),
        "type": payment_type,
        "next_due_date": compute_next_due(iso(now_utc()), period_days) if payment_type == "monthly" else None,
        "package_id": effective_package_id,
        "recorded_by": tx.get("metadata", {}).get("recorded_by", "mercadopago"),
        "provider": "mercadopago",
        "provider_session_id": session_id,
        "created_at": iso(now_utc()),
    }
    await db.payments.insert_one(payment_doc)


@api.post("/subscriber/payments/checkout")
async def subscriber_checkout(payload: SubscriberCheckoutRequest, subscriber: dict = Depends(get_current_subscriber)):
    package_id = subscriber.get("package_id")
    if not package_id:
        raise HTTPException(400, "No tienes paquete asignado")
    pkg = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(404, "Paquete no encontrado")
    amount = float(pkg.get("monthly_cost", 0))
    if amount <= 0:
        raise HTTPException(400, "La mensualidad del paquete no es valida")
    settings_doc = await get_settings_doc(public=False)
    access_token = mercado_pago_from_settings(settings_doc)
    currency = (settings_doc.get("currency") or "USD").lower()
    host_url = resolve_subscriber_site_url(payload.origin_url, settings_doc)
    success_url = f"{host_url}/mi/pago-retorno"
    cancel_url = f"{host_url}/mi/pago-retorno"
    metadata = {
        "description": f"Mensualidad {subscriber.get('full_name', '')}",
        "package_id": package_id,
        "subscriber_id": subscriber["id"],
        "include_inscription": "0",
        "type": "monthly",
        "period_days": str(int(pkg.get("duration_days", 30) or 30)),
        "notes": "",
        "recorded_by": subscriber.get("username", "subscriber"),
    }
    session = await create_checkout_session_and_tx(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        access_token=access_token,
    )
    return {"checkout_url": session["checkout_url"], "session_id": session["session_id"]}


@api.post("/payments/checkout")
async def create_checkout(payload: CheckoutRequest, request: Request):
    pkg = await db.packages.find_one({"id": payload.package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(404, "Paquete no encontrado")
    amount = float(pkg.get("monthly_cost", 0))
    if payload.include_inscription:
        amount += float(pkg.get("inscription_cost", 0))
    if amount <= 0:
        raise HTTPException(400, "El paquete no tiene un monto valido")
    settings_doc = await get_settings_doc(public=False)
    access_token = mercado_pago_from_settings(settings_doc)
    currency = (settings_doc.get("currency") or "USD").lower()
    host_url = payload.origin_url.rstrip("/")
    success_url = f"{host_url}/payment-success"
    cancel_url = f"{host_url}/paquetes"
    metadata = {
        "description": f"Pago de paquete {pkg.get('name', '')}",
        "package_id": payload.package_id,
        "subscriber_id": payload.subscriber_id or "",
        "include_inscription": "1" if payload.include_inscription else "0",
        "type": "monthly",
        "period_days": str(int(pkg.get("duration_days", 30) or 30)),
        "notes": "",
        "recorded_by": "public_checkout",
    }
    session = await create_checkout_session_and_tx(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        access_token=access_token,
    )
    return {"url": session["checkout_url"], "session_id": session["session_id"]}


@api.post("/admin/payments/checkout")
async def create_admin_checkout(payload: AdminCheckoutRequest, user: dict = Depends(get_current_user)):
    sub = await db.subscribers.find_one({"id": payload.subscriber_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Suscriptor no encontrado")
    package_id = sub.get("package_id")
    if not package_id:
        raise HTTPException(400, "El suscriptor no tiene paquete asignado")
    pkg = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(404, "Paquete no encontrado")
    amount = float(pkg.get("monthly_cost", 0))
    if amount <= 0:
        raise HTTPException(400, "La mensualidad del paquete no es valida")
    settings_doc = await get_settings_doc(public=False)
    access_token = mercado_pago_from_settings(settings_doc)
    currency = (settings_doc.get("currency") or "USD").lower()
    host_url = payload.origin_url.rstrip("/")
    success_url = f"{host_url}/admin/payment-return"
    cancel_url = f"{host_url}/admin/suscriptores/{payload.subscriber_id}"
    metadata = {
        "description": f"Mensualidad {sub.get('full_name', '')}",
        "package_id": package_id,
        "subscriber_id": payload.subscriber_id,
        "include_inscription": "0",
        "type": payload.type or "monthly",
        "period_days": str(int(pkg.get("duration_days", 30) or 30)),
        "notes": payload.notes or "",
        "recorded_by": user.get("email", "admin"),
    }
    session = await create_checkout_session_and_tx(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        access_token=access_token,
    )
    return {"checkout_url": session["checkout_url"], "session_id": session["session_id"]}


async def sync_checkout_session(session_id: str) -> dict:
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Sesion no encontrada")
    settings_doc = await get_settings_doc(public=False)
    access_token = mercado_pago_from_settings(settings_doc)
    payment = mercado_pago_search_payment(access_token=access_token, external_reference=session_id)
    payment_status = "pending"
    session_status = "open"
    if payment:
        mp_status = payment.get("status")
        if mp_status == "approved":
            payment_status = "paid"
            session_status = "complete"
        elif mp_status in ("rejected", "cancelled"):
            payment_status = "failed"
            session_status = "failed"
        elif mp_status in ("in_process", "pending"):
            payment_status = "pending"
            session_status = "pending"
    update = {
        "payment_status": payment_status,
        "status": session_status,
        "updated_at": iso(now_utc()),
    }
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
    if payment_status == "paid":
        await finalize_paid_session(session_id)
    return {
        "payment_status": payment_status,
        "status": session_status,
        "amount": float(tx.get("amount", 0)),
        "currency": tx.get("currency"),
    }


@api.get("/payments/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    return await sync_checkout_session(session_id)


@api.post("/subscriber/payments/confirm")
async def subscriber_confirm_payment(
    payload: SubscriberConfirmPaymentRequest,
    sub: dict = Depends(get_current_subscriber),
):
    tx = await db.payment_transactions.find_one({"session_id": payload.session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Sesion no encontrada")
    if tx.get("subscriber_id") != sub["id"]:
        raise HTTPException(403, "Esta sesion de pago no pertenece a tu cuenta")
    result = await sync_checkout_session(payload.session_id)
    return result


@api.post("/webhook/mercadopago")
async def mercadopago_webhook(request: Request):
    settings_doc = await get_settings_doc(public=False)
    access_token = mercado_pago_from_settings(settings_doc)
    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        body = {}
    payment_id = (
        body.get("data", {}).get("id")
        or request.query_params.get("data.id")
        or request.query_params.get("id")
    )
    if not payment_id:
        return {"ok": True}
    resp = requests.get(
        f"https://api.mercadopago.com/v1/payments/{payment_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    if resp.status_code >= 400:
        raise HTTPException(400, f"No se pudo leer pago Mercado Pago: {resp.text}")
    p = resp.json()
    session_id = p.get("external_reference")
    if not session_id:
        return {"ok": True}
    mp_status = p.get("status")
    mapped_payment = "pending"
    mapped_status = "open"
    if mp_status == "approved":
        mapped_payment = "paid"
        mapped_status = "complete"
    elif mp_status in ("rejected", "cancelled"):
        mapped_payment = "failed"
        mapped_status = "failed"
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": mapped_payment, "status": mapped_status, "event_type": "mercadopago.payment", "webhook_updated_at": iso(now_utc())}},
    )
    if mapped_payment == "paid":
        await finalize_paid_session(session_id)
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
            "theme": "crimson-knockout",
            "mp_enabled": False,
            "mp_public_key": "",
            "mp_access_token": "",
            "mp_webhook_secret": "",
        })


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.packages.create_index("id", unique=True)
    await db.subscribers.create_index("id", unique=True)
    await db.subscribers.create_index("username", unique=True, sparse=True)
    await db.payments.create_index("id", unique=True)
    await db.payments.create_index("provider_session_id", unique=True, sparse=True)
    await db.events.create_index("id", unique=True)
    await db.payment_transactions.create_index("session_id", unique=True)
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
