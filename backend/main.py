"""
BookSocial Backend (FastAPI + MongoDB + Redis Sessions + RAG with Qwen)

Features
✅ Books CRUD
✅ Signup/Login
✅ Google login
✅ Like + Comment
✅ Email notifications
✅ Cookie-based auth + CSRF protection
✅ Book Q&A with RAG
"""

import os
import json
import smtplib
import secrets
from email.message import EmailMessage
from datetime import datetime, timedelta
from typing import Optional

import torch
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jose import jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel
from redis.asyncio import Redis
from sentence_transformers import SentenceTransformer, util
from transformers import AutoTokenizer, AutoModelForCausalLM


# -----------------------------
# App
# -----------------------------
load_dotenv()
app = FastAPI()

# -----------------------------
# Allowed origins
# -----------------------------
ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://bookapp.localhost:5173",
    # "https://your-production-domain.com",
}

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# MongoDB
# -----------------------------
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client["book_app"]

books_collection = db["books"]
users_collection = db["users"]

# -----------------------------
# Security / Auth
# -----------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set in .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

COOKIE_NAME = "access_token"
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

COOKIE_MAX_AGE = 60 * 60 * 24 * 30
COOKIE_SECURE = False
COOKIE_SAMESITE = "lax"

# -----------------------------
# Redis Session
# -----------------------------
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client: Redis = Redis.from_url(REDIS_URL, decode_responses=True)

SESSION_COOKIE_NAME = "session_id"
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", str(60 * 60 * 24 * 7)))
SESSION_COOKIE_SECURE = COOKIE_SECURE
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE

# -----------------------------
# Embedding model
# -----------------------------
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# -----------------------------
# Qwen model
# -----------------------------
QWEN_MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(QWEN_MODEL_NAME)
llm_model = AutoModelForCausalLM.from_pretrained(
    QWEN_MODEL_NAME,
    torch_dtype="auto",
    device_map="auto"
)
llm_model.eval()


# -----------------------------
# Helper functions
# -----------------------------
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookies(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=COOKIE_MAX_AGE,
    )

    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=COOKIE_MAX_AGE,
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


async def create_session(response: Response, user_id: str):
    session_id = secrets.token_urlsafe(32)
    key = f"session:{session_id}"

    data = {
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
    }

    await redis_client.set(key, json.dumps(data), ex=SESSION_TTL_SECONDS)

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        path="/",
        max_age=SESSION_TTL_SECONDS,
    )


async def get_session_user_id(request: Request) -> Optional[str]:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return None

    raw = await redis_client.get(f"session:{session_id}")
    if not raw:
        return None

    try:
        data = json.loads(raw)
        return data.get("user_id")
    except Exception:
        return None


async def destroy_session(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        await redis_client.delete(f"session:{session_id}")

    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


def enforce_csrf(request: Request):
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    origin = request.headers.get("origin")
    if origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="CSRF blocked: bad origin")

    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get(CSRF_HEADER_NAME)

    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=403, detail="CSRF validation failed")


async def get_current_user(request: Request):
    user_id = await get_session_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = await users_collection.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": str(user["_id"]),
        "firstName": user.get("firstName", ""),
        "lastName": user.get("lastName", ""),
        "email": user.get("email", ""),
        "createdAt": user.get("createdAt"),
    }


def set_csrf_cookie(response: Response):
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=COOKIE_MAX_AGE,
    )


def clear_csrf_cookie(response: Response):
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


def send_email(to_email: str, subject: str, body: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    from_email = os.getenv("FROM_EMAIL", smtp_user)

    if not smtp_host or not smtp_user or not smtp_pass or not from_email:
        print("⚠️ Email not configured. Skipping email.")
        return

    try:
        msg = EmailMessage()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        print("❌ Email send failed:", repr(e))


async def get_user_doc_by_str_id(user_id: str):
    try:
        oid = ObjectId(user_id)
    except Exception:
        return None
    return await users_collection.find_one({"_id": oid})


def display_name(user: dict) -> str:
    name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
    return name if name else "Someone"


def generate_answer_with_qwen(question: str, context: str, max_new_tokens: int = 180) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are an AI assistant for a book app.\n"
                "Answer ONLY using the provided context.\n"
                "Be concise and direct.\n"
                "Do NOT explain your reasoning.\n"
                "If the answer is clearly stated, return it directly.\n"
                "If not found, say: Not mentioned in the provided book content."
            ),
        },
        {
            "role": "user",
            "content": f"""
Context:
{context}

Question:
{question}

Instructions:
- Give a short and direct answer
- Do not infer or assume
- Do not add extra explanation.
""",
        },
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(text, return_tensors="pt")
    inputs = {k: v.to(llm_model.device) for k, v in inputs.items()}

    with torch.no_grad():
        generated_ids = llm_model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id,
        )

    input_length = inputs["input_ids"].shape[1]
    new_token_ids = generated_ids[0][input_length:]

    answer = tokenizer.decode(new_token_ids, skip_special_tokens=True).strip()
    return answer


