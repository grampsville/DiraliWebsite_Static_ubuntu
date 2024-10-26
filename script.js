document.addEventListener('DOMContentLoaded', function () {
  const tableBody = document.querySelector('#lottery-table tbody');
  const summaryTableBody = document.querySelector('#summary-table tbody');
  const headers = document.querySelectorAll('th.sortable');
  const summaryHeaders = document.querySelectorAll('#summary-table th.sortable');
  const applyFilterButton = document.getElementById('apply-filter');
  const resetButton = document.getElementById('reset-button');
  const summaryBar = document.getElementById('summary-bar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  let activeSort = { column: null, ascending: true };
  let activeFilters = {};
  const dataUrl = '/data';
  let originalData = [];
  let citySummaryData = [];

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');
      this.classList.add('active');
      
      // Show toolbar, search, and reset buttons only in "All Data" tab
      if (targetTab === 'all-data') {
        toolbar.style.display = 'flex';
        resetButton.style.display = 'inline-block';
      } else {
        toolbar.style.display = 'none';
        resetButton.style.display = 'none';
      }
    });
  });

  // Fetch data and initialize tables
  fetch(dataUrl)
    .then(response => response.json())
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

      // Add winningChances field to each item in originalData
      originalData = originalData.map(item => {
        item.winningChances = item.TotalSubscribers > 0
          ? (item.LotteryApparmentsNum / item.TotalSubscribers) * 100
          : 0;
        return item;
      });

      const originalDataSortedByChances = [...originalData].sort((a, b) => b.winningChances - a.winningChances);

      // // Sort by winning chances and add medals to top 3 for the "All Data" table
      // originalData.sort((a, b) => {
      //   const chanceA = a.TotalSubscribers > 0 ? a.LotteryApparmentsNum / a.TotalSubscribers : 0;
      //   const chanceB = b.TotalSubscribers > 0 ? b.LotteryApparmentsNum / b.TotalSubscribers : 0;
      //   return chanceB - chanceA;
      // });


      // Add medals to top 3 in originalData based on sorted winning chances
      originalDataSortedByChances.forEach((item, index) => {
        const originalItem = originalData.find(origItem => origItem.LotteryNumber === item.LotteryNumber);
        if (index === 0) originalItem.medal = '🥇';
        else if (index === 1) originalItem.medal = '🥈';
        else if (index === 2) originalItem.medal = '🥉';
        else originalItem.medal = '';
      });

      // // Add medals to the top 3 entries with the highest chances
      // originalData = originalData.map((item, index) => {
      //   if (index === 0) item.medal = '🥇';
      //   else if (index === 1) item.medal = '🥈';
      //   else if (index === 2) item.medal = '🥉';
      //   else item.medal = '';
      //   return item;
      // });

      populateTable(originalData);
      populateSummaryData(originalData);
      populateCityFilterOptions(originalData);
    });

  // Populate "All Data" table
  function populateTable(data) {
    tableBody.innerHTML = "";  // Clear existing rows
    data.forEach(item => {
      // Display the calculated winning chances and medals if available
      const chances = item.winningChances.toFixed(3) + '%';
      const row = document.createElement('tr');
      row.innerHTML = `
              <td>${item.LotteryNumber}</td>
              <td>${item.CityDescription}</td>
              <td>${item.ContractorDescription}</td>
              <td>${item.LotteryApparmentsNum}</td>
              <td>${item.TotalSubscribers}</td>
              <td>₪${item.PricePerUnit.toLocaleString()}</td>
              <td>₪${item.GrantSize.toLocaleString()}</td>
              <td>${chances} ${item.medal}</td>
              <td>${item.IsReligious ? 'צביון חרדי' : ''}</td>
          `;
      tableBody.appendChild(row);
    });
  }

  // Populate "Summary Data" table
  function populateSummaryData(data) {
    const cityGroups = data.reduce((acc, project) => {
      if (!acc[project.CityDescription]) {
        acc[project.CityDescription] = [];
      }
      acc[project.CityDescription].push(project);
      return acc;
    }, {});

    citySummaryData = [];

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
    renderSummaryTable(citySummaryData);
  }

  // Render "Summary Data" table with medals for top 3
  function renderSummaryTable(summaryData) {
    summaryTableBody.innerHTML = "";
    summaryData.forEach((summary, index) => {
      let medal = '';
      if (index === 0) medal = ' 🥇';
      else if (index === 1) medal = ' 🥈';
      else if (index === 2) medal = ' 🥉';

      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
              <td>${summary.city} סה״כ</td>
              <td>${summary.totalLotteryApparmentsNum}</td>
              <td>${summary.maxSubscribers}</td>
              <td>₪${summary.avgPricePerUnit.toLocaleString()}</td>
              <td>${summary.cityChances.toFixed(3)}%${medal}</td>
          `;
      summaryTableBody.appendChild(summaryRow);
    });
  }

  // Populate city filter options
  function populateCityFilterOptions(data) {
    const cityFilter = document.getElementById('city-filter');
    const cities = [...new Set(data.map(item => item.CityDescription))].sort();
    cityFilter.innerHTML = `<option value="">הכל</option>` + cities.map(city => `<option value="${city}">${city}</option>`).join('');
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
    updateSummaryBar();
    resetButton.style.display = 'inline-block';
  });

  // Reset filters and sorting
  resetButton.addEventListener('click', resetFiltersAndSorting);

  function resetFiltersAndSorting() {
    activeSort = { column: null, ascending: true };
    activeFilters = {};
    document.getElementById('city-filter').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('chances-min').value = '';
    populateTable(originalData);
    renderSummaryTable(citySummaryData); // Reset summary table to original
    updateSummaryBar();
    resetButton.style.display = 'inline-block';
  }

  // Sorting logic for All Data and Summary tables
  headers.forEach((header, index) => {
    header.addEventListener('click', () => {
      const isNumeric = index !== 1 && index !== 2 && index !== 8;
      sortTable(tableBody, index, isNumeric);
      updateSummaryBar();
    });
  });

  summaryHeaders.forEach((header, index) => {
    header.addEventListener('click', () => {
      const isNumeric = index !== 0; // Assume all except city column are numeric
      sortTable(summaryTableBody, index, isNumeric);
    });
  });

  function sortTable(tableBody, columnIndex, isNumeric) {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const ascending = !(activeSort.column === columnIndex && activeSort.ascending);
    activeSort = { column: columnIndex, ascending };

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
    if (activeSort.column !== null) sortTable(tableBody, activeSort.column, activeSort.column !== 1 && activeSort.column !== 2 && activeSort.column !== 8);
    updateSummaryBar();
  }
});
