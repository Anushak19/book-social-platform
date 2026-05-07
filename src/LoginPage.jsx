import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./LoginPage.css";
import BackendTest from "./BackendTest";
import { apiFetch } from "./api";
import { GoogleLogin } from "@react-oauth/google";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Let App.jsx fetch /api/auth/me and set user
      if (onLogin) await onLogin();

      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Welcome Back</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                setError("");

                await apiFetch("/api/auth/google", {
                  method: "POST",
                  body: JSON.stringify({
                    credential: credentialResponse?.credential,
                  }),
                });

                if (onLogin) await onLogin();
                navigate("/");
              } catch (err) {
                setError(err.message || "Google login failed");
              }
            }}
            onError={() => setError("Google login failed. Please try again.")}
          />
        </div>

        <div className="login-separator">
          <span></span>
          <p>or continue with email</p>
          <span></span>
        </div>

        <label>Email</label>
        <input
          type="email"
          className="login-input"
          placeholder="test@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type={showPass ? "text" : "password"}
          className="login-input"
          placeholder="123456"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div style={{ marginBottom: "10px", fontSize: "13px" }}>
          <input
            type="checkbox"
            checked={showPass}
            onChange={() => setShowPass((s) => !s)}
            style={{ marginRight: "6px" }}
          />
          Show Password
        </div>

        <button type="submit" className="login-btn">
          Login
        </button>

        <div className="login-footer">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </div>
      </form>

      <BackendTest />
    </div>
  );
}

export default LoginPage;
