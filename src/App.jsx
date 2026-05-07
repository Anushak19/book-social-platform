import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import HomePage from "./HomePage";
import ExplorePage from "./ExplorePage";
import SavedPage from "./SavedPage";
import ProfilePage from "./ProfilePage";

import BookPage from "./BookPage";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import AddBookPage from "./AddBookPage";
import EditBookPage from "./EditBookPage";

import { apiFetch } from "./api";

function App() {
  const navigate = useNavigate();

  // Real auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Books state
  const [books, setBooks] = useState([]);

  // Load logged-in user (cookie-based)
  useEffect(() => {
    async function loadMe() {
      try {
        const me = await apiFetch("/api/auth/me");
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    }

    loadMe();
  }, []);

  // Load books once
  useEffect(() => {
    apiFetch("/api/books")
      .then((data) => setBooks(data || []))
      .catch((err) => console.error("Failed to load books", err));
  }, []);

  // Called after successful login
  const handleLoginSuccess = async () => {
    try {
      const me = await apiFetch("/api/auth/me");
      setUser(me);
      navigate("/");
    } catch (err) {
      console.error("Failed to load user after login", err);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    navigate("/login");
  };

  // CREATE
  const handleAddBook = async (newBookData) => {
    try {
      const createdBook = await apiFetch("/api/books", {
        method: "POST",
        body: JSON.stringify(newBookData),
      });

      setBooks((prev) => [createdBook, ...prev]);
    } catch (err) {
      console.error("Failed to add book", err);
      alert("Failed to add book. Check console.");
    }
  };

  // DELETE
  const handleDeleteBook = async (id) => {
    try {
      await apiFetch(`/api/books/${id}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete book", err);
      alert("Delete failed. Check console.");
    }
  };

  // UPDATE
  const handleUpdateBook = async (id, updatedData) => {
    try {
      const updatedBook = await apiFetch(`/api/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });

      setBooks((prev) => prev.map((b) => (b.id === id ? updatedBook : b)));
    } catch (err) {
      console.error("Failed to update book", err);
      alert("Update failed. Check console.");
    }
  };

  // While checking auth
  if (authLoading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  // Auth routes only when logged out
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage onLogin={handleLoginSuccess} />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  // Logged in UI
  return (
    <div className="app-root">
      <Navbar
        onLogout={handleLogout}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="app-body">
        <Sidebar />

        <main className="app-main">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  books={books}
                  onDeleteBook={handleDeleteBook}
                  currentUserId={user.id}
                  searchQuery={searchQuery}
                />
              }
            />
            <Route
              path="/explore"
              element={
                <ExplorePage
                  books={books}
                  onDeleteBook={handleDeleteBook}
                  currentUserId={user.id}
                />
              }
            />
            <Route
              path="/saved"
              element={
                <SavedPage
                  books={books}
                  onDeleteBook={handleDeleteBook}
                  currentUserId={user.id}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <ProfilePage
                  books={books}
                  onDeleteBook={handleDeleteBook}
                  user={user}
                  currentUserId={user.id}
                />
              }
            />

            <Route path="/books/:id" element={<BookPage books={books} />} />
            <Route
              path="/books/:id/edit"
              element={<EditBookPage books={books} onUpdateBook={handleUpdateBook} />}
            />
            <Route path="/add-book" element={<AddBookPage onAddBook={handleAddBook} />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
