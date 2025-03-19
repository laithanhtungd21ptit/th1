let currentData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortState = {}; // Trạng thái sắp xếp

// Fetch dữ liệu từ server
async function fetchData() {
    try {
        const response = await fetch("http://localhost:5000/api/data");
        if (!response.ok) throw new Error("Lỗi khi lấy dữ liệu từ server");

        currentData = await response.json();
        filteredData = [...currentData]; // Giữ dữ liệu gốc để reset khi cần
        currentPage = 1;
        updatePagination();
        renderTable(paginateData(filteredData));
    } catch (error) {
        console.error("Lỗi:", error);
    }
}

// Hiển thị dữ liệu vào bảng
function renderTable(data) {
    const tbody = document.getElementById("dataBody");
    tbody.innerHTML = data.map(item => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-2 whitespace-nowrap">${item.id}</td>
            <td class="px-6 py-2 whitespace-nowrap">${item.temp} °C</td>
            <td class="px-6 py-2 whitespace-nowrap">${item.humidity}%</td>
            <td class="px-6 py-2 whitespace-nowrap">${item.light} lux</td>
            <td class="px-6 py-2 whitespace-nowrap">${formatDate(item.time)}</td>
        </tr>
    `).join('');

    updateRecordCount();
}

// Định dạng thời gian từ ISO thành "YYYY-MM-DD HH:mm:ss"
function formatDate(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Cập nhật số lượng bản ghi hiển thị
function updateRecordCount() {
    const recordInfo = document.getElementById("recordInfo");
    const totalRecords = filteredData.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);

    recordInfo.textContent = `Trang đang hiển thị: ${endIndex}/${totalRecords} bản ghi`;
}

// Tìm kiếm dữ liệu theo ngưỡng giá trị
function searchData() {
    const filterType = document.getElementById("filterType").value;
    const filterValue = parseFloat(document.getElementById("filterValue").value);

    if (isNaN(filterValue)) {
        alert("Vui lòng nhập giá trị hợp lệ!");
        return;
    }

    filteredData = currentData.filter(item => {
        if (filterType === "temp") return item.temp >= filterValue - 0.5 && item.temp <= filterValue + 0.5;
        if (filterType === "humidity") return item.humidity >= filterValue - 5 && item.humidity <= filterValue + 5;
        if (filterType === "light") return item.light >= filterValue - 50 && item.light <= filterValue + 50;
        return true;
    });

    currentPage = 1;
    updatePagination();
    renderTable(paginateData(filteredData));
}

// Sắp xếp dữ liệu theo cột
function sortTable(column) {
    const isAsc = !sortState[column] || sortState[column] === "desc";
    sortState = { [column]: isAsc ? "asc" : "desc" };

    filteredData.sort((a, b) => {
        if (a[column] > b[column]) return isAsc ? 1 : -1;
        if (a[column] < b[column]) return isAsc ? -1 : 1;
        return 0;
    });

    renderTable(paginateData(filteredData));
}

// Cập nhật phân trang
function updatePagination() {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage)); // Tránh chia cho 0
    document.getElementById("pageInfo").textContent = `${currentPage} / ${totalPages}`;
    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages || totalPages === 0;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, filteredData.length);
    document.getElementById("recordInfo").textContent = `Trang đang hiển thị: ${end - start + 1}/${filteredData.length} bản ghi`;
}

// Chuyển trang
function changePage(step) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage + step, totalPages));
    renderTable(paginateData(filteredData));
    updatePagination();
}

// Thay đổi số bản ghi mỗi trang
function updateRecordsPerPage() {
    itemsPerPage = parseInt(document.getElementById("recordsPerPage").value);
    currentPage = 1;
    updatePagination();
    renderTable(paginateData(filteredData));
}

// Phân trang dữ liệu
function paginateData(data) {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
}

// Reset bộ lọc
function resetFilters() {
    document.getElementById("filterValue").value = "";
    filteredData = [...currentData]; // Trả lại dữ liệu gốc
    currentPage = 1;
    updatePagination();
    renderTable(paginateData(filteredData));
}

// Khởi động ban đầu
fetchData();
