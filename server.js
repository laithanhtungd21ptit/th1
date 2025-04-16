require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise"); 
const cors = require("cors");
const path = require("path");
const moment = require("moment");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined'));

// Database Configuration
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Sửa lại từ DB_USER sang DB_PASSWORD
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
    connectTimeout: 60000 // ✅ Giữ lại nếu cần
});

// Serve static files
app.use(express.static(__dirname));

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1+1 AS result');
    res.json({
      status: 'healthy',
      db_connection: result[0].result === 2 ? 'ok' : 'error',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy' });
  }
});

// Enhanced Sensor Data API
app.get("/api/data", async (req, res) => {
  try {
    const { temp, humidity, light, page = 1, limit = 10 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));

    // Input validation
    const numericParams = {};
    if(temp && !isNaN(temp)) numericParams.temp = parseFloat(temp);
    if(humidity && !isNaN(humidity)) numericParams.humidity = parseFloat(humidity);
    if(light && !isNaN(light)) numericParams.light = parseInt(light);

    let query = "SELECT * FROM sensor_data WHERE 1=1";
    let countQuery = "SELECT COUNT(*) AS total FROM sensor_data WHERE 1=1";
    const params = [];

    Object.entries(numericParams).forEach(([key, value]) => {
      query += ` AND ${key} = ?`;
      countQuery += ` AND ${key} = ?`;
      params.push(value);
    });

    query += " ORDER BY time DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [countResult, data] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(query, params)
    ]);

    res.json({
      totalRecords: countResult[0][0].total,
      totalPages: Math.ceil(countResult[0][0].total / parseInt(limit)),
      currentPage: parseInt(page),
      data: data[0]
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ 
      error: "Database operation failed",
      message: error.message
    });
  }
});

// Enhanced Device History API
app.get("/api/history", async (req, res) => {
  try {
    const { searchTime, device, action, page = 1, limit = 10 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));

    let query = "SELECT * FROM device_history WHERE 1=1";
    let countQuery = "SELECT COUNT(*) AS total FROM device_history WHERE 1=1";
    const params = [];

    if (searchTime) {
      const validDate = moment(searchTime, "YYYY-MM-DD HH:mm:ss", true);
      if (!validDate.isValid()) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      const formattedTime = validDate.format("YYYY-MM-DD HH:mm:ss");
      query += " AND time = ?";
      countQuery += " AND time = ?";
      params.push(formattedTime);
    }

    if (device) {
      query += " AND device LIKE ?";
      countQuery += " AND device LIKE ?";
      params.push(`%${device}%`);
    }

    if (action) {
      query += " AND action = ?";
      countQuery += " AND action = ?";
      params.push(action);
    }

    query += " ORDER BY time DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [countResult, rows] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(query, params)
    ]);

    res.json({
      totalRecords: countResult[0][0].total,
      totalPages: Math.ceil(countResult[0][0].total / parseInt(limit)),
      currentPage: parseInt(page),
      data: rows[0]
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ 
      error: "Database operation failed",
      message: error.message
    });
  }
});

// Secure Sensor Data Submission
app.post("/api/sensor-data", async (req, res) => {
  try {
    const { temperature, humidity, light, wind, api_key } = req.body;

    // Enhanced validation
    if (api_key !== process.env.API_KEY) {
      console.warn('Unauthorized API attempt from:', req.ip);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const errors = [];
    if (!temperature || isNaN(temperature)) errors.push("Invalid temperature");
    if (!humidity || isNaN(humidity)) errors.push("Invalid humidity");
    if (!light || isNaN(light)) errors.push("Invalid light");
    if (!wind || isNaN(wind)) errors.push("Invalid wind");

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: "Invalid sensor data",
        details: errors
      });
    }

    const query = `
      INSERT INTO sensor_data 
      (temp, humidity, light, wind, time) 
      VALUES (?, ?, ?, ?, NOW())
    `;

    await pool.query(query, [
      parseFloat(temperature),
      parseFloat(humidity),
      parseInt(light),
      parseInt(wind)
    ]);

    res.json({ status: "success" });
    
  } catch (error) {
    console.error('Database Insert Error:', error);
    res.status(500).json({ 
      error: "Database operation failed",
      message: error.message
    });
  }
});

// Max Values API
app.get("/api/max-values", async (req, res) => {
    try {
        const query = `
            SELECT 
                MAX(temp) AS max_temp, 
                MAX(humidity) AS max_humidity, 
                MAX(light) AS max_light, 
                MAX(wind) AS max_wind
            FROM sensor_data 
            WHERE DATE(time) = CURDATE()
        `;
        const [rows] = await pool.query(query);
        res.json(rows[0]);
    } catch (error) {
        console.error("Error in /api/max-values:", error);
        res.status(500).json({ error: "Database query failed" });
    }
});

// Update Device Status API
app.post("/api/update-device", async (req, res) => {
    try {
        const { device, action } = req.body;

        if (!device || action === undefined) {
            return res.status(400).json({ error: "Missing device or action data" });
        }

        const query = "INSERT INTO device_history (device, action, time) VALUES (?, ?, NOW())";
        await pool.query(query, [device, action]);

        res.json({ message: "Device status updated successfully!" });
    } catch (error) {
        console.error("Error in /api/update-device:", error);
        res.status(500).json({ error: "Failed to update device status" });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "Please try again later"
  });
});

// Server Startup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});