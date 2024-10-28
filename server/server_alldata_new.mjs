import express from 'express';
import fetch from 'node-fetch';
import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname and __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const RESPONSES_DIR = path.join(__dirname, 'responses');
const CACHE_FILE = path.join(RESPONSES_DIR, 'cachedResponse.json');

// Ensure the responses directory exists
fs.ensureDirSync(RESPONSES_DIR);

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// Function to append data to JSON file
async function appendToJsonFile(filePath, newData) {
  let data = [];

  try {
    // Check if the file exists
    if (await fs.pathExists(filePath)) {
      // Read and parse existing data from the file
      data = await fs.readJson(filePath);
    }
  } catch (error) {
    console.error('Error reading JSON file:', error);
  }

  // Append new data to the existing data
  data.push(...newData);

  try {
    // Write the updated data back to the file
    await fs.writeJson(filePath, data);
  } catch (error) {
    console.error('Error writing to JSON file:', error);
  }
}

// Function to fetch all data and write to JSON file
async function fetchAndSaveAllData() {
  const allData = [];
  // const baseUrl = 'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber';
  const baseUrl = 'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D4%26Entitlement%3D1%26PageNumber%3D';
  let pageNumber = 1;

  while (true) {
    const url = `${baseUrl}${pageNumber}%26PageSize%3D50%26IsInit%3Dtrue%26`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch error');
      const data = await response.json();

      if (data && data.ProjectItems.length > 0) {
        allData.push(data); // Append fetched data to allData array
        await appendToJsonFile(CACHE_FILE, allData);
      } else {
        break; // Stop if no data is returned for the current page
      }
    } catch (error) {
      console.error(`Error fetching data for page ${pageNumber}:`, error);
      break; // Stop fetching on the first exception
    } finally {
      pageNumber++;
    }
  }

  // try {
  //   // Write the collected data to the JSON file
  //   await fs.writeJson(CACHE_FILE, allData);
  //   console.log(`Data fetched and saved at ${new Date().toISOString()}`);
  // } catch (error) {
  //   console.error('Error saving data to JSON file:', error);
  // }
  console.log('Data fetching complete.')

  return allData;
}

// Schedule fetchData to run every hour
cron.schedule('0 * * * *', fetchAndSaveAllData);

// Endpoint to serve the cached data to the frontend
app.get('/data', async (req, res) => {
  try {
    // Check if cache file exists and serve it
    if (await fs.pathExists(CACHE_FILE)) {
      const cachedData = await fs.readJson(CACHE_FILE);
      return res.json(cachedData);
    }

    // If no cache file exists, fetch data immediately
    await fetchData();
    const newData = await fs.readJson(CACHE_FILE);
    res.json(newData);
  } catch (error) {
    console.error('Error reading cache:', error);
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
});

// Initial data fetch when the server starts
fetchAndSaveAllData();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
