import { useNavigate } from "react-router-dom";
import "./PostComposer.css";

export default function PostComposer() {
  const navigate = useNavigate();

  return (
    <div className="fb-card composer">
      <div className="composer-top">
        <div className="avatar" />
        <button
          className="composer-input"
          onClick={() => navigate("/add-book")}
        >
          Share a book…
        </button>
      </div>

      <div className="composer-actions">
        <button className="composer-action" onClick={() => navigate("/add-book")}>
          📚 Add Book
        </button>
        <button className="composer-action" onClick={() => navigate("/add-book")}>
          🏷️ Tags
        </button>
        <button className="composer-action" onClick={() => navigate("/add-book")}>
          ✍️ Quote
        </button>
      </div>
    </div>
  );
}
