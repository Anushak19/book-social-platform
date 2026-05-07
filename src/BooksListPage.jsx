import { useEffect, useState } from "react";

export default function BooksListPage() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/books")
      .then(res => res.json())
      .then(data => setBooks(data));
  }, []);

  return (
    <div>
      <h2>Books</h2>
      {books.map(b => (
        <p key={b.id}>{b.title}</p>
      ))}
    </div>
  );
}
