import { useMemo } from "react";
import BookCard from "./BookCard";

const LS_KEY = "savedBookIds";

function getSavedIds() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SavedPage({ books = [], onDeleteBook, currentUserId }) {
  const savedBooks = useMemo(() => {
    const ids = new Set(getSavedIds());
    return books.filter((b) => ids.has(b.id));
  }, [books]);

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Saved</h2>

      {savedBooks.length === 0 ? (
        <div className="card">
          <div className="muted">No saved books yet.</div>
        </div>
      ) : (
        savedBooks.map((book) => (
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
