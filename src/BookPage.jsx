import { Link, useParams, useNavigate } from "react-router-dom";
import BookDetails from "./BookDetails";
import BookAIBox from "./BookAIBox";

function BookPage({ books = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // ✅ prevents showing "Book not found" while books are still loading
  if (books.length === 0) {
    return (
      <div>
        <h2>Book Details</h2>
        <p>Loading...</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  // ✅ MongoDB ids are strings
  const book = books.find((b) => String(b.id) === String(id));

  if (!book) {
    return (
      <div>
        <h2>Book Details</h2>
        <p style={{ color: "red" }}>Book not found.</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <Link to="/">← Back</Link>

        <button
          type="button"
          onClick={() => navigate(`/books/${book.id}/edit`)}
          style={{
            border: "1px solid #ccc",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",
            background: "white",
          }}
        >
          ✏️ Edit
        </button>
      </div>

      <h2 style={{ marginTop: 0, marginBottom: "10px" }}>
        {book.title} – Details
      </h2>

      <p style={{ marginTop: 0, marginBottom: "16px", color: "#555" }}>
        Full summary, key insights and chapters.
      </p>

      <BookDetails
        title={book.title}
        author={book.author}
        summary={book.summary}
        insights={book.insights}
        chapters={book.chapters}
      /> 
      <BookAIBox bookId={book.id} />
    </div>
  );
}

export default BookPage;
