import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import { HfInference } from "@huggingface/inference";

dotenv.config();
const app = express();
app.use(cors()); // Allow requests from any origin
const upload = multer({ storage: multer.memoryStorage() });

const hf = new HfInference(process.env.HF_API_KEY);

app.post("/predict", upload.single("image"), async (req, res) => {
  try {
    const result = await hf.imageClassification({
      model: "Abuzaid01/plant-disease-classifier",
      data: req.file.buffer,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
