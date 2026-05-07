import { useState } from "react";
import { apiFetch } from "./api";
import "./BookAIBox.css";

function BookAIBox({ bookId }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(e) {
    e.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const data = await apiFetch(`/api/books/${bookId}/ask`, {
        method: "POST",
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      setAnswer(data.answer || "No answer returned.");
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setError(err.message || "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }

  function getSourceIcon(source) {
    if (source.startsWith("Summary")) return "📘";
    if (source.startsWith("Author")) return "👤";
    if (source.startsWith("Title")) return "🏷️";
    if (source.startsWith("Insight")) return "💡";
    if (source.startsWith("Chapter")) return "📚";
    if (source.startsWith("User review")) return "💬";
    return "📄";
  }

  function getAnswerIcon() {
    const q = question.toLowerCase();

    if (q.includes("who")) return "👤";
    if (q.includes("what")) return "📘";
    if (q.includes("summary")) return "📝";
    return "🤖";
  }

  return (
    <div className="book-ai-box">
      <h2>Ask AI About This Book</h2>

      <form onSubmit={handleAsk} className="book-ai-form">
        <textarea
          className="book-ai-textarea"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about this book..."
          rows={4}
        />

        <button
          type="submit"
          className="book-ai-button"
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </form>

      {error && <p className="book-ai-error">{error}</p>}

      {(answer || sources.length > 0) && (
        <div className="book-ai-result">
          <h3>Answer</h3>
          <div className="book-ai-answer">
            <span className="book-ai-answer-icon">{getAnswerIcon()}</span>
            <span>{answer}</span>
          </div>

          {sources.length > 0 && (
            <>
              <h3>Sources</h3>
              <ul className="book-ai-sources">
                {sources.map((source, index) => (
                  <li key={index}>
                    <span className="book-ai-source-icon">
                      {getSourceIcon(source)}
                    </span>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default BookAIBox;