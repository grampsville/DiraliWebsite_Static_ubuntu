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
    const headers = document.querySelectorAll('th.sortable');
    const applyFilterButton = document.getElementById('apply-filter');
    const resetButton = document.getElementById('reset-button');
    const summaryBar = document.getElementById('summary-bar');
    let activeSort = { column: null, ascending: true };
    let activeFilters = {};
    const dataUrl = '/data';
    let originalData = [];
  
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
            addCitySummaryRows(originalData);
        })
        .finally(() => {
          // Hide skeleton loader and show table
          skeletonLoader.style.display = 'none';
          tableContainers.forEach(container => {
            container.style.display = 'block';
          });
        });
  
    // Populate table with data
    function populateTable(data) {
        tableBody.innerHTML = "";
        data.forEach(item => {
            const row = document.createElement('tr');
            const chances = item.TotalSubscribers > 0 
                ? ((item.LotteryApparmentsNum / item.TotalSubscribers) * 100).toFixed(3) + '%'
                : '0.000%';
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
  
    // Populate city filter options
    function populateCityFilterOptions(data) {
        const cityFilter = document.getElementById('city-filter');
        const cities = [...new Set(data.map(item => item.CityDescription))].sort();
        cityFilter.innerHTML = `<option value="">הכל</option>` + cities.map(city => `<option value="${city}">${city}</option>`).join('');
    }
  
    // Add summary rows for each city
    function addCitySummaryRows(data) {
        const cityGroups = data.reduce((acc, project) => {
            if (!acc[project.CityDescription]) {
                acc[project.CityDescription] = [];
            }
            acc[project.CityDescription].push(project);
            return acc;
        }, {});
  
        const citySummaryRows = [];
  
        Object.keys(cityGroups).forEach(city => {
            const cityProjects = cityGroups[city];
            const totalLotteryApparmentsNum = cityProjects.reduce((sum, project) => sum + project.LotteryApparmentsNum, 0);
            const maxSubscribers = Math.max(...cityProjects.map(project => project.TotalSubscribers));
            const cityChances = maxSubscribers > 0 ? (totalLotteryApparmentsNum / maxSubscribers) * 100 : 0;
            let formattedCityChances = cityChances.toFixed(3) + '%';
  
            // Add medals for top 3 chances
            citySummaryRows.push({ city, totalLotteryApparmentsNum, maxSubscribers, cityChances });
        });
  
        // Sort and add medals for the top 3 city chances
        citySummaryRows.sort((a, b) => b.cityChances - a.cityChances);
        citySummaryRows.forEach((summary, index) => {
            let medal = '';
            if (index === 0) medal = ' 🥇';
            else if (index === 1) medal = ' 🥈';
            else if (index === 2) medal = ' 🥉';
  
            const summaryRow = document.createElement('tr');
            summaryRow.innerHTML = `
                <td colspan="1"></td>
                <td>${summary.city} סה״כ</td>
                <td></td>
                <td>${summary.totalLotteryApparmentsNum}</td>
                <td>${summary.maxSubscribers}</td>
                <td></td>
                <td></td>
                <td>${summary.cityChances.toFixed(3)}%${medal}</td>
                <td></td>
            `;
            summaryRow.style.backgroundColor = '#D3D3D3';
            tableBody.appendChild(summaryRow);
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
        addCitySummaryRows(filteredData);
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
        addCitySummaryRows(originalData);
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
        addCitySummaryRows(filteredData);
        if (activeSort.column !== null) sortTable(activeSort.column, activeSort.column !== 1 && activeSort.column !== 2 && activeSort.column !== 8);
        updateSummaryBar();
    }
  });