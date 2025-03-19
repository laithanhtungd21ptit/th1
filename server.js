const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Kết nối MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "18092003",
    database: "sensor_data",
    timezone: 'Z'
});

db.connect(err => {
    if (err) {
        console.error("Lỗi kết nối MySQL:", err);
        return;
    }
    console.log("Đã kết nối MySQL!");
});

// Phục vụ file tĩnh (HTML, CSS, JS)
app.use(express.static(__dirname));

// Route mặc định để hiển thị dashboard.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

// API lấy toàn bộ dữ liệu cảm biến
app.get("/api/data", (req, res) => {
    db.query("SELECT * FROM sensor_data ORDER BY time DESC", (err, result) => {
        if (err) {
            res.status(500).json({ error: "Lỗi truy vấn MySQL" });
        } else {
            res.json(result);
        }
    });
});

// API lấy lịch sử thiết bị
// API lấy lịch sử thiết bị (sửa lại)
app.get("/api/history", (req, res) => {
    const { searchTime } = req.query;

    let query;
    let params = [];

    if (searchTime) {
        // Xử lý tìm kiếm theo thời gian
        const searchDate = new Date(searchTime);
        if (isNaN(searchDate.getTime())) {
            return res.status(400).json({ error: "Định dạng thời gian không hợp lệ" });
        }

        const startTime = new Date(searchDate);
        startTime.setMilliseconds(0);
        const endTime = new Date(searchDate);
        endTime.setMilliseconds(999);

        query = `
            SELECT * 
            FROM device_history 
            WHERE time BETWEEN ? AND ?
            ORDER BY time DESC
        `;
        params = [startTime, endTime];
    } else {
        // Lấy toàn bộ bản ghi nếu không có searchTime
        query = "SELECT * FROM device_history ORDER BY time DESC";
    }

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Lỗi MySQL:", err);
            return res.status(500).json({ 
                error: "Lỗi database",
                details: err.message 
            });
        }
        res.json(result);
    });
});

// app.get("/api/max-light", (req, res) => {
//     const query = `SELECT MAX(light) AS max_light FROM sensor_data WHERE DATE(time) = CURDATE()`;
    
//     db.query(query, (err, result) => {
//         if (err) {
//             console.error("❌ Lỗi MySQL:", err.sqlMessage); // In lỗi chi tiết
//             return res.status(500).json({ error: "Lỗi truy vấn MySQL", details: err.sqlMessage });
//         }
//         console.log("✅ Dữ liệu trả về:", result);
//         res.json(result[0]); 
//     });
// });
app.get("/api/max-values", (req, res) => {
    const query = `
        SELECT 
            MAX(temp) AS max_temp, 
            MAX(humidity) AS max_humidity, 
            MAX(light) AS max_light 
        FROM sensor_data 
        WHERE DATE(time) = CURDATE()
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Lỗi truy vấn MySQL:", err); // In lỗi chi tiết ra console
            res.status(500).json({ error: "Lỗi truy vấn MySQL" });
        } else {
            res.json(result[0]); // Trả về giá trị lớn nhất trong ngày
        }
    });
});


// API cập nhật trạng thái thiết bị
app.post("/api/update-device", (req, res) => {
    const { device, action } = req.body;
    
    if (!device || action === undefined) {
        return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    const query = `INSERT INTO device_history (device, action, time) VALUES (?, ?, NOW())`;

    db.query(query, [device, action], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Lỗi cập nhật thiết bị" });
        } else {
            res.json({ message: "Cập nhật thành công!" });
        }
    });
});

// Khởi động server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
