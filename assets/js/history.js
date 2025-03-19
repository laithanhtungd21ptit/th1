let currentData = [];
let itemsPerPage = 10;
let currentPage = 1;

// Lấy dữ liệu từ API MySQL
async function fetchHistoryData() {
    try {
        const response = await fetch("http://localhost:5000/api/history");
        const data = await response.json();
        currentData = data;
        renderTable();
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu từ MySQL:", error);
    }
}

// Cập nhật số lượng bản ghi hiển thị
function updateRecordCount() {
    const recordInfo = document.getElementById('recordInfo');
    const totalRecords = currentData.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);
    recordInfo.textContent = `Trang đang hiển thị: ${endIndex - startIndex} / ${totalRecords} bản ghi`;
}

// Render bảng dữ liệu
function formatDateTime(utcDateTime) {
    const date = new Date(utcDateTime);
    
    // Trừ đi 7 giờ để về GMT+7
    date.setHours(date.getHours() - 7);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}



function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = "";

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, currentData.length);
    const dataToShow = currentData.slice(startIndex, endIndex);

    dataToShow.forEach(item => {
        const formattedTime = formatDateTime(item.time);

        const row = `<tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-2 whitespace-nowrap">${item.id}</td>
                        <td class="px-6 py-2 whitespace-nowrap">${item.device}</td>
                        <td class="px-6 py-2 whitespace-nowrap">${item.action}</td>
                        <td class="px-6 py-2 whitespace-nowrap">${formattedTime}</td>
                    </tr>`;
        tbody.innerHTML += row;
    });

    updateRecordCount();
    updatePagination();
}

// Xử lý thay đổi số bản ghi hiển thị
document.getElementById('recordsPerPage').addEventListener('change', function () {
    itemsPerPage = parseInt(this.value);
    currentPage = 1;
    renderTable();
});

// Điều hướng trang
function changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage)); // Đảm bảo không bị 0 trang
    if (direction === -1 && currentPage > 1) currentPage--;
    if (direction === 1 && currentPage < totalPages) currentPage++;
    renderTable();
}

// Cập nhật trạng thái phân trang
function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage));
    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Lọc theo thời gian chính xác đến giây
async function searchByTime() {
    let searchTime = document.getElementById("search-time").value;

    if (!searchTime) {
        alert("Vui lòng nhập thời gian hợp lệ!");
        return;
    }

    // Chuyển đổi sang UTC ISO 8601 để khớp với dữ liệu JSON
    const date = new Date(searchTime);

    // Điều chỉnh về UTC
    const offset = date.getTimezoneOffset() * 60000; // Chuyển offset phút -> mili giây
    const utcDate = new Date(date.getTime() - offset); // Chuyển giờ local -> UTC

    // Chuyển sang định dạng ISO 8601: `YYYY-MM-DDTHH:mm:ss.000Z`
    const formattedTime = utcDate.toISOString().slice(0, 19) + "Z";

    try {
        // Gửi đúng định dạng ISO 8601
        const response = await fetch(`http://localhost:5000/api/history?searchTime=${encodeURIComponent(formattedTime)}`);
        const data = await response.json();

        // Lọc chính xác đến giây
        const filteredData = data.filter(item => item.time.slice(0, 19) + "Z" === formattedTime);

        currentData = filteredData;
        currentPage = 1;
        renderTable();
    } catch (error) {
        console.error("Lỗi khi tìm kiếm theo thời gian:", error);
    }
}


// Reset bộ lọc
function resetFilters() {
    document.getElementById('search-time').value = '';
    fetchHistoryData();
}

// Lấy dữ liệu từ MySQL khi trang tải
fetchHistoryData();
