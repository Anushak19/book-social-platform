import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function EditBookPage({ books = [], onUpdateBook }) {
  const { id } = useParams();
  const navigate = useNavigate();

  if (books.length === 0) return <p>Loading...</p>;

  // ✅ MongoDB id is a STRING
  const book = books.find((b) => String(b.id) === String(id));

  const [title, setTitle] = useState(book?.title || "");
  const [author, setAuthor] = useState(book?.author || "");
  const [summary, setSummary] = useState(book?.summary || "");

  if (!book) return <p style={{ color: "red" }}>Book not found.</p>;

  const handleSubmit = async (e) => {
    e.preventDefault();

    await onUpdateBook(book.id, {
      title: title.trim(),
      author: author.trim(),
      summary: summary.trim(),
    });

    navigate(`/books/${book.id}`);
  };

  return (
    <div>
      <h2>Edit Book</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary"
            rows={4}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
