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

// Rutas API
app.use('/', require('./routes/generalRoutes'));

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

