import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import axios from "axios";
import "./App.css";

function App() {
  const [issues, setIssues] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("report");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    fetchIssues();
    getLocation();
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      });
    }
  };

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });
    setIssues(data || []);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      setLoading(true);
      try {
        const res = await axios.post("http://localhost:5000/transcribe", formData);
        setDescription(res.data.text);
      } catch {
        alert("Transcription failed. Check backend!");
      }
      setLoading(false);
    };
    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const submitIssue = async () => {
    if (!title || !description) return alert("Please fill title and description!");
    setLoading(true);
    try {
      const genRes = await axios.post("http://localhost:5000/generate-response", {
        issue: `${title}: ${description}`,
      });
      const response = genRes.data.response;
      await supabase.from("issues").insert([{
        title, description, location, latitude, longitude, response, status: "Pending"
      }]);
      setTitle("");
      setDescription("");
      fetchIssues();
      setActiveTab("dashboard");
      alert("Issue submitted successfully!");
    } catch {
      alert("Submission failed. Check backend!");
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🏙️ UrbanVoice</h1>
        <p>Your Voice. Your City. Your Change.</p>
        <div className="tabs">
          <button className={activeTab === "report" ? "active" : ""} onClick={() => setActiveTab("report")}>
            📝 Report Issue
          </button>
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            📊 Dashboard
          </button>
        </div>
      </header>

      {activeTab === "report" && (
        <div className="form-container">
          <h2>Report a Civic Issue</h2>
          <input
            placeholder="Issue Title (e.g. Broken Road)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Describe the issue or use voice recording..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <div className="voice-section">
            {!recording ? (
              <button className="record-btn" onClick={startRecording}>
                🎤 Start Voice Recording
              </button>
            ) : (
              <button className="stop-btn" onClick={stopRecording}>
                ⏹️ Stop Recording
              </button>
            )}
          </div>
          <div className="location-box">
            📍 Location: {location || "Detecting..."}
          </div>
          <button
            className="submit-btn"
            onClick={submitIssue}
            disabled={loading}
          >
            {loading ? "Processing..." : "🚀 Submit Issue"}
          </button>
        </div>
      )}

      {activeTab === "dashboard" && (
        <div className="dashboard">
          <h2>Issue Dashboard</h2>
          {issues.length === 0 ? (
            <p className="no-issues">No issues reported yet!</p>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="issue-card">
                <div className="issue-header">
                  <h3>{issue.title}</h3>
                  <span className={`status ${issue.status.toLowerCase()}`}>
                    {issue.status}
                  </span>
                </div>
                <p className="issue-desc">{issue.description}</p>
                <div className="issue-response">
                  <strong>🏛️ Government Response:</strong>
                  <p>{issue.response}</p>
                </div>
                <div className="issue-footer">
                  📍 {issue.location} | 🕐 {new Date(issue.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;