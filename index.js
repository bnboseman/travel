const fs = require('fs');
const path = require('path');
const timeInStates = new Object();
timeInStates.NY = 0;
timeInStates.PA = 0;
timeInStates.Moms = 0;
timeInStates.Easton = 0;
var totalDistance = 0;

function determineLocationByDate(data) {
  const midnightLocations = {};

  for (const item of data.timelineObjects) {
    if (item.placeVisit) {
      const startTimestamp = new Date(item.placeVisit.duration.startTimestamp);

      const dateKey = startTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        // Store the location for that day
        if (item.placeVisit.location) {
          if (!midnightLocations[dateKey]) {
            midnightLocations[dateKey] = [];
          }
          midnightLocations[dateKey].push(item.placeVisit.location.address);
        }
    }
  }

  return midnightLocations;
}
// Function to determine sleep locations
function determineSleepLocations(data) {
  const sleepLocations = [];


  // Sort data by timestamp
  data.timelineObjects.sort((a, b) => {
    try {
      return new Date(a.activitySegment.duration.startTimestamp) - new Date(b.activitySegment.duration.startTimestamp);
    } catch {
      return 1;
    }
  });

  for (const item of data.timelineObjects) {
    if (item.activitySegment && !isNaN(item.activitySegment.distance) && new Date(item.activitySegment.duration.startTimestamp) > new Date("2021-09-17 00:00:00")) {
      totalDistance += parseFloat(item.activitySegment.distance);
    }
    if (item.placeVisit && new Date(item.placeVisit.duration.startTimestamp) > new Date("2021-09-17 00:00:00")) {
      var time = Math.abs(new Date(item.placeVisit.duration.endTimestamp) - new Date(item.placeVisit.duration.startTimestamp)) / 36e5;
      sleepLocations.push({
        address: item.placeVisit.location.address,
        duration: item.placeVisit.duration,
        time: Math.abs(new Date(item.placeVisit.duration.endTimestamp) - new Date(item.placeVisit.duration.startTimestamp)) / 36e5
      });
      if (item.placeVisit.location.address) {
        if (item.placeVisit.location.address.includes(', NY')) {
          timeInStates.NY += time;
        } else if (item.placeVisit.location.address.includes(', PA')) {
          timeInStates.PA += time;
        } else if (item.placeVisit.location.address.includes(', NJ')) {
          timeInStates.NY += time;
        }

        if (item.placeVisit.location.address.includes('156th') || item.placeVisit.location.address.includes('Frederick') || item.placeVisit.location.address.includes('Herkimer')) {
          timeInStates.Moms += time;
        } else if (item.placeVisit.location.address.includes('Seitz')) {
          timeInStates.Easton += time;
        }

      }
    }
  }
  return sleepLocations;
}

// Function to read data from a JSON file
function readDataFromFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return data;
}

// Function to loop through files for a given year
function processYear(year) {
  const sleepLocations = [];

  for (let month = 1; month <= 12; month++) {
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const filePath = path.join(year.toString(), `${year}_${monthName}.json`);

    if (fs.existsSync(filePath)) {
      const data = readDataFromFile(filePath);
      const locations = determineSleepLocations(data);
      sleepLocations.push(...locations);
    }
  }

  return sleepLocations;
}

function processMidnightYear(year) {
  const midnightLocationsForYear = {
    JANUARY:[],
    FEBRUARY: [],
    MARCH: [],
    APRIL: [],
    MAY: [],
    JUNE: [],
    JULY: [],
    AUGUST:[],
    SEPTEMBER: [],
    OCTOBER: [],
    NOVEMBER: [],
    DECEMBER: [],
  }

  const startDate = new Date(year, 0, 1, 0, 0, 0); // September is 8 in JavaScript's Date
  const endDate = new Date(year, 11, 31, 11, 59, 59); // End on September 16 of the next year

  const currentDate = new Date(startDate);

  const filePaths = {};
  for (let month = 1; month <= 12; month++) {
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const filePath = path.join(year.toString(), `${year}_${monthName}.json`);
    filePaths[monthName] = filePath;
  }


  var loadedMonth = "";
  var filePath = null;

  for (let key in filePaths) {
    filePath = filePaths[key];
    if (fs.existsSync(filePath)) {
      const data = readDataFromFile(filePath);
      const locations = determineLocationByDate(data);

      // Store locations for the current date
      try {
        midnightLocationsForYear[key].push(locations);
      } catch {
      }
    }
  }

  return midnightLocationsForYear;
}

// Loop through years from 2021 to 2023
const yearsToProcess = [2021, 2022, 2023];
const allSleepLocations = [];

for (const year of yearsToProcess) {
  const sleepLocationsForYear = processYear(year);
  allSleepLocations.push(...sleepLocationsForYear);
}

//console.log('Sleep Locations:');
//console.log(allSleepLocations);
const outputPath = 'allSleepLocations.json';

// Use JSON.stringify to convert the array to a JSON string
const allSleepLocationsJSON = JSON.stringify(allSleepLocations, null, 2);

// Write the JSON string to the output file
fs.writeFileSync(outputPath, allSleepLocationsJSON, 'utf-8');
const midnightLocationsForYears = {};

for (const year of [2021,2022, 2023]) {
  const midnightLocationsForYear = processMidnightYear(year);
  midnightLocationsForYears[year] = midnightLocationsForYear;
}


console.log(timeInStates);
console.log("Total meters traveled: " + totalDistance);
console.log("Total miles traveled: " + totalDistance*0.000621371);
console.log(midnightLocationsForYears);
fs.writeFileSync("2023.json", JSON.stringify(midnightLocationsForYears[2023],null, 2), 'utf-8');

fs.writeFileSync("2022.json", JSON.stringify(midnightLocationsForYears[2022],null, 2), 'utf-8');

fs.writeFileSync("2021.json", JSON.stringify(midnightLocationsForYears[2021],null, 2), 'utf-8');


