import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import { HfInference } from "@huggingface/inference";

dotenv.config();
const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize HF Inference with error handling
let hf;
try {
  if (!process.env.HF_API_KEY) {
    throw new Error('HF_API_KEY is missing in environment variables');
  }
  hf = new HfInference(process.env.HF_API_KEY);
} catch (err) {
  console.error('HuggingFace initialization failed:', err.message);
  process.exit(1);
}

const MODEL_NAME = "Abuzaid01/plant-disease-classifier";
const FALLBACK_MODEL = "nateraw/plant-disease";

// Verify models exist
const validateModel = async (modelName) => {
  try {
    const modelInfo = await hf.modelStatus(modelName);
    if (!modelInfo.available) {
      throw new Error(`Model ${modelName} not available`);
    }
    return true;
  } catch (err) {
    console.error(`Model validation failed for ${modelName}:`, err.message);
    return false;
  }
};

// Health check with model validation
app.get("/health", async (req, res) => {
  try {
    const modelsValid = {
      primary: await validateModel(MODEL_NAME),
      fallback: await validateModel(FALLBACK_MODEL)
    };

    res.status(200).json({
      status: modelsValid.primary ? "healthy" : "degraded",
      models: {
        primary: MODEL_NAME,
        primaryStatus: modelsValid.primary ? "available" : "unavailable",
        fallback: FALLBACK_MODEL,
        fallbackStatus: modelsValid.fallback ? "available" : "unavailable"
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: err.message
    });
  }
});

// Enhanced prediction endpoint
app.post("/predict", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: "No image provided",
      suggestion: "Send an image file using the 'file' field name"
    });
  }

  console.log(`Processing ${req.file.size} byte ${req.file.mimetype} image`);

  try {
    // Validate image
    if (!req.file.buffer || req.file.buffer.length === 0) {
      throw new Error("Empty file buffer");
    }

    // Try primary model
    let result = await hf.imageClassification({
      model: MODEL_NAME,
      data: req.file.buffer,
      parameters: { top_k: 3 }
    });

    // If primary fails, try fallback
    if (!result || result.length === 0) {
      console.log("Primary model returned empty results, trying fallback");
      result = await hf.imageClassification({
        model: FALLBACK_MODEL,
        data: req.file.buffer,
        parameters: { top_k: 3 }
      });
    }

    if (!result || result.length === 0) {
      throw new Error("Both models returned empty predictions");
    }

    // Format response
    const formattedResults = result.map(pred => ({
      label: pred.label,
      score: pred.score,
      confidence: `${(pred.score * 100).toFixed(1)}%`
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error("Prediction error:", error);
    
    const statusCode = error.message.includes('model') ? 503 : 500;
    
    res.status(statusCode).json({
      error: "Prediction failed",
      details: error.message,
      suggestion: "Try a different image or check back later",
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "File upload error",
      details: err.message,
      code: err.code
    });
  }
  
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Primary model: ${MODEL_NAME}`);
  console.log(`Fallback model: ${FALLBACK_MODEL}`);
  console.log(`Max file size: 5MB`);
});