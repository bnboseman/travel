const fs = require('fs');
const path = require('path');
const timeInStates = new Object();
timeInStates.NY = 0;
timeInStates.PA = 0;
timeInStates.Moms = 0;
timeInStates.Easton = 0;
var totalDistance = 0;

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

console.log(timeInStates);
console.log("Total meters traveled: " + totalDistance);
console.log("Total miles traveled: " + totalDistance*0.000621371);

