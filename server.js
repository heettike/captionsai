console.log('Starting server initialization...');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const { OpenAI } = require('openai');
const fs = require('fs');

console.log('Configuring Express app...');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static('public'));

console.log('Setting up OpenAI...');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('Configuring Multer...');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Create uploads directory
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

console.log('Setting up image classification and caption generation functions...');
async function classifyImage(imagePath) {
  try {
    const image = fs.readFileSync(imagePath);
    const decodedImage = tf.node.decodeImage(new Uint8Array(image), 3);
    const model = await mobilenet.load();
    const predictions = await model.classify(decodedImage);
    return predictions[0].className;
  } catch (error) {
    console.error('Error in classifyImage:', error);
    throw error;
  }
}

async function generateAICaption(imageDescription) {
  try {
    console.log('Generating caption for:', imageDescription);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates witty Instagram captions." },
        { role: "user", content: `Generate a witty and engaging Instagram caption for an image described as: ${imageDescription}` }
      ],
      max_tokens: 60,
      n: 3
    });
    console.log('OpenAI response:', response);
    return response.choices.map(choice => choice.message.content.trim());
  } catch (error) {
    console.error('Error in generateAICaption:', error);
    throw error;
  }
}

console.log('Setting up routes...');
// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// File upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  console.log('Upload route hit');
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const imagePath = req.file.path;
    console.log('Image path:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));

    console.log('Starting image classification');
    const imageDescription = await classifyImage(imagePath);
    console.log('Image classified as:', imageDescription);

    console.log('Generating AI caption');
    const captions = await generateAICaption(imageDescription);
    console.log('Captions generated:', captions);

    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      imageDescription: imageDescription,
      captions: captions
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      error: 'Error processing image',
      details: error.message,
      stack: error.stack
    });
  }
});
console.log('Starting server...');
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// At the end of your server.js
module.exports = app;
