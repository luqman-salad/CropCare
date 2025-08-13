require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { HfInference } = require('@huggingface/inference');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const hf = new HfInference(process.env.HF_TOKEN);

app.use(cors());
app.use(express.json());

// Disease detection endpoint
app.post('/api/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const result = await hf.imageClassification({
      model: 'wambugu71/crop_leaf_diseases_vit',
      data: imageBuffer,
    });

    res.json({ predictions: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));