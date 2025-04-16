document.addEventListener("DOMContentLoaded", () => {
    const filterType = document.getElementById("filterType");
    const filterValue = document.getElementById("filterValue");
    const dataBody = document.getElementById("dataBody");
    const pageInfo = document.getElementById("pageInfo");
    const recordInfo = document.getElementById("recordInfo");
    const recordsPerPage = document.getElementById("recordsPerPage");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    let currentPage = 1;
    let totalPages = 1;
    let currentData = [];

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

    async function fetchData() {
        try {
            const type = filterType.value;
            const value = filterValue.value;
            const limit = recordsPerPage.value;
            const offset = (currentPage - 1) * limit;

            const queryParams = new URLSearchParams({
                [type]: value,
                page: currentPage,
                limit
            }).toString();

            const response = await fetch(`http://localhost:5000/api/data?${queryParams}`);
            const data = await response.json();

            dataBody.innerHTML = "";

            if (!data.data || data.data.length === 0) {
                dataBody.innerHTML = `<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>`;
                return;
            }

            currentData = data.data;

            renderTable();

            // Update pagination info
            totalPages = data.totalPages;
            pageInfo.textContent = `${currentPage} / ${totalPages}`;
            recordInfo.textContent = `Trang đang hiển thị: ${data.data.length}/${data.totalRecords} bản ghi`;

            // Enable/disable pagination buttons
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
        }
    }

    function renderTable() {
        dataBody.innerHTML = "";
        currentData.forEach(item => {
            const row = `
                <tr>
                    <td class="px-6 py-3">${item.id}</td>
                    <td class="px-6 py-3">${item.temp}</td>
                    <td class="px-6 py-3">${item.humidity}</td>
                    <td class="px-6 py-3">${item.light}</td>
                    <td class="px-6 py-3">${item.wind}</td>
                    <td class="px-6 py-3">${formatDateTime(item.time)}</td>
                </tr>
            `;
            dataBody.innerHTML += row;
        });
    }

    function sortTable(column) {
        const isAscending = document
            .querySelector(`[onclick="sortTable('${column}')"] .sort-icon i`)
            .classList.contains("fa-sort-up");

        // Toggle sort direction
        document
            .querySelectorAll(".sort-icon i")
            .forEach(icon => icon.classList.remove("fa-sort-up", "fa-sort-down"));
        document
            .querySelector(`[onclick="sortTable('${column}')"] .sort-icon i`)
            .classList.add(isAscending ? "fa-sort-down" : "fa-sort-up");

        // Sort data
        currentData.sort((a, b) => {
            if (a[column] < b[column]) return isAscending ? 1 : -1;
            if (a[column] > b[column]) return isAscending ? -1 : 1;
            return 0;
        });

        // Re-render the table
        renderTable();
    }

    function searchData() {
        currentPage = 1; // Reset to the first page
        fetchData();
    }

    function resetFilters() {
        filterType.value = "temp";
        filterValue.value = "";
        currentPage = 1; // Reset to the first page
        fetchData();
    }

    function changePage(direction) {
        currentPage += direction;
        fetchData();
    }

    function updateRecordsPerPage() {
        currentPage = 1; // Reset to the first page
        fetchData();
    }

    // Attach event listeners
    prevBtn.addEventListener("click", () => changePage(-1));
    nextBtn.addEventListener("click", () => changePage(1));
    recordsPerPage.addEventListener("change", updateRecordsPerPage);

    // Fetch initial data
    fetchData();

    // Expose functions to global scope for button actions
    window.searchData = searchData;
    window.resetFilters = resetFilters;
    window.sortTable = sortTable;
});
