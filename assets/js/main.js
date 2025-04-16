const ctx = document.getElementById('iotChart').getContext('2d');

let iotChart;

// Hàm lấy dữ liệu từ MySQL thông qua API
function formatDateTime(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function fetchSensorData() {
    try {
        const response = await fetch("http://localhost:5000/api/data");
        const data = await response.json();

        console.log("Dữ liệu nhận được từ API:", data); // Kiểm tra phản hồi API

        if (!Array.isArray(data.data)) {  // Dữ liệu thực tế nằm trong `data.data`
            console.error("Lỗi: API không trả về mảng dữ liệu", data);
            return;
        }

        if (data.data.length === 0) {
            console.warn("Không có dữ liệu từ MySQL");
            return;
        }

        // Chuyển đổi dữ liệu
        const timestamps = data.data.map(item => formatDateTime(item.time));  
        const temperatureData = data.data.map(item => item.temp);
        const humidityData = data.data.map(item => item.humidity);
        const lightData = data.data.map(item => item.light);
        const windData = data.data.map(item => item.wind); // Thêm dữ liệu gió

        updateChart(timestamps, temperatureData, humidityData, lightData, windData);
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu từ MySQL:", error);
    }
}

// Hàm cập nhật biểu đồ
function updateChart(hours, temperatureData, humidityData, lightData, windData) {
    const chartData = {
        labels: hours,
        datasets: [
            {
                label: 'Nhiệt độ (°C)',
                data: temperatureData,
                borderColor: 'red',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            },
            {
                label: 'Độ ẩm (%)',
                data: humidityData,
                borderColor: 'blue',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            },
            {
                label: 'Ánh sáng (lux)',
                data: lightData,
                borderColor: 'yellow',
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                fill: true
            },
            {
                label: 'Gió (m/s)', // Thêm dữ liệu gió
                data: windData,
                borderColor: 'green',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true
            }
        ]
    };

    if (iotChart) {
        iotChart.data = chartData;
        iotChart.update();
    } else {
        iotChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }
}

// 🟢 Hàm lấy dữ liệu lớn nhất trong ngày từ API và cập nhật giao diện
async function fetchMaxValues() {
    try {
        const response = await fetch("http://localhost:5000/api/max-values");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("Dữ liệu max nhận được:", data); // Debug dữ liệu API

        if (data.max_temp !== null) {
            document.getElementById("tempCard").innerHTML = `${data.max_temp}<span class="text-xl ml-1">°C</span>`;
        }

        if (data.max_humidity !== null) {
            document.getElementById("humidityCard").innerHTML = `${data.max_humidity}<span class="text-xl ml-1">%</span>`;
        }

        if (data.max_light !== null) {
            document.getElementById("lightCard").innerHTML = `${data.max_light}<span class="text-xl ml-1">lux</span>`;
        }

        if (data.max_wind !== null) { // Thêm dữ liệu gió
            document.getElementById("windCard").innerHTML = `${data.max_wind}<span class="text-xl ml-1">m/s</span>`;
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu max:", error);
    }
}

// 🟢 Gọi API khi trang tải
document.addEventListener("DOMContentLoaded", fetchMaxValues);

// 🟢 Hàm cập nhật trạng thái thiết bị (đèn, quạt, điều hòa)
async function updateDeviceStatus(device, action) {
    const actionText = action ? "Bật" : "Tắt"; // Chuyển đổi 1 -> "Bật", 0 -> "Tắt"

    try {
        const response = await fetch("http://localhost:5000/api/update-device", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device, action: actionText }) // Gửi "Bật" hoặc "Tắt"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result.message);
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái thiết bị:", error);
    }
}

// 🟢 Xử lý sự kiện khi người dùng bật/tắt thiết bị
document.getElementById("lightSwitch").addEventListener("change", function () {
    updateDeviceStatus("Đèn", this.checked ? 1 : 0);
});

document.getElementById("fanSwitch").addEventListener("change", function () {
    updateDeviceStatus("Quạt", this.checked ? 1 : 0);
});

document.getElementById("acSwitch").addEventListener("change", function () {
    updateDeviceStatus("Điều hòa", this.checked ? 1 : 0);
});

document.getElementById("light1Switch").addEventListener("change", function () {
    updateDeviceStatus("Đèn 1", this.checked ? 1 : 0);
});

document.getElementById("light2Switch").addEventListener("change", function () {
    updateDeviceStatus("Đèn 2", this.checked ? 1 : 0);
});

// 🟢 Tải dữ liệu khi trang mở
fetchSensorData();
// fetchMaxLight();

// 🟢 Cập nhật dữ liệu mỗi 10 giây
setInterval(fetchSensorData, 10000);
// setInterval(fetchMaxLight, 30000);
