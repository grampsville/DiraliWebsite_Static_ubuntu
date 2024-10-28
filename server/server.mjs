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

// URLs to fetch data from
const apiUrls = [
  'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D4%26Entitlement%3D1%26PageNumber%3D1%26PageSize%3D50%26IsInit%3Dtrue%26',
  'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber%3D2%26PageSize%3D50%26IsInit%3Dtrue%26',
  'https://www.dira.moch.gov.il/api/Invoker?method=Projects&param=%3FfirstApplicantIdentityNumber%3D%26secondApplicantIdentityNumber%3D%26ProjectStatus%3D1%26Entitlement%3D1%26PageNumber%3D3%26PageSize%3D50%26IsInit%3Dtrue%26'
];

// Fetch data from the APIs and save to the cache file
async function fetchData() {
  try {
    const responses = await Promise.all(apiUrls.map(url => fetch(url)));
    const data = await Promise.all(responses.map(res => res.json()));

    // Save data to cache file
    await fs.writeJson(CACHE_FILE, data);
    console.log(`Data fetched and saved at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Schedule fetchData to run every hour
cron.schedule('0 * * * *', fetchData);

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
fetchData();

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
