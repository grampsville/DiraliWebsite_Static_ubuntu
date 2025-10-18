document.addEventListener('DOMContentLoaded', function () {
    const skeletonLoader = document.getElementById('skeleton-loader');
    const tableContainers = document.querySelectorAll('.table-container');

    // Show skeleton loader and hide tables using .hidden class
    console.log('Showing skeleton loader');
    skeletonLoader.classList.remove('hidden');
    tableContainers.forEach(container => container.classList.add('hidden'));
    const tableBody = document.querySelector('#lottery-table tbody');
    const summaryTableBody = document.querySelector('#summary-table tbody');
    let globalScrollbar = document.getElementById('global-scrollbar');
    let globalInner = globalScrollbar?.querySelector('.global-inner');
    let activeContainer = null;
    let containerScrollHandler = null;
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
        tableContainers.forEach(container => container.classList.add('hidden'));

        // Show the table container for the active tab
        const activeTableContainer = activeTabContent.querySelector('.table-container');
        if (activeTableContainer) {
          activeTableContainer.classList.remove('hidden');
        }
        // update global scrollbar to match newly active table
        updateGlobalScrollbar();

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
          // Hide skeleton loader and show initial tab/table
          skeletonLoader.classList.add('hidden');

          // Simulate a click on the "All Data" tab button to display the initial table
          document.querySelector('.tab-button[data-tab="all-data"]').click();
          // ensure scrollbar sized after initial table shown
          setTimeout(updateGlobalScrollbar, 50);
        });
  
    // Populate "All Data" table
    function populateTable(data) {
        tableBody.innerHTML = "";  // Clear existing rows
        
        // Create city summary dictionary
        const citySummaries = {};
        
        // First pass: collect data by city
        data.forEach(item => {
            // Calculate remaining units after assignments
            const localHULeft = item.LocalHousing - item.TotalLocalSubscribers;
            const localHULeftForCalc = localHULeft <= 0 ? 0 : localHULeft;

            const reserveDutyHULeft = item.HU_Reservists_L - item.TotalReservedDutySubscribers;
            const reserveDutyHULeftForCalc = reserveDutyHULeft <= 0 ? 0 : reserveDutyHULeft;

            const reserveCombatHULeft = item.HU_CombatReservist_L - item.TotalCombatReservistSubscribers;
            const reserveCombatHULeftForCalc = reserveCombatHULeft <= 0 ? 0 : reserveCombatHULeft;

            const handicappedHULeft = item.HousingUnitsForHandicapped - item.TotalHandicappedSubscribers;
            const handicappedHULeftForCalc = handicappedHULeft <= 0 ? 0 : handicappedHULeft;

            // Calculate chances for each category
            const totalChances = item.TotalSubscribers <= 0 ? 100 : 
                ((item.LotteryApparmentsNum - item.LocalHousing - item.HU_Reservists_L - 
                  item.HU_CombatReservist_L - item.HousingUnitsForHandicapped) / 
                  item.TotalSubscribers) * 100;
            const totalChancesToDisplay = totalChances.toFixed(3) + '%';

            const noStatusChances = item.TotalSubscribers <= 0 ? 100 :
                ((item.LotteryApparmentsNum - localHULeftForCalc - reserveDutyHULeftForCalc - 
                  reserveCombatHULeftForCalc - handicappedHULeftForCalc) / item.TotalSubscribers) * 100;
            const noStatusChancesToDisplay = noStatusChances.toFixed(3) + '%';

            const localChances = item.LocalHousing > item.TotalLocalSubscribers || item.TotalSubscribers <= 0 ? 100 :
                (item.LocalHousing / item.TotalLocalSubscribers) * 100;
            const localChancesToDisplay = (totalChances < localChances ? localChances : totalChances).toFixed(3) + '%';

            const reserveDutyChances = item.HU_Reservists_L > item.TotalReservedDutySubscribers || item.TotalSubscribers <= 0 ? 100 :
                (item.HU_Reservists_L / item.TotalReservedDutySubscribers) * 100;
            const reserveDutyChancesToDisplay = (totalChances < reserveDutyChances ? reserveDutyChances : totalChances).toFixed(3) + '%';

            const reserveCombatChances = item.HU_CombatReservist_L > item.TotalCombatReservistSubscribers || item.TotalSubscribers <= 0 ? 100 :
                (item.HU_CombatReservist_L / item.TotalCombatReservistSubscribers) * 100;
            const reserveCombatChancesToDisplay = (totalChances < reserveCombatChances ? reserveCombatChances : totalChances).toFixed(3) + '%';

            const handicappedChances = item.HousingUnitsForHandicapped > item.TotalHandicappedSubscribers || item.TotalSubscribers <= 0 ? 100 :
                (item.HousingUnitsForHandicapped / item.TotalHandicappedSubscribers) * 100;
            const handicappedChancesToDisplay = (totalChances < handicappedChances ? handicappedChances : totalChances).toFixed(3) + '%';

            // Create or get city entry
            if (!citySummaries[item.CityDescription]) {
                citySummaries[item.CityDescription] = {
                    rows: [],
                    totals: {
                        totalHousingUnits: 0,
                        localHousingUnits: 0,
                        reserveDutyHousingUnits: 0,
                        reserveCombatHousingUnits: 0,
                        handicappedHousingUnits: 0,
                        noStatusChances: [],
                        localChances: [],
                        reserveDutyChances: [],
                        reserveCombatChances: [],
                        handicappedChances: []
                    }
                };
            }

            // Add lottery data to city summary
            const cityData = citySummaries[item.CityDescription];
            cityData.rows.push({
                lotteryNumber: item.LotteryNumber,
                data: {
                    totalHousingUnits: item.LotteryApparmentsNum,
                    localHousingUnits: item.LocalHousing || 0,
                    reserveDutyHousingUnits: item.HU_Reservists_L || 0,
                    reserveCombatHousingUnits: item.HU_CombatReservist_L || 0,
                    handicappedHousingUnits: item.HousingUnitsForHandicapped || 0,
                    pricePerUnit: item.PricePerUnit, // Add this line
                    noStatusChances: parseFloat(noStatusChances),
                    localChances: parseFloat(localChances),
                    reserveDutyChances: parseFloat(reserveDutyChances),
                    reserveCombatChances: parseFloat(reserveCombatChances),
                    handicappedChances: parseFloat(handicappedChances)
                }
            });

            // Update running totals
            cityData.totals.totalHousingUnits += item.LotteryApparmentsNum;
            cityData.totals.localHousingUnits += (item.LocalHousing || 0);
            cityData.totals.reserveDutyHousingUnits += (item.HU_Reservists_L || 0);
            cityData.totals.reserveCombatHousingUnits += (item.HU_CombatReservist_L || 0);
            cityData.totals.handicappedHousingUnits += (item.HousingUnitsForHandicapped || 0);
            cityData.totals.noStatusChances.push(parseFloat(noStatusChances));
            cityData.totals.localChances.push(parseFloat(localChances));
            cityData.totals.reserveDutyChances.push(parseFloat(reserveDutyChances));
            cityData.totals.reserveCombatChances.push(parseFloat(reserveCombatChances));
            cityData.totals.handicappedChances.push(parseFloat(handicappedChances));

            // Create and append the regular row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.CityDescription}</td>
                <td>${item.LotteryNumber}</td>
                <td>${item.ContractorDescription}</td>
                <td>${item.LotteryApparmentsNum}</td>
                <td>${item.TotalSubscribers}</td>
                <td>${(item.LocalHousing || 0).toLocaleString()}</td>
                <td>${(item.TotalLocalSubscribers || 0).toLocaleString()}</td>
                <td>${(item.HU_Reservists_L || 0).toLocaleString()}</td>
                <td>${(item.TotalReservedDutySubscribers || 0).toLocaleString()}</td>
                <td>${(item.HU_CombatReservist_L || 0).toLocaleString()}</td>
                <td>${(item.TotalCombatReservistSubscribers || 0).toLocaleString()}</td>
                <td>${(item.HousingUnitsForHandicapped || 0).toLocaleString()}</td>
                <td>${(item.TotalHandicappedSubscribers || 0).toLocaleString()}</td>
                <td>₪${item.PricePerUnit.toLocaleString()}</td>
                <td>₪${item.GrantSize.toLocaleString()}</td>
                <td>${item.IsReligious ? 'צביון חרדי' : ''}</td>
                <td>${noStatusChancesToDisplay}</td>
                <td>${localChancesToDisplay}</td>
                <td>${reserveDutyChancesToDisplay}</td>
                <td>${reserveCombatChancesToDisplay}</td>
                <td>${handicappedChancesToDisplay}</td>
            `;
            tableBody.appendChild(row);
        });

        // Second pass: add summary rows for each city
        Object.entries(citySummaries).forEach(([city, cityData]) => {
            const summaryRow = document.createElement('tr');
            summaryRow.classList.add('city-summary-row');
            
            // Calculate averages for chances and price
            const avgNoStatusChances = (cityData.totals.noStatusChances.reduce((a, b) => a + b, 0) / cityData.totals.noStatusChances.length).toFixed(3);
            const avgLocalChances = (cityData.totals.localChances.reduce((a, b) => a + b, 0) / cityData.totals.localChances.length).toFixed(3);
            const avgReserveDutyChances = (cityData.totals.reserveDutyChances.reduce((a, b) => a + b, 0) / cityData.totals.reserveDutyChances.length).toFixed(3);
            const avgReserveCombatChances = (cityData.totals.reserveCombatChances.reduce((a, b) => a + b, 0) / cityData.totals.reserveCombatChances.length).toFixed(3);
            const avgHandicappedChances = (cityData.totals.handicappedChances.reduce((a, b) => a + b, 0) / cityData.totals.handicappedChances.length).toFixed(3);
            
            // Calculate average price per unit for the city
            const avgPricePerUnit = cityData.rows.reduce((sum, row) => sum + row.data.pricePerUnit, 0) / cityData.rows.length;

            summaryRow.innerHTML = `
                <td>${city}</td>
                <td>סה״כ</td>
                <td>-</td>
                <td>${cityData.totals.totalHousingUnits}</td>
                <td>-</td>
                <td>${cityData.totals.localHousingUnits}</td>
                <td>-</td>
                <td>${cityData.totals.reserveDutyHousingUnits}</td>
                <td>-</td>
                <td>${cityData.totals.reserveCombatHousingUnits}</td>
                <td>-</td>
                <td>${cityData.totals.handicappedHousingUnits}</td>
                <td>-</td>
                <td>₪${avgPricePerUnit.toLocaleString()}</td>
                <td>-</td>
                <td>-</td>
                <td>${avgNoStatusChances}%</td>
                <td>${avgLocalChances}%</td>
                <td>${avgReserveDutyChances}%</td>
                <td>${avgReserveCombatChances}%</td>
                <td>${avgHandicappedChances}%</td>
            `;
            tableBody.appendChild(summaryRow);
        });

        // Update global scrollbar
        updateGlobalScrollbar();
        setTimeout(updateGlobalScrollbar, 50);
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
        // summary table changed -> update global scrollbar (if summary visible)
        updateGlobalScrollbar();
        setTimeout(updateGlobalScrollbar, 50);
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
  
    // User type handling
    const userTypeSelect = document.getElementById('user-type-select');
    const USER_TYPES = {
        REGULAR: 'רגיל',
        LOCAL: 'בני המקום',
        RESERVE_ACTIVE: 'מילואים פעיל',
        RESERVE_COMBAT: 'מילואים לוחם',
        DISABLED: 'נכים רתוקים'
    };

    // Populate user type select
    function populateUserTypes() {
        userTypeSelect.innerHTML = Object.values(USER_TYPES)
            .map(type => `<option value="${type}">${type}</option>`)
            .join('');
        
        // Set saved value or default to regular
        const savedType = localStorage.getItem('selectedUserType') || USER_TYPES.REGULAR;
        userTypeSelect.value = savedType;
    }

    // Handle user type selection
    userTypeSelect.addEventListener('change', function() {
        const selectedType = this.value;
        localStorage.setItem('selectedUserType', selectedType);
        // Here you can add logic to filter/highlight relevant columns based on user type
    });

    // Initialize user types
    populateUserTypes();
  
    // update and sync a global horizontal scrollbar that controls the active table's scrollLeft
    function updateGlobalScrollbar() {
        globalScrollbar = document.getElementById('global-scrollbar');
        globalInner = globalScrollbar?.querySelector('.global-inner');
        // debug
        // console.debug('updateGlobalScrollbar called', { globalScrollbar: !!globalScrollbar, globalInner: !!globalInner });

         const activeTableContainer = document.querySelector('.tab-content.active .table-container');
         const activeTable = activeTableContainer?.querySelector('table');

         if (!activeTable || !globalScrollbar || !globalInner) {
            if (globalScrollbar) {
                globalScrollbar.classList.remove('visible');
                globalScrollbar.classList.add('hidden');
                globalScrollbar.style.display = 'none';
            }
             // detach previous container listener if any
             if (activeContainer && containerScrollHandler) {
                 activeContainer.removeEventListener('scroll', containerScrollHandler);
                 containerScrollHandler = null;
                 activeContainer = null;
             }
             return;
         }

        // set width of inner element so the global scrollbar shows correct range
        const tableScrollWidth = Math.max(activeTable.scrollWidth, activeTable.offsetWidth, activeTableContainer.scrollWidth || 0);
        globalInner.style.width = tableScrollWidth + 'px';
        // Make global scrollbar visible (class + style)
        globalScrollbar.classList.remove('hidden');
        globalScrollbar.classList.add('visible');
        globalScrollbar.style.display = 'block';
        // sync initial scroll positions
        globalScrollbar.scrollLeft = activeTableContainer.scrollLeft || 0;

         // attach a single global scrollbar listener (once)
         if (!globalScrollbar._hasGlobalListener) {
            globalScrollbar.addEventListener('scroll', () => {
                if (activeContainer) activeContainer.scrollLeft = globalScrollbar.scrollLeft;
            }, { passive: true });
            globalScrollbar._hasGlobalListener = true;
         }

         // switch container listener when active container changes
         if (activeContainer !== activeTableContainer) {
             if (activeContainer && containerScrollHandler) {
                 activeContainer.removeEventListener('scroll', containerScrollHandler);
             }
             activeContainer = activeTableContainer;
             containerScrollHandler = function () {
                 globalScrollbar.scrollLeft = activeContainer.scrollLeft;
             };
             activeContainer.addEventListener('scroll', containerScrollHandler, { passive: true });
         }
        // small safety update after layout stabilizes
        setTimeout(() => {
            const newWidth = (activeTable.scrollWidth || tableScrollWidth);
            globalInner.style.width = newWidth + 'px';
        }, 60);
     }
 
     // update on window resize
     window.addEventListener('resize', () => {
         updateGlobalScrollbar();
     });
    // ensure initial sizing after window load too
    window.addEventListener('load', () => setTimeout(updateGlobalScrollbar, 100));
});

// Add CSS for city summary rows
const style = document.createElement('style');
style.textContent = `
    .city-summary-row {
        background-color: #f0f8ff;
        font-weight: bold;
    }
    .city-summary-row td {
        border-top: 2px solid #6DADE1;
    }
`;
document.head.appendChild(style);