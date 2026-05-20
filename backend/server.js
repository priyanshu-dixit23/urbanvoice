const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: "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" });

// Transcribe audio using Groq Whisper
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
    });
    fs.unlinkSync(req.file.path);
    res.json({ text: transcription.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// Generate government response using Groq
app.post("/generate-response", async (req, res) => {
  try {
    const { issue } = req.body;
    const completion = await groq.chat.completions.create({
     model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful government official responding to citizen complaints. Be empathetic, professional, and provide actionable responses in 2-3 sentences.",
        },
        {
          role: "user",
          content: `Citizen issue: ${issue}`,
        },
      ],
    });
    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Response generation failed" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});