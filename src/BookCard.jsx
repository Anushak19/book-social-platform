import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./BookCard.css";
import { apiFetch } from "./api";

const LS_KEY = "savedBookIds";

// ---------- localStorage helpers (for Save only) ----------
function readSavedIds() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function writeSavedIds(ids) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

// ---------- time helper ----------
function timeAgo(dateString) {
  if (!dateString) return "—";
  // Backend sends: 2026-01-16T19:10:46.966000  (UTC but no Z)
  const d = new Date(`${String(dateString).replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  if (diff < 0) return "Just now";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function normalizeComments(comments) {
  if (!Array.isArray(comments)) return [];
  return comments
    .map((c, idx) => ({
      id: c?.id || c?._id || `${c?.createdAt || "c"}-${idx}`,
      user: c?.userName || c?.user || "User",
      text: c?.text || "",
    }))
    .filter((c) => c.text.trim().length > 0);
}

function BookCard({ book, onDeleteBook, currentUserId }) {
  const id = book?.id;
  const title = book?.title ?? "";
  const author = book?.author ?? "";
  const summary = book?.summary ?? "";

  const postedBy = book?.createdByName || book?.author || "Unknown";
  const postedTime = timeAgo(book?.createdAt);

  const isOwner =
    Boolean(book?.createdBy) &&
    Boolean(currentUserId) &&
    book.createdBy === currentUserId;

  // ----- Likes / Comments are persisted in DB (via API) -----
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);

  // Keep UI state in sync when "book" changes (after refresh / fetch)
  useEffect(() => {
    const likedBy = Array.isArray(book?.likedBy) ? book.likedBy : [];
    setLiked(Boolean(currentUserId) && likedBy.includes(currentUserId));
    setLikeCount(likedBy.length);
    setComments(normalizeComments(book?.comments));
  }, [book, currentUserId]);

  async function handleLikeClick() {
    if (!id) return;
    try {
      const data = await apiFetch(`/api/books/${id}/like`, { method: "POST" });
      setLiked(Boolean(data?.liked));
      setLikeCount(Number.isFinite(data?.likeCount) ? data.likeCount : likeCount);
    } catch (e) {
      alert(e?.message || "Like failed");
    }
  }

  async function handleAddComment() {
    const text = commentText.trim();
    if (!text || !id) return;

    try {
      // Requires backend endpoint: POST /api/books/{id}/comments
      const newComment = await apiFetch(`/api/books/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      // Normalize for UI
      const uiComment = {
        id: newComment?.id || Date.now(),
        user: newComment?.userName || newComment?.user || "You",
        text: newComment?.text || text,
      };

      setComments((prev) => [...prev, uiComment]);
      setCommentText("");
    } catch (e) {
      alert(e?.message || "Comment failed");
    }
  }

  function handleDelete() {
    if (!id) return;
    if (typeof onDeleteBook !== "function") return;
    if (window.confirm("Delete this book?")) onDeleteBook(id);
  }

  // ----- Save (localStorage only) -----
  const [savedIds, setSavedIds] = useState(() => readSavedIds());
  const isSaved = useMemo(() => savedIds.includes(id), [savedIds, id]);

  useEffect(() => {
    const onStorage = () => setSavedIds(readSavedIds());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleSave() {
    if (!id) return;
    const next = isSaved ? savedIds.filter((x) => x !== id) : [id, ...savedIds];
    setSavedIds(next);
    writeSavedIds(next);
  }

  const commentRef = useRef(null);

  return (
    <article className="card card-pad book-card">
      {/* Header */}
      <div className="post-header">
        <div className="post-header-left">
          <div className="post-avatar">
            {postedBy?.[0]?.toUpperCase() || "U"}
          </div>

          <div className="post-meta">
            <div className="post-name">{postedBy}</div>
            <div className="post-time">{postedTime}</div>
          </div>
        </div>

        <button className="icon-btn" type="button" title="More">
          ⋯
        </button>
      </div>

      {/* Body */}
      <div className="book-body">
        <div className="book-cover" aria-hidden="true" />

        <div className="book-content">
          <h3 className="book-title">
            <Link className="book-link" to={id ? `/books/${id}` : "#"}>
              {title || "Untitled"}
            </Link>
          </h3>

          {author ? <div className="book-author">by {author}</div> : null}
          {summary ? <p className="book-summary">{summary}</p> : null}
        </div>
      </div>

      <div className="divider" />

      {/* Actions */}
      <div className="actions-row">
        <button className="btn btn-ghost" type="button" onClick={handleLikeClick}>
          {liked ? "💙 Liked" : "🤍 Like"}{" "}
          <span className="muted">({likeCount})</span>
        </button>

        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => commentRef.current?.focus()}
        >
          💬 Comment
        </button>

        <button className="btn btn-ghost" type="button" onClick={toggleSave}>
          {isSaved ? "⭐ Saved" : "☆ Save"}
        </button>

        {isOwner && (
          <button className="btn btn-ghost danger" type="button" onClick={handleDelete}>
            🗑 Delete
          </button>
        )}
      </div>

      {/* Comment box */}
      <div className="comment-box">
        <input
          ref={commentRef}
          className="input"
          type="text"
          placeholder="Write a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddComment();
          }}
        />
        <button className="btn btn-primary" type="button" onClick={handleAddComment}>
          Post
        </button>
      </div>

      {/* Comments */}
      <div className="comments-title">Comments</div>

      {comments.length === 0 ? (
        <div className="text-sm muted">No comments yet</div>
      ) : (
        <div className="comments-list">
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <span className="comment-user">{c.user}</span>
              <span className="comment-text">{c.text}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default BookCard;
