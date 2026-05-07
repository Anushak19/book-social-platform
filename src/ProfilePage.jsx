import { useMemo, useState } from "react";
import BookCard from "./BookCard";
import "./ProfilePage.css";

function ProfilePage({ books = [], onDeleteBook, user, currentUserId }) {
  const [tab, setTab] = useState("posts"); // posts | saved | about

  const userName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : "User";

  const myBooks = useMemo(
    () => books.filter((b) => b.createdBy === currentUserId),
    [books, currentUserId]
  );

  // Saved ids stored by BookCard
  const savedIds = useMemo(() => {
    try {
      const raw = localStorage.getItem("savedBookIds");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const savedBooks = useMemo(
    () => books.filter((b) => savedIds.includes(b.id)),
    [books, savedIds]
  );

  const listToShow = tab === "posts" ? myBooks : tab === "saved" ? savedBooks : [];

  return (
    <div className="page page-container">
      {/* Top */}
      <div className="profile-top">
        <section className="card card-pad profile-card">
          <div className="profile-row">
            <div className="profile-avatar">{userName[0]?.toUpperCase() || "U"}</div>

            <div className="profile-main">
              <h2 className="profile-name">{userName}</h2>
              <p className="profile-bio muted">
                Loves reading self-help and productivity books.
              </p>

              <div className="profile-stats">
                <div className="profile-stat">
                  <div className="profile-stat-num">{myBooks.length}</div>
                  <div className="profile-stat-label">Posts</div>
                </div>

                <div className="profile-stat">
                  <div className="profile-stat-num">{savedBooks.length}</div>
                  <div className="profile-stat-label">Saved</div>
                </div>

                <div className="profile-stat">
                  <div className="profile-stat-num">{user?.followersCount ?? 0}</div>
                  <div className="profile-stat-label">Followers</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="profile-tabs">
            <button
              type="button"
              className={`profile-tab ${tab === "posts" ? "active" : ""}`}
              onClick={() => setTab("posts")}
            >
              Posts
            </button>

            <button
              type="button"
              className={`profile-tab ${tab === "saved" ? "active" : ""}`}
              onClick={() => setTab("saved")}
            >
              Saved
            </button>

            <button
              type="button"
              className={`profile-tab ${tab === "about" ? "active" : ""}`}
              onClick={() => setTab("about")}
            >
              About
            </button>
          </div>
        </section>

      </div>

      {/* Content */}
      {tab === "about" ? (
        <div className="card card-pad">
          <div className="muted" style={{ marginTop: 8 }}>
            Add your favorite genres, reading goal, and short bio here.
          </div>
        </div>
      ) : listToShow.length === 0 ? (
        <div className="card card-pad">
          <div className="h2">{tab === "saved" ? "No saved books yet" : "No posts yet"}</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {tab === "saved"
              ? "Save books from Home and they’ll appear here."
              : "Upload your first book to see it here."}
          </div>
        </div>
      ) : (
        <div className="feed-list">
          {listToShow.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onDeleteBook={onDeleteBook}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
