import "./BookDetails.css";

function BookDetails({ title, author, summary, insights, chapters }) {
  return (
    <div className="book-details">
      {/* Header */}
      <h2 className="book-details-header">{title}</h2>
      <p className="book-details-author">
        <strong>Author:</strong> {author}
      </p>

      {/* Summary */}
      <section className="book-details-section">
        <h3 className="book-details-section-title">Full Summary</h3>
        <p className="book-details-summary">{summary}</p>
      </section>

      {/* Key insights */}
      <section className="book-details-section">
        <h3 className="book-details-section-title">Key Insights</h3>
        <ul className="book-details-list">
          {(insights || []).map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </section>

      {/* Chapters */}
      <section className="book-details-section">
        <h3 className="book-details-section-title">Chapters</h3>
        <ol className="book-details-list">
          {(chapters || []).map((ch, index) => (
            <li key={index}>
              <strong>{ch.name}:</strong> {ch.description}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default BookDetails;
