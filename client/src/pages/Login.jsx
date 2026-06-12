import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    if (!username || !password) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const response = await axios.post(
        "http://https://balanced-light-production-e602.up.railway.app/api/auth/login",
        { username, password }
      );

      localStorage.setItem("token", response.data.token);
      toast.success("Welcome back");
      navigate("/");
    } catch (error) {
      toast.error("Invalid username or password");
      console.log(error);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <div style={{
            background: "#e8650a",
            borderRadius: "16px",
            padding: "12px 20px",
            marginBottom: "20px",
            display: "inline-block",
          }}>
            <img
              src="/stc_logo.png"
              alt="Kshethropasana"
              style={{
                height: "56px",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          <h1 style={{ fontSize: "18px", marginBottom: "4px" }}>
            Kshethropasana
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
            Payroll Management System
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginBottom: "0" }}>
            Sign in to continue
          </p>
        </div>

        <div className="login-form">
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button className="login-btn" onClick={handleLogin}>
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
