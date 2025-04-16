let currentData = [];
let itemsPerPage = 10;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;

// Lấy dữ liệu từ API MySQL với phân trang, giới hạn và (có thể) tìm kiếm theo thời gian
async function fetchHistoryData(page = currentPage, limit = itemsPerPage, searchTime = null) {
    try {
        let url = `http://localhost:5000/api/history?page=${page}&limit=${limit}`;
        if (searchTime) {
            url += `&searchTime=${encodeURIComponent(searchTime)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // API cần trả về: { data, totalRecords, totalPages, currentPage }
        if (!data || !Array.isArray(data.data)) {
            console.error("❌ API không trả về mảng:", data);
            return;
        }
        console.log("📊 Dữ liệu nhận được từ API:", data);
        currentData = data.data;
        totalRecords = data.totalRecords;
        totalPages = data.totalPages;
        currentPage = data.currentPage;
        renderTable();
    } catch (error) {
        console.error("❌ Lỗi khi lấy dữ liệu từ API:", error);
    }
}

// Cập nhật số lượng bản ghi hiển thị
function updateRecordCount() {
    const recordInfo = document.getElementById('recordInfo');
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(startIndex + currentData.length - 1, totalRecords);
    recordInfo.textContent = `Trang đang hiển thị: ${currentData.length} bản ghi (${startIndex} - ${endIndex} / ${totalRecords})`;
}

// Hàm chuyển đổi và định dạng thời gian (điều chỉnh về GMT+7)
function formatDateTime(utcDateTime) {
    const date = new Date(utcDateTime);
    // Điều chỉnh giờ về GMT+7 (nếu backend trả về thời gian UTC)
    date.setHours(date.getHours());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Render bảng dữ liệu
function renderTable() {
    const tbody = document.getElementById('tableBody');
    // Tạo mảng các hàng (rows) rồi join lại thành 1 chuỗi
    const rows = currentData.map(item => {
        const formattedTime = formatDateTime(item.time);
        return `<tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-2 whitespace-nowrap">${item.id}</td>
                    <td class="px-6 py-2 whitespace-nowrap">${item.device}</td>
                    <td class="px-6 py-2 whitespace-nowrap">${item.action}</td>
                    <td class="px-6 py-2 whitespace-nowrap">${formattedTime}</td>
                </tr>`;
    });
    tbody.innerHTML = rows.join("");
    updateRecordCount();
    updatePagination();
}

// Cập nhật trạng thái phân trang
function updatePagination() {
    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Điều hướng trang (prev/next)
function changePage(direction) {
    if (direction === -1 && currentPage > 1) {
        currentPage--;
        fetchHistoryData(currentPage, itemsPerPage);
    } else if (direction === 1 && currentPage < totalPages) {
        currentPage++;
        fetchHistoryData(currentPage, itemsPerPage);
    }
}

// Xử lý thay đổi số bản ghi hiển thị mỗi trang
document.getElementById('recordsPerPage').addEventListener('change', function () {
    itemsPerPage = parseInt(this.value);
    currentPage = 1;
    fetchHistoryData(currentPage, itemsPerPage);
});

// Tìm kiếm theo thời gian (chính xác đến giây)
async function searchByTime() {
    const searchTimeInput = document.getElementById("search-time").value;
    if (!searchTimeInput) {
        alert("Vui lòng nhập thời gian hợp lệ!");
        return;
    }

    // Format the input time as YYYY-MM-DD HH:mm:ss
    const date = new Date(searchTimeInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    currentPage = 1;
    // Gọi API với tham số searchTime
    fetchHistoryData(currentPage, itemsPerPage, formattedTime);
}

// Reset bộ lọc tìm kiếm
function resetFilters() {
    document.getElementById('search-time').value = '';
    fetchHistoryData(currentPage, itemsPerPage);
}

// Lấy dữ liệu từ API khi trang tải
fetchHistoryData();
