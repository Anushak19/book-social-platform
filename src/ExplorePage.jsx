import { useMemo, useState } from "react";
import BookCard from "./BookCard";

export default function ExplorePage({ books, onDeleteBook, currentUserId }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return books;

    return books.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();
      const summary = (b.summary || "").toLowerCase();
      return (
        title.includes(query) ||
        author.includes(query) ||
        summary.includes(query)
      );
    });
  }, [books, q]);

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Explore</h2>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search books..."
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #ddd",
          marginBottom: 12,
        }}
      />

      {filtered.length === 0 ? (
        <div className="card">
          <div className="muted">No results found.</div>
        </div>
      ) : (
        filtered.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onDeleteBook={onDeleteBook}
            currentUserId={currentUserId}
          />
        ))
      )}
    </div>
  );
}
