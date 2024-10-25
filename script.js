document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.querySelector('#lottery-table tbody');
    const table = document.querySelector('#lottery-table');
    const messageDiv = document.getElementById('message');
  
    // First API call
    const apiUrl1 = 'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D4%26Entitlement%3D1%26PageNumber%3D1%26PageSize%3D50%26IsInit%3Dtrue%26';
  
    // Second API call
    const apiUrl2 = 'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber%3D2%26PageSize%3D50%26IsInit%3Dtrue%26';
  
    // Fetch data from both API endpoints
    Promise.all([fetch(apiUrl1), fetch(apiUrl2)])
      .then(responses => Promise.all(responses.map(res => res.json())))  // Parse both responses as JSON
      .then(dataArray => {
        const openLotteriesCount = dataArray[0].OpenLotteriesCount;  // Assuming both calls have the same count
  
        // Check if OpenLotteriesCount is 0
        if (openLotteriesCount === 0) {
          // Hide the table and show the message
          table.style.display = 'none';
  
          // Add the message content
          messageDiv.innerHTML = `
            אין הגרלות פעילות כרגע, לחץ <a href="#" id="alert-link">כאן</a> להרשם על מנת לקבל התרעה כשההגרלה תתחדש
          `;
  
          // Handle click event for the "alert-link"
          document.getElementById('alert-link').addEventListener('click', function () {
            alert('Registration for lottery alerts coming soon!');
            // Replace the alert with actual functionality for registering the user for alerts
          });
  
          return;  // Skip further execution if no active lotteries
        }
  
        // Combine both sets of ProjectItems
        const projects = [...dataArray[0].ProjectItems, ...dataArray[1].ProjectItems];
  
        // Get the SpecialLotteryDescription of the first valid project
        const firstSpecialLotteryDescription = projects[0]?.SpecialLotteryDescription;
  
        // Group projects by CityDescription and filter based on SpecialLotteryDescription
        const cityGroups = projects.reduce((acc, project) => {
          // Skip rows where SpecialLotteryDescription is null or doesn't match the first one
          if (project.SpecialLotteryDescription === null || project.SpecialLotteryDescription !== firstSpecialLotteryDescription) {
            return acc;
          }
  
          if (!acc[project.CityDescription]) {
            acc[project.CityDescription] = [];
          }
          acc[project.CityDescription].push(project);
          return acc;
        }, {});
  
        // Counter for unique cities with IsReligious === true
        let greenRowCounter = 3;
        const citySummaryRows = [];
        const uniqueReligiousCities = new Set();
  
        // Iterate over each city group and insert rows
        Object.keys(cityGroups).forEach(city => {
          const cityProjects = cityGroups[city];
  
          // Insert each individual project row for the city
          cityProjects.forEach(project => {
            const row = document.createElement('tr');
  
            // Calculate the chances of winning for individual project
            const chances = project.TotalSubscribers > 0 
              ? (project.LotteryApparmentsNum / project.TotalSubscribers) * 100
              : 0;
  
            // Format the chances to 3 decimal places
            const formattedChances = chances.toFixed(3) + '%';
  
            // Determine the value for the new "הערות" column
            const notes = project.IsReligious === true ? 'צביון חרדי' : '';
  
            // Populate the table row with data
            row.innerHTML = `
              <td>${project.LotteryNumber}</td>
              <td>${project.CityDescription}</td>
              <td>${project.ContractorDescription}</td>
              <td>${project.LotteryApparmentsNum}</td>
              <td>${project.TotalSubscribers}</td>
              <td>₪${project.PricePerUnit.toLocaleString()}</td>
              <td>₪${project.GrantSize.toLocaleString()}</td>
              <td>${formattedChances}</td>
              <td>${notes}</td>
            `;
  
            // Append the row to the table body
            tableBody.appendChild(row);
          });
  
          // Now, create the summary row for the city
          const totalLotteryApparmentsNum = cityProjects.reduce((sum, project) => sum + project.LotteryApparmentsNum, 0);
          const maxSubscribers = Math.max(...cityProjects.map(project => project.TotalSubscribers));
          const cityChances = maxSubscribers > 0 ? (totalLotteryApparmentsNum / maxSubscribers) * 100 : 0;
          const formattedCityChances = cityChances.toFixed(3) + '%';
  
          // If this city's projects have IsReligious === true, increment the green row counter and add the city to the set
          if (cityProjects.some(project => project.IsReligious === true)) {
            if (!uniqueReligiousCities.has(city)) {
              uniqueReligiousCities.add(city);
              greenRowCounter++;
            }
          }
  
          // Create the summary row
          const summaryRow = document.createElement('tr');
          summaryRow.innerHTML = `
            <td colspan="1"></td>
            <td>${city} סה״כ</td>
            <td colspan="1"></td>
            <td>${totalLotteryApparmentsNum}</td>
            <td>${maxSubscribers}</td>
            <td colspan="2"></td>
            <td>${formattedCityChances}</td>
            <td></td>
          `;
  
          // Store the row and its chances for later sorting
          citySummaryRows.push({ row: summaryRow, chances: cityChances });
  
          // Append the summary row to the table body
          tableBody.appendChild(summaryRow);
        });
  
        // Sort the summary rows by chances in descending order and highlight the top N rows based on the counter
        citySummaryRows.sort((a, b) => b.chances - a.chances);
        citySummaryRows.slice(0, greenRowCounter).forEach(item => {
          item.row.style.backgroundColor = 'lightgreen';
        });
      })
      .catch(error => console.error('Error fetching data:', error));
  });
  