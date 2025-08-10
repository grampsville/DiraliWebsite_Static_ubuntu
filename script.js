document.addEventListener('DOMContentLoaded', function () {
    const skeletonLoader = document.getElementById('skeleton-loader');
    const tableContainers = document.querySelectorAll('.table-container');

    // Show skeleton loader and hide table
    console.log('Showing skeleton loader');
    skeletonLoader.style.display = 'block';
    tableContainers.forEach(container => {
      container.style.display = 'none';
    });
    const tableBody = document.querySelector('#lottery-table tbody');
    const summaryTableBody = document.querySelector('#summary-table tbody');
    const headers = document.querySelectorAll('th.sortable');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetButton = document.getElementById('reset-button');
    const summaryBar = document.getElementById('summary-bar');
    let activeSort = { column: null, ascending: true };
    let activeFilters = {};
    const dataUrl = '/data';
    let originalData = [];

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', function () {
        const targetTab = this.dataset.tab;

        // Deactivate all tabs and content
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Activate the target tab and content
        this.classList.add('active');
        const activeTabContent = document.getElementById(targetTab);
        activeTabContent.classList.add('active');

        // Hide all table containers
        tableContainers.forEach(container => {
          container.style.display = 'none';
        });

        // Show the table container for the active tab
        const activeTableContainer = activeTabContent.querySelector('.table-container');
        if (activeTableContainer) {
          activeTableContainer.style.display = 'block';
        }

        // If summary tab is active, re-populate summary data
        if (targetTab === 'summary-data') {
          populateSummaryData(originalData);
        }

        // Show/hide toolbar and reset button based on the active tab
        const toolbar = document.getElementById('toolbar');
        const resetButton = document.getElementById('reset-button');
        if (targetTab === 'all-data') {
          toolbar.style.display = 'flex';
          resetButton.style.display = 'inline-block';
        } else {
          toolbar.style.display = 'none';
          resetButton.style.display = 'none';
        }
      });
    });
  
    // Fetch data
    const apiUrls = [
      'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D4%26Entitlement%3D1%26PageNumber%3D1%26PageSize%3D50%26IsInit%3Dtrue%26',
      'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber%3D2%26PageSize%3D50%26IsInit%3Dtrue%26',
      'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber%3D3%26PageSize%3D50%26IsInit%3Dtrue%26'
    ];

    Promise.all(apiUrls.map(url => fetch(url).then(response => response.json())))
        .then(dataArray => {
            const openLotteriesCount = dataArray[0].OpenLotteriesCount;
  
            if (openLotteriesCount === 0) {
                document.getElementById('message').innerText = 'אין הגרלות פעילות כרגע';
                return;
            }
  
            const projects = [...dataArray[0].ProjectItems, ...dataArray[1].ProjectItems];
            const firstSpecialLotteryDescription = projects[0]?.SpecialLotteryDescription;
  
            // Filter only open lotteries
            originalData = projects.filter(project =>
                project.SpecialLotteryDescription !== null &&
                project.SpecialLotteryDescription === firstSpecialLotteryDescription
            );
  
            populateTable(originalData);
            populateCityFilterOptions(originalData);
            populateSummaryData(originalData);
        })
        .finally(() => {
          // Hide skeleton loader
          skeletonLoader.style.display = 'none';

          // Simulate a click on the "All Data" tab button to display the initial table
          document.querySelector('.tab-button[data-tab="all-data"]').click();
        });
  
    // Populate "All Data" table
    function populateTable(data) {
        tableBody.innerHTML = "";  // Clear existing rows
        data.forEach(item => {
            const chances = item.TotalSubscribers > 0
                ? ((item.LotteryApparmentsNum / item.TotalSubscribers) * 100).toFixed(3) + '%'
                : '0.000%';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.LotteryNumber}</td>
                <td>${item.CityDescription}</td>
                <td>${item.ContractorDescription}</td>
                <td>${item.LotteryApparmentsNum}</td>
                <td>${item.TotalSubscribers}</td>
                <td>₪${item.PricePerUnit.toLocaleString()}</td>
                <td>₪${item.GrantSize.toLocaleString()}</td>
                <td>${chances}</td>
                <td>${item.IsReligious ? 'צביון חרדי' : ''}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Populate "Summary Data" table
    function populateSummaryData(data) {
        summaryTableBody.innerHTML = ""; // Clear existing rows
        const cityGroups = data.reduce((acc, project) => {
            if (!acc[project.CityDescription]) {
                acc[project.CityDescription] = [];
            }
            acc[project.CityDescription].push(project);
            return acc;
        }, {});

        const citySummaryData = [];

        Object.keys(cityGroups).forEach(city => {
            const cityProjects = cityGroups[city];
            const totalLotteryApparmentsNum = cityProjects.reduce((sum, project) => sum + project.LotteryApparmentsNum, 0);
            const maxSubscribers = Math.max(...cityProjects.map(project => project.TotalSubscribers));
            const avgPricePerUnit = cityProjects.reduce((sum, project) => sum + project.PricePerUnit, 0) / cityProjects.length;
            const cityChances = maxSubscribers > 0 ? (totalLotteryApparmentsNum / maxSubscribers) * 100 : 0;

            citySummaryData.push({
                city,
                totalLotteryApparmentsNum,
                maxSubscribers,
                avgPricePerUnit,
                cityChances
            });
        });

        citySummaryData.sort((a, b) => b.cityChances - a.cityChances);
        citySummaryData.forEach((summary, index) => {
            let medal = '';
            if (index === 0) medal = ' 🥇';
            else if (index === 1) medal = ' 🥈';
            else if (index === 2) medal = ' 🥉';

            const summaryRow = document.createElement('tr');
            summaryRow.innerHTML = `
                <td>${summary.city}</td>
                <td>${summary.totalLotteryApparmentsNum.toLocaleString()}</td>
                <td>${summary.maxSubscribers.toLocaleString()}</td>
                <td>₪${summary.avgPricePerUnit.toFixed(2).toLocaleString()}</td>
                <td>${summary.cityChances.toFixed(3)}%${medal}</td>
            `;
            summaryTableBody.appendChild(summaryRow);
        });
    }
  
    // Apply filters
    applyFilterButton.addEventListener('click', () => {
        let filteredData = [...originalData];
        activeFilters = {};
  
        const city = document.getElementById('city-filter').value;
        if (city) {
            filteredData = filteredData.filter(item => item.CityDescription === city);
            activeFilters['city'] = `יישוב: ${city}`;
        }
  
        const priceMin = parseFloat(document.getElementById('price-min').value) || 0;
        const priceMax = parseFloat(document.getElementById('price-max').value) || Infinity;
        filteredData = filteredData.filter(item => item.PricePerUnit >= priceMin && item.PricePerUnit <= priceMax);
        if (priceMin || priceMax < Infinity) {
            activeFilters['price'] = `מחיר למטר: ${priceMin} - ${priceMax}`;
        }
  
        const chancesMin = parseFloat(document.getElementById('chances-min').value) || 0;
        filteredData = filteredData.filter(item => {
            const chances = (item.LotteryApparmentsNum / item.TotalSubscribers) * 100;
            return chances >= chancesMin;
        });
        if (chancesMin) {
            activeFilters['chances'] = `סיכויי זכייה: ${chancesMin}+`;
        }
  
        populateTable(filteredData);
        populateSummaryData(filteredData);
        updateSummaryBar();
        resetButton.style.display = 'inline-block';
    });
  
    // Reset filters and sorting
    resetButton.addEventListener('click', () => {
        activeSort = { column: null, ascending: true };
        activeFilters = {};
        document.getElementById('city-filter').value = '';
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        document.getElementById('chances-min').value = '';
        populateTable(originalData);
        populateSummaryData(originalData);
        updateSummaryBar();
        resetButton.style.display = 'none';
    });
  
    // Sorting logic
    headers.forEach((header, index) => {
        header.addEventListener('click', () => {
            const isNumeric = index !== 1 && index !== 2 && index !== 8;
            sortTable(index, isNumeric);
            updateSummaryBar();
        });
    });
  
    function sortTable(columnIndex, isNumeric) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const ascending = !(activeSort.column === columnIndex && activeSort.ascending);
        activeSort = { column: columnIndex, ascending };
  
        headers.forEach(header => header.classList.remove('asc', 'desc'));
        headers[columnIndex].classList.add(ascending ? 'asc' : 'desc');
  
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[columnIndex].textContent.trim();
            const cellB = rowB.cells[columnIndex].textContent.trim();
            let a = cellA, b = cellB;
            if (isNumeric) {
                a = parseFloat(cellA.replace(/[₪,%]/g, ''));
                b = parseFloat(cellB.replace(/[₪,%]/g, ''));
            }
            return (a < b ? -1 : a > b ? 1 : 0) * (ascending ? 1 : -1);
        });
  
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    }
  
    // Update summary bar
    function updateSummaryBar() {
        summaryBar.innerHTML = '';
        for (const key in activeFilters) {
            const filterCard = document.createElement('div');
            filterCard.classList.add('summary-card');
            filterCard.innerHTML = `${activeFilters[key]} <span class="remove-filter" data-filter="${key}">×</span>`;
            summaryBar.appendChild(filterCard);
        }
  
        if (activeSort.column !== null) {
            const sortCard = document.createElement('div');
            sortCard.classList.add('summary-card');
            const sortDirection = activeSort.ascending ? 'עולה' : 'יורד';
            sortCard.innerHTML = `${headers[activeSort.column].textContent}: ${sortDirection} <span class="remove-filter" data-sort="true">×</span>`;
            summaryBar.appendChild(sortCard);
        }
  
        document.querySelectorAll('.remove-filter').forEach(button => {
            button.addEventListener('click', () => {
                if (button.dataset.sort) {
                    activeSort = { column: null, ascending: true };
                } else {
                    delete activeFilters[button.dataset.filter];
                }
                applyFiltersAndSort();
            });
        });
    }
  
    function applyFiltersAndSort() {
        let filteredData = [...originalData];
        if (activeFilters['city']) filteredData = filteredData.filter(item => item.CityDescription === activeFilters['city'].split(': ')[1]);
        if (activeFilters['price']) {
            const [min, max] = activeFilters['price'].match(/\d+/g).map(Number);
            filteredData = filteredData.filter(item => item.PricePerUnit >= min && item.PricePerUnit <= max);
        }
        if (activeFilters['chances']) {
            const min = parseFloat(activeFilters['chances'].match(/\d+/)[0]);
            filteredData = filteredData.filter(item => (item.LotteryApparmentsNum / item.TotalSubscribers) * 100 >= min);
        }
        populateTable(filteredData);
        populateSummaryData(filteredData);
        if (activeSort.column !== null) sortTable(activeSort.column, activeSort.column !== 1 && activeSort.column !== 2 && activeSort.column !== 8);
        updateSummaryBar();
    }
  });