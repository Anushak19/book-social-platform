import { useEffect, useState } from "react";

export default function BackendTest() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend not reachable"));
  }, []);

  return <h3>{message}</h3>;
}