# -----------------------------
# Pydantic models
# -----------------------------
class BookCreate(BaseModel):
    title: str
    author: str
    summary: str


class SignupRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class CommentCreate(BaseModel):
    text: str


class AskBookRequest(BaseModel):
    question: str


# -----------------------------
# Health
# -----------------------------
@app.get("/api/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True, "mongo": "connected"}
    except Exception as e:
        return {"ok": False, "mongo": "not connected", "error": str(e)}


# -----------------------------
# Books
# -----------------------------
@app.get("/api/books")
async def get_books():
    books = []
    async for b in books_collection.find({}):
        b["id"] = str(b["_id"])
        del b["_id"]
        books.append(b)
    return books


@app.get("/api/books/{book_id}")
async def get_book(book_id: str):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book["id"] = str(book["_id"])
    del book["_id"]
    return book


@app.post("/api/books", status_code=201)
async def add_book(
    book: BookCreate,
    current_user=Depends(get_current_user),
    csrf=Depends(enforce_csrf),
):
    doc = book.model_dump()
    doc["createdAt"] = datetime.utcnow()
    doc["createdBy"] = current_user["id"]
    doc["createdByName"] = display_name(current_user)
    doc["likedBy"] = []
    doc["comments"] = []

    result = await books_collection.insert_one(doc)

    created = await books_collection.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])
    del created["_id"]
    return created


@app.put("/api/books/{book_id}")
async def update_book(
    book_id: str,
    updated: BookCreate,
    current_user=Depends(get_current_user),
    csrf=Depends(enforce_csrf),
):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book.get("createdBy") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You cannot edit this book")

    await books_collection.update_one({"_id": oid}, {"$set": updated.model_dump()})

    book = await books_collection.find_one({"_id": oid})
    book["id"] = str(book["_id"])
    del book["_id"]
    return book


@app.delete("/api/books/{book_id}")
async def delete_book(
    book_id: str,
    current_user=Depends(get_current_user),
    csrf=Depends(enforce_csrf),
):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book.get("createdBy") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You cannot delete this book")

    result = await books_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")

    return {"ok": True, "message": "Book deleted"}


# -----------------------------
# Book AI / RAG
# -----------------------------
@app.post("/api/books/{book_id}/ask")
async def ask_book(book_id: str, payload: AskBookRequest, user=Depends(get_current_user)):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    documents = []

    if book.get("title"):
        documents.append(f"Title: {book['title']}")

    if book.get("author"):
        documents.append(f"Author: {book['author']}")

    if book.get("summary"):
        documents.append(f"Summary: {book['summary']}")

    if book.get("insights"):
        if isinstance(book["insights"], list):
            for item in book["insights"]:
                documents.append(f"Insight: {item}")
        else:
            documents.append(f"Insights: {book['insights']}")

    if book.get("chapters"):
        if isinstance(book["chapters"], list):
            for ch in book["chapters"]:
                documents.append(f"Chapter: {ch}")
        else:
            documents.append(f"Chapters: {book['chapters']}")

    for c in book.get("comments", []):
        text = (c.get("text") or "").strip()
        if not text:
            continue

        # skip very short/noisy comments
        if len(text) < 25:
            continue

        documents.append(f"User review: {text}")

    if not documents:
        return {
            "answer": "No content available for this book.",
            "sources": []
        }

    boosted_documents = []

    for d in documents:
        if d.startswith("Summary:"):
            boosted_documents.append(d)
            boosted_documents.append(d)
        elif d.startswith("Author:"):
            boosted_documents.append(d)
            boosted_documents.append(d)
        else:
            boosted_documents.append(d)

    documents = boosted_documents

    doc_embeddings = embed_model.encode(documents, convert_to_tensor=True)
    query_embedding = embed_model.encode(question, convert_to_tensor=True)

    scores = util.cos_sim(query_embedding, doc_embeddings)[0]
    top_k = min(5, len(documents))
    top_results = torch.topk(scores, k=top_k)

    retrieved = []
    for idx in top_results.indices:
        retrieved.append(documents[idx])

    summary_chunks = [d for d in documents if d.startswith("Summary:")]
    retrieved = summary_chunks + retrieved
    retrieved = list(dict.fromkeys(retrieved))

    if not retrieved:
        return {
            "answer": "Not mentioned in the provided book content.",
            "sources": []
        }

    context = "\n".join(retrieved)
    answer = generate_answer_with_qwen(question, context)

    return {
        "answer": answer,
        "sources": retrieved
    }

