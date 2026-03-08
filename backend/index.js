const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// In a real Vultr Docker production build, the frontend 'dist' is copied here.
app.use(express.static(path.join(__dirname, 'public')));

// Simple heartbeat API endpoint for the backend
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'CanAfford Backend' });
});

app.get(/^.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`CanAfford backend running on port ${port}`);
});
