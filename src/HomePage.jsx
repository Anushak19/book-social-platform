import PostComposer from "./PostComposer";
import BookCard from "./BookCard";
import "./HomePage.css";

function HomePage({
  books = [],
  onDeleteBook,
  currentUserId,
  searchQuery = "",
}) {
  const q = (searchQuery || "").trim().toLowerCase();

  const filteredBooks = q
    ? books.filter((b) => {
        const title = (b.title || "").toLowerCase();
        const author = (b.author || "").toLowerCase();
        const desc = (b.summary || b.description||b.desc || "").toLowerCase();
        return title.includes(q) || author.includes(q) || desc.includes(q);
      })
    : books;

  return (
    <div className="page page-container">
      <div className="page-header">
        <h2 className="page-title">Home</h2>
        <p className="page-subtitle">Share and discover books.</p>
      </div>

      <div className="home-composer card card-pad">
        <PostComposer />
      </div>

      {filteredBooks.length === 0 ? (
        <div className="card card-pad home-empty">
          <h3 className="h2">No books found</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            {q
              ? "Try a different search."
              : "Be the first to share a book using the box above."}
          </p>
        </div>
      ) : (
        <div className="feed-list">
          {filteredBooks.map((book) => (
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

export default HomePage;
