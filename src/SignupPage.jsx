import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { apiFetch } from "./api"; // ✅ adjust path if api.js is in src/

function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showRePass, setShowRePass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!firstName || !lastName || !email || !password || !rePassword) {
      setError("All fields are required.");
      setSuccess("");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setSuccess("");
      return;
    }

    if (password !== rePassword) {
      setError("Passwords do not match.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
      });

      setSuccess("Account created successfully! Redirecting...");
      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (err) {
      setError(err.message);
      setSuccess("");
    }
  }

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2 className="login-title">Create Your Account</h2>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Two-column name fields */}
        <div className="signup-row">
          <div className="signup-field">
            <label>First Name</label>
            <input
              type="text"
              className="login-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>

          <div className="signup-field">
            <label>Last Name</label>
            <input
              type="text"
              className="login-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        <label>Email Address</label>
        <input
          type="email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
        />

        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPass ? "text" : "password"}
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
          />
          <span className="toggle-pass" onClick={() => setShowPass(!showPass)}>
            {showPass ? "🙈" : "👁"}
          </span>
        </div>

        <label>Re-enter Password</label>
        <div className="password-wrapper">
          <input
            type={showRePass ? "text" : "password"}
            className="login-input"
            value={rePassword}
            onChange={(e) => setRePassword(e.target.value)}
            placeholder="Re-enter password"
          />
          <span
            className="toggle-pass"
            onClick={() => setShowRePass(!showRePass)}
          >
            {showRePass ? "🙈" : "👁"}
          </span>
        </div>

        <button type="submit" className="login-btn">
          Sign Up
        </button>

        <div className="login-footer">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}

export default SignupPage;
