document.addEventListener('DOMContentLoaded', function () {
  const tableBody = document.querySelector('#lottery-table tbody');
  const summaryTableBody = document.querySelector('#summary-table tbody');
  const headers = document.querySelectorAll('.sortable-header');
  const summaryHeaders = document.querySelectorAll('#summary-table th.sortable');
  const applyFilterButton = document.getElementById('apply-filter');
  const resetButton = document.getElementById('reset-button');
  const summaryBar = document.getElementById('summary-bar');
  const toolbar = document.getElementById('toolbar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');// Add "Enter" key event listeners to filter inputs

  // Define column types as an object for easy reference
  const columnTypes = {
    LotteryNumber: 'number',
    CityDescription: 'string',
    ContractorDescription: 'string',
    LotteryApparmentsNum: 'number',
    TotalSubscribers: 'number',
    PricePerUnit: 'number',
    GrantSize: 'number',
    winningChances: 'number',
    IsReligious: 'string'
  };

  // Map column indices to column names
  const columnNames = [
    'LotteryNumber',
    'CityDescription',
    'ContractorDescription',
    'LotteryApparmentsNum',
    'TotalSubscribers',
    'PricePerUnit',
    'GrantSize',
    'winningChances',
    'IsReligious'
  ];

  // Add "Enter" key event listeners to filter inputs
  document.querySelectorAll('#price-min, #price-max, #chances-min, #city-filter').forEach(input => {
    input.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();  // Prevents any default form action
        // applyFiltersAndSort();  // Apply filters when "Enter" is pressed
        applyFilterButton.click();  // Simulates a button click to apply filters
      }
    });
  });
  const SortState = {
    ASCENDING: 'asc',
    DESCENDING: 'desc',
    NEUTRAL: 'neutral',
  };
  
  let activeSortAllData = { column: null, state: SortState.NEUTRAL };
  let activeSortSummary = { column: null, state: SortState.NEUTRAL };
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

      toolbar.style.display = targetTab === 'all-data' ? 'flex' : 'none';
      resetButton.style.display = targetTab === 'all-data' ? 'inline-block' : 'none';
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

      // Add medals to top 3 in originalData based on sorted winning chances
      originalDataSortedByChances.forEach((item, index) => {
        const originalItem = originalData.find(origItem => origItem.LotteryNumber === item.LotteryNumber);
        originalItem.medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      });

      populateTable(originalData);
      populateSummaryData(originalData);
      populateCityFilterOptions(originalData);
    });

  // Populate "All Data" table
  function populateTable(data) {
    tableBody.innerHTML = "";  // Clear existing rows
    data.forEach(item => {
      const chances = item.winningChances.toFixed(3) + '%';
      const row = document.createElement('tr');
      row.innerHTML = `
              <td>${item.LotteryNumber}</td>
              <td>${item.CityDescription}</td>
              <td>${item.ContractorDescription}</td>
              <td>${item.LotteryApparmentsNum.toLocaleString()}</td>
              <td>${item.TotalSubscribers.toLocaleString()}</td>
              <td>₪${item.PricePerUnit.toFixed(2).toLocaleString()}</td>
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

  // Sorting functionality for each header
  headers.forEach((header, index) => {
    header.addEventListener('click', () => {
      // Determine next state
      const currentSortState = activeSortAllData.column === index ? activeSortAllData.state : SortState.NEUTRAL;
      const nextState = getNextSortState(currentSortState);

      // Reset all headers' classes
      headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      if (nextState !== SortState.NEUTRAL) {
        header.classList.add(nextState === SortState.ASCENDING ? 'sort-asc' : 'sort-desc');
      }

      // Update active sort state
      activeSortAllData = { column: index, state: nextState };
      // Perform sorting if not neutral
      if (nextState === SortState.NEUTRAL) {
        populateTable(originalData); // Reset to initial unsorted state
      } else {
        const isAscending = nextState === SortState.ASCENDING;
        // sortTable(index, isAscending);
        sortTable(tableBody, index, isAscending);
      }
    });
  });

  // Set up sorting for Summary Table
  summaryHeaders.forEach((header, index) => {
    header.addEventListener('click', () => {
      const currentSortState = activeSortSummary.column === index ? activeSortSummary.state : SortState.NEUTRAL;
      const nextState = getNextSortState(currentSortState);

      summaryHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      if (nextState !== SortState.NEUTRAL) {
        header.classList.add(nextState === SortState.ASCENDING ? 'sort-asc' : 'sort-desc');
      }

      activeSortSummary = { column: index, state: nextState };
      if (nextState === SortState.NEUTRAL) {
        renderSummaryTable(citySummaryData);
      } else {
        const isAscending = nextState === SortState.ASCENDING;
        sortTable(summaryTableBody, index, isAscending);
      }
    });
  });

  // Helper function to cycle through sort states
  function getNextSortState(currentState) {
    switch (currentState) {
      case SortState.NEUTRAL: return SortState.ASCENDING;
      case SortState.ASCENDING: return SortState.DESCENDING;
      case SortState.DESCENDING: return SortState.NEUTRAL;
      default: return SortState.NEUTRAL;
    }
  }


  
  // Sorting function that considers data types
  function sortTable(tableBody, columnIndex, isAscending) {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const columnName = columnNames[columnIndex];
    const columnType = columnTypes[columnName];

    rows.sort((rowA, rowB) => {
      let a = rowA.cells[columnIndex].textContent.trim();
      let b = rowB.cells[columnIndex].textContent.trim();

      if (columnType === 'number') {
        a = parseFloat(a.replace(/[^\d.-]/g, ''));
        b = parseFloat(b.replace(/[^\d.-]/g, ''));
      }

      if (a < b) return isAscending ? -1 : 1;
      if (a > b) return isAscending ? 1 : -1;
      return 0;
    });

    tableBody.innerHTML = '';
    rows.forEach(row => tableBody.appendChild(row));
  }

  // Update summary bar to show active filters and sorting
  function updateSummaryBar() {
    summaryBar.innerHTML = '';  // Clear the summary bar

    // Display active filters with removable X
    for (const key in activeFilters) {
      const filterCard = document.createElement('div');
      filterCard.classList.add('summary-card');
      filterCard.innerHTML = `${activeFilters[key]} <span class="remove-filter" data-filter="${key}">×</span>`;
      summaryBar.appendChild(filterCard);
    }

    // Display active sort indicator, if any
    if (activeSortAllData.column !== null) {
      const sortCard = document.createElement('div');
      sortCard.classList.add('summary-card');
      const sortDirection = activeSortAllData.state === SortState.ASCENDING ? 'עולה' : 'יורד';
      sortCard.innerHTML = `${headers[activeSortAllData.column].textContent}: ${sortDirection} <span class="remove-filter" data-sort="true">×</span>`;
      summaryBar.appendChild(sortCard);
    }

    // Set up event listeners for filter removal
    document.querySelectorAll('.remove-filter').forEach(button => {
      button.addEventListener('click', () => {
        const filterKey = button.dataset.filter;
        if (filterKey) {
          delete activeFilters[filterKey];  // Remove specific filter
        } else if (button.dataset.sort) {
          activeSortAllData = { column: null, state: SortState.NEUTRAL };  // Reset sorting
        }
        applyFiltersAndSort();  // Reapply filters and sorting
      });
    });
  }

  // Apply active filters and sort state to data
  function applyFiltersAndSort() {
    let filteredData = [...originalData];  // Start with all data

    // Apply each filter conditionally
    if (activeFilters['city']) {
      const city = activeFilters['city'].split(': ')[1];
      filteredData = filteredData.filter(item => item.CityDescription === city);
    }
    if (activeFilters['price']) {
      const [min, max] = activeFilters['price'].match(/\d+/g).map(Number);
      filteredData = filteredData.filter(item => item.PricePerUnit >= min && item.PricePerUnit <= max);
    }
    if (activeFilters['chances']) {
      const min = parseFloat(activeFilters['chances'].match(/\d+/)[0]);
      filteredData = filteredData.filter(item => (item.LotteryApparmentsNum / item.TotalSubscribers) * 100 >= min);
    }

    // Apply sorting if there’s an active sort column
    if (activeSortAllData.column !== null) {
      const isAscending = activeSortAllData.state === SortState.ASCENDING;
      sortTable(tableBody, activeSortAllData.column, isAscending);
    }

    populateTable(filteredData);  // Update table with filtered data
    updateSummaryBar();  // Update summary bar to reflect current filters
  }
});