# -----------------------------
# Likes
# -----------------------------
@app.post("/api/books/{book_id}/like")
async def toggle_like(
    book_id: str,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    csrf=Depends(enforce_csrf),
):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    user_id = current_user["id"]
    liked_by = book.get("likedBy", [])

    if user_id in liked_by:
        await books_collection.update_one({"_id": oid}, {"$pull": {"likedBy": user_id}})
        liked = False
    else:
        await books_collection.update_one({"_id": oid}, {"$addToSet": {"likedBy": user_id}})
        liked = True

        owner_id = book.get("createdBy")
        if owner_id and owner_id != user_id:
            owner = await get_user_doc_by_str_id(owner_id)
            if owner and owner.get("email"):
                from_name = display_name(current_user)
                owner_first = owner.get("firstName", "") or "there"
                title = book.get("title", "your post")

                app_url = os.getenv("APP_BASE_URL", "http://localhost:5173")
                post_link = f"{app_url}/"

                subject = f"{from_name} liked your post"
                body = (
                    f"Hi {owner_first},\n\n"
                    f"{from_name} liked your post: {title}\n\n"
                    f"Open the app: {post_link}\n\n"
                    f"- BookSocial"
                )

                background_tasks.add_task(send_email, owner["email"], subject, body)

    updated = await books_collection.find_one({"_id": oid}, {"likedBy": 1})
    like_count = len(updated.get("likedBy", []))

    return {"liked": liked, "likeCount": like_count}


# -----------------------------
# Comments
# -----------------------------
@app.post("/api/books/{book_id}/comments", status_code=201)
async def add_comment(
    book_id: str,
    data: CommentCreate,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    csrf=Depends(enforce_csrf),
):
    try:
        oid = ObjectId(book_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid book id")

    book = await books_collection.find_one({"_id": oid})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    commenter_name = display_name(current_user)

    comment = {
        "id": str(ObjectId()),
        "userId": current_user["id"],
        "userName": commenter_name,
        "text": text,
        "createdAt": datetime.utcnow(),
    }

    await books_collection.update_one({"_id": oid}, {"$push": {"comments": comment}})

    owner_id = book.get("createdBy")
    if owner_id and owner_id != current_user["id"]:
        owner = await get_user_doc_by_str_id(owner_id)
        if owner and owner.get("email"):
            owner_first = owner.get("firstName", "") or "there"
            title = book.get("title", "your post")

            app_url = os.getenv("APP_BASE_URL", "http://localhost:5173")
            post_link = f"{app_url}/"

            subject = f"{commenter_name} commented on your post"
            body = (
                f"Hi {owner_first},\n\n"
                f"{commenter_name} commented on your post: {title}\n\n"
                f"Comment:\n{text}\n\n"
                f"Open the app: {post_link}\n\n"
                f"- BookSocial"
            )

            background_tasks.add_task(send_email, owner["email"], subject, body)

    return comment


# -----------------------------
# Auth
# -----------------------------
@app.post("/api/auth/signup", status_code=201)
async def signup(data: SignupRequest, background_tasks: BackgroundTasks):
    email = data.email.strip().lower()

    existing = await users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    user_doc = {
        "firstName": data.firstName.strip(),
        "lastName": data.lastName.strip(),
        "email": email,
        "passwordHash": hash_password(data.password),
        "createdAt": datetime.utcnow(),
    }

    result = await users_collection.insert_one(user_doc)

    subject = "Welcome to BookSocial 👋"
    body = (
        f"Hi {user_doc['firstName']},\n\n"
        "Welcome to BookSocial! Your account is created successfully.\n\n"
        f"Open the app: {os.getenv('APP_BASE_URL', 'http://localhost:5173')}\n\n"
        "- BookSocial"
    )
    background_tasks.add_task(send_email, user_doc["email"], subject, body)

    return {
        "id": str(result.inserted_id),
        "firstName": user_doc["firstName"],
        "lastName": user_doc["lastName"],
        "email": user_doc["email"],
    }


@app.post("/api/auth/login")
async def login(data: LoginRequest, response: Response):
    email = data.email.strip().lower()

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("passwordHash") or not verify_password(data.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await create_session(response, str(user["_id"]))
    set_csrf_cookie(response)
    return {"ok": True}


@app.post("/api/auth/google")
async def google_login(data: GoogleAuthRequest, response: Response):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not set in .env")

    try:
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            google_client_id,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = (idinfo.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email")

    if idinfo.get("email_verified") is False:
        raise HTTPException(status_code=400, detail="Google email not verified")

    user = await users_collection.find_one({"email": email})
    if not user:
        user_doc = {
            "firstName": (idinfo.get("given_name") or "").strip(),
            "lastName": (idinfo.get("family_name") or "").strip(),
            "email": email,
            "passwordHash": None,
            "provider": "google",
            "googleSub": idinfo.get("sub"),
            "createdAt": datetime.utcnow(),
        }
        result = await users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
    else:
        user_id = str(user["_id"])

    await create_session(response, user_id)
    set_csrf_cookie(response)
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@app.get("/api/auth/me")
async def me(current_user=Depends(get_current_user)):
    return current_user


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    await destroy_session(request, response)
    clear_csrf_cookie(response)
    return {"ok": True}