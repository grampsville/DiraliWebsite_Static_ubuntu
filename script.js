document.addEventListener('DOMContentLoaded', function () {
  const tableBody = document.querySelector('#lottery-table tbody');
  const table = document.querySelector('#lottery-table');
  const messageDiv = document.getElementById('message');

  // Backend URL for the cached data
  const dataUrl = '/data';

  // Fetch cached data from backend
  fetch(dataUrl)
      .then(response => response.json())
      .then(dataArray => {
          const openLotteriesCount = dataArray[0].OpenLotteriesCount;

          if (openLotteriesCount === 0) {
              table.style.display = 'none';
              messageDiv.innerHTML = `
                  אין הגרלות פעילות כרגע, לחץ <a href="#" id="alert-link">כאן</a> להרשם על מנת לקבל התרעה כשההגרלה תתחדש
              `;
              document.getElementById('alert-link').addEventListener('click', function () {
                  alert('Registration for lottery alerts coming soon!');
              });
              return;
          }

          const projects = [...dataArray[0].ProjectItems, ...dataArray[1].ProjectItems];
          const firstSpecialLotteryDescription = projects[0]?.SpecialLotteryDescription;

          const cityGroups = projects.reduce((acc, project) => {
              if (project.SpecialLotteryDescription === null || project.SpecialLotteryDescription !== firstSpecialLotteryDescription) {
                  return acc;
              }
              if (!acc[project.CityDescription]) {
                  acc[project.CityDescription] = [];
              }
              acc[project.CityDescription].push(project);
              return acc;
          }, {});

          const citySummaryRows = [];

          Object.keys(cityGroups).forEach(city => {
              const cityProjects = cityGroups[city];
              cityProjects.forEach(project => {
                  const row = document.createElement('tr');
                  const chances = project.TotalSubscribers > 0 
                      ? (project.LotteryApparmentsNum / project.TotalSubscribers) * 100
                      : 0;
                  const formattedChances = chances.toFixed(3) + '%';
                  const notes = project.IsReligious === true ? 'צביון חרדי' : '';
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
                  tableBody.appendChild(row);
              });

              const totalLotteryApparmentsNum = cityProjects.reduce((sum, project) => sum + project.LotteryApparmentsNum, 0);
              const maxSubscribers = Math.max(...cityProjects.map(project => project.TotalSubscribers));
              const cityChances = maxSubscribers > 0 ? (totalLotteryApparmentsNum / maxSubscribers) * 100 : 0;
              const formattedCityChances = cityChances.toFixed(3) + '%';

              const isReligiousCity = cityProjects.some(project => project.IsReligious === true);

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

              citySummaryRows.push({ row: summaryRow, chances: cityChances, isReligious: isReligiousCity });
              tableBody.appendChild(summaryRow);
          });

          // Sort city summary rows by winning chances (descending)
          citySummaryRows.sort((a, b) => b.chances - a.chances);

          // Filter the top 3 non-religious and top 3 religious rows
          let nonReligiousHighlighted = 0;
          let religiousHighlighted = 0;

          citySummaryRows.forEach(item => {
              const { row, chances, isReligious } = item;
              if (isReligious && religiousHighlighted < 3) {
                  row.style.backgroundColor = 'lightblue';
                  religiousHighlighted++;
              } else if (!isReligious && nonReligiousHighlighted < 3) {
                  row.style.backgroundColor = 'lightgreen';
                  nonReligiousHighlighted++;
              } else {
                  row.style.backgroundColor = 'lightgray';
              }
          });
      })
      .catch(error => console.error('Error fetching data:', error));
});
