const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Enables Cross-Origin Resource Sharing
app.use(cors({
  origin: 'http://localhost:4200',  // frontend origin
  credentials: true,
}));

// Init Middleware
app.use(express.json());

// Define Routes
app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Rutas API
app.use('/api/user', require('./routes/userRoutes'));

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

