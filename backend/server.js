import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import { HfInference } from "@huggingface/inference";

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const hf = new HfInference(process.env.HF_API_KEY);

app.use(cors());

app.post("/predict", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;

    const result = await hf.imageClassification({
      model: "Abuzaid01/plant-disease-classifier",
      data: imageBuffer,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
