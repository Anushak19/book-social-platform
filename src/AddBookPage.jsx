import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddBookPage.css";   // ✅ make sure this line exists

function AddBookPage({ onAddBook }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !author.trim() || !summary.trim()) {
      alert("Please fill in title, author, and summary.");
      return;
    }

    await onAddBook({
      title: title.trim(),
      author: author.trim(),
      summary: summary.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setTitle("");
    setAuthor("");
    setSummary("");
    setTags("");

    navigate("/");
  };

  return (
    <div className="add-book-page">
      <h2>Add a New Book</h2>
      <p className="page-subtitle">
        Share a book with your friends by filling in the details below.
      </p>

      <form className="add-book-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Title</span>
          <input
            type="text"
            placeholder="e.g., Atomic Habits"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Author</span>
          <input
            type="text"
            placeholder="e.g., James Clear"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Summary</span>
          <textarea
            rows="4"
            placeholder="Write a short summary of the book..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">
            Tags <span className="optional">(optional)</span>
          </span>
          <input
            type="text"
            placeholder="e.g., habits, productivity"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <small className="helper-text">Separate tags with commas.</small>
        </label>

        <button type="submit" className="primary-btn">
          Add Book
        </button>
      </form>
    </div>
  );
}

export default AddBookPage;
