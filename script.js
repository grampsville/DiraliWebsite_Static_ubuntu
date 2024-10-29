document.addEventListener('DOMContentLoaded', function () {
  const allDataTableBody = document.querySelector('#lottery-table tbody');
  const summaryTableBody = document.querySelector('#summary-table tbody');
  const headers = document.querySelectorAll('.sortable-header');
  const summaryHeaders = document.querySelectorAll('#summary-table th.sortable');
  const applyFilterButton = document.getElementById('apply-filter');
  const resetButton = document.getElementById('reset-button');
  const filterSummaryBar = document.getElementById('summary-bar');
  const toolbar = document.getElementById('toolbar');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');// Add "Enter" key event listeners to filter inputs

  // Define column types as an object for easy reference
  const allDataTableColumnTypes = {
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
  const allDataTableColumnNames = [
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
  
  const summaryDataTableColumnTypes = {
    city: 'string',
    totalLotteryApparmentsNum: 'number',
    maxSubscribers: 'number',
    avgPricePerUnit: 'number',
    cityChances: 'number'
  };
  // Map column indices to column names
  const summaryDataTableColumnNames = [
    'city',
    'totalLotteryApparmentsNum',
    'maxSubscribers',
    'avgPricePerUnit',
    'cityChances'
  ];
  
  // Add "Enter" key event listeners to filter inputs
  document.querySelectorAll('#price-min, #price-max, #chances-min, #city-filter').forEach(input => {
    input.addEventListener('keydown', function (event) {
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
  let activeSortSummaryData = { column: null, state: SortState.NEUTRAL };
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
      // resetButton.style.display = targetTab === 'all-data' ? 'inline-block' : 'none';

      // Show toolbar and filter bar only in "All Data" tab
      switch (targetTab) {
        case 'all-data':
          toolbar.style.display = 'flex';
          filterSummaryBar.style.display = 'flex';
          resetButton.style.display = 'inline-block';
          break;
        case 'summary-data':
          toolbar.style.display = 'none';
          filterSummaryBar.style.display = 'none';
          resetButton.style.display = 'none';
          break;
        default:
          toolbar.style.display = 'none';
          filterSummaryBar.style.display = 'none';
          resetButton.style.display = 'none';
          break;
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

      // Add medals to top 3 in originalData based on sorted winning chances
      originalDataSortedByChances.forEach((item, index) => {
        const originalItem = originalData.find(origItem => origItem.LotteryNumber === item.LotteryNumber);
        originalItem.medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      });

      renderAllDataTable(originalData);
      populateSummaryData(originalData);
      populateCityFilterOptions(originalData);
    });

  // Render "All Data" table
  function renderAllDataTable(data) {
    allDataTableBody.innerHTML = "";  // Clear existing rows
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
      allDataTableBody.appendChild(row);
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
    renderSummaryDataTable(citySummaryData);
  }

  // Render "Summary Data" table with medals for top 3
  function renderSummaryDataTable(summaryData) {
    summaryTableBody.innerHTML = "";
    summaryData.forEach((summary, index) => {
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

  // Populate city filter options
  function populateCityFilterOptions(data) {
    const cityFilter = document.getElementById('city-filter');
    const cities = [...new Set(data.map(item => item.CityDescription))].sort();
    cityFilter.innerHTML = `<option value="">הכל</option>` + cities.map(city => `<option value="${city}">${city}</option>`).join('');
  }

  // Apply filters
  applyFilterButton.addEventListener('click', applyFilters);

  function applyFilters() {
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

    renderAllDataTable(filteredData);
    updateFilterBar();
    resetButton.style.display = 'inline-block';
  }

  // Reset filters and sorting
  resetButton.addEventListener('click', resetFiltersAndSorting);

  function resetFiltersAndSorting() {
    // Clear sorting classes from headers
    // if (this.dataset.tab === 'all-data') {
    //   activeSortAllData = { column: null, state: SortState.NEUTRAL };
    //   headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    // } else {
    //   activeSortSummaryData = { column: null, state: SortState.NEUTRAL };
    //   summaryHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    // }
    // Reset sorting states
    activeSortAllData = { column: null, state: SortState.NEUTRAL };
    activeSortSummaryData = { column: null, state: SortState.NEUTRAL };
    // Clear sorting classes from headers
    headers.forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
    summaryHeaders.forEach(header => header.classList.remove('sort-asc', 'sort-desc'));

    // Clear all filters
    activeFilters = {};

    // Reset filter inputs to empty
    document.getElementById('city-filter').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('chances-min').value = '';

    renderAllDataTable(originalData);
    renderSummaryDataTable(citySummaryData); // Reset summary table to original
    updateFilterBar();
    resetButton.style.display = 'inline-block';
  }

  // Sorting functionality for each header
  headers.forEach((header, index) => {
    header.addEventListener('click', () => {
      const isAllDataTabActive = document.getElementById('all-data').classList.contains('active');
      if (isAllDataTabActive) {
        // Determine next state
        const currentSortState = activeSortAllData.column === index ? activeSortAllData.state : SortState.NEUTRAL;
        const nextState = getNextSortState(currentSortState);

        // Reset all headers' classes
        headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        if (nextState !== SortState.NEUTRAL) {
          header.classList.add(nextState === SortState.ASCENDING ? 'sort-asc' : 'sort-desc');
        }

        activeSortAllData = { column: index, state: nextState };

        applyFiltersAndSort()
      }
    });
  });

  // Set up sorting for Summary Table
  summaryHeaders.forEach((header, index) => {
    header.addEventListener('click', () => {
      const isSummaryDataTabActive = document.getElementById('summary-data').classList.contains('active');
      if (isSummaryDataTabActive) {

        const currentSortState = activeSortSummaryData.column === index ? activeSortSummaryData.state : SortState.NEUTRAL;
        const nextState = getNextSortState(currentSortState);

        summaryHeaders.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        if (nextState !== SortState.NEUTRAL) {
          header.classList.add(nextState === SortState.ASCENDING ? 'sort-asc' : 'sort-desc');
        }

        activeSortSummaryData = { column: index, state: nextState };
        applyFiltersAndSort()
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

  function sortDataByColumn(a, b, columnIndex, isAscending, columnNames, columnTypes) {
    const columnName = columnNames[columnIndex];
    const columnType = columnTypes[columnName];
    let valA = a[columnName];
    let valB = b[columnName];

    // Adjust for data type in sorting
    if (columnType === 'number') {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
    } else {
        valA = valA.toString();
        valB = valB.toString();
    }

    if (valA < valB) return isAscending ? -1 : 1;
    if (valA > valB) return isAscending ? 1 : -1;
    return 0;
}

  // Update summary bar to show active filters and sorting
  function updateFilterBar() {
    filterSummaryBar.innerHTML = '';  // Clear the summary bar

    // Display active filters with removable X
    for (const key in activeFilters) {
      const filterCard = document.createElement('div');
      filterCard.classList.add('summary-card');
      filterCard.innerHTML = `${activeFilters[key]} <span class="remove-filter" data-filter="${key}">x</span>`;
      filterSummaryBar.appendChild(filterCard);
    }

    // Display active sort indicator, if any
    if (activeSortAllData.column !== null) {
      const sortCard = document.createElement('div');
      sortCard.classList.add('summary-card');
      const sortDirection = activeSortAllData.state === SortState.ASCENDING ? 'עולה' : 'יורד';
      sortCard.innerHTML = `${headers[activeSortAllData.column].textContent}: ${sortDirection} <span class="remove-filter" data-sort="true">×</span>`;
      filterSummaryBar.appendChild(sortCard);
    }

    // Set up event listeners for filter removal
    document.querySelectorAll('.remove-filter').forEach(button => {
      button.addEventListener('click', () => {
        const filterKey = button.dataset.filter;
        if (filterKey) {
          delete activeFilters[filterKey];  // Remove specific filter
        } else if (button.dataset.sort) {   // Clear sorting classes from headers in both tables to reset arrow colors to white
          const isAllDataTabActive = document.getElementById('all-data').classList.contains('active');
          const isSummaryDataTabActive = document.getElementById('summary-data').classList.contains('active');
          if(isAllDataTabActive){
            activeSortAllData = { column: null, state: SortState.NEUTRAL }; 
            headers.forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
          } else if (isSummaryDataTabActive){
            activeSortSummaryData = { column: null, state: SortState.NEUTRAL };
            summaryHeaders.forEach(header => header.classList.remove('sort-asc', 'sort-desc')); // Reset sorting
          }
          summaryHeaders.forEach(header => header.classList.remove('sort-asc', 'sort-desc')); // Reset sorting
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

    // Check which tab is active and apply sorting only to the active table
    const isAllDataTabActive = document.getElementById('all-data').classList.contains('active');
    const isSummaryDataTabActive = document.getElementById('summary-data').classList.contains('active');
    // Apply sorting if there’s an active sort column
    if (isAllDataTabActive && activeSortAllData.column !== null) {
      const isAscending = activeSortAllData.state === SortState.ASCENDING;
      // sortTable(allDataTableBody, activeSortAllData.column, isAscending);
      filteredData.sort((a, b) => sortDataByColumn(a, b, activeSortAllData.column, isAscending, allDataTableColumnNames, allDataTableColumnTypes));
      renderAllDataTable(filteredData);  // Update table with filtered data
    }
    // Apply sorting if there’s an active sort column
    else if (isSummaryDataTabActive && activeSortSummaryData.column !== null) {
      const isAscending = activeSortSummaryData.state === SortState.ASCENDING;
      // sortTable(summaryTableBody, activeSortSummaryData.column, isAscending);
      citySummaryData.sort((a, b) => sortDataByColumn(a, b, activeSortSummaryData.column, isAscending, summaryDataTableColumnNames, summaryDataTableColumnTypes));
      renderSummaryDataTable(citySummaryData);  // Update table with filtered data
    }

    updateFilterBar();  // Update summary bar to reflect current filters
  }
});
