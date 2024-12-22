const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3338;
const routes = require('./src/routes'); // adjust this if necessary
const debugMiddleware = require('./src/middlewares/debugMiddleware'); // adjust this if necessary

// CORS setup. change example.com to your roBrowser ip/domain and http://localhost:3338 (if necessary) to the domain/port where your client is running
const corsOptions = {
  origin: ['https://test.titanro.net', 'https://play.titanro.net'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(debugMiddleware);

// Rotas da API
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
