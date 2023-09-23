const fs = require('fs');
const path = require('path');
const timeInStates = new Object();
timeInStates.NY = 0;
timeInStates.PA = 0;
timeInStates.NYSummer = 0;
timeInStates.PASummer = 0;
timeInStates.NYRestofYear = 0;
timeInStates.PARestofYear = 0;
timeInStates.NYRestofYearWeekday = 0;
timeInStates.PARestofYearWeekday = 0;
timeInStates.Moms = 0;
timeInStates.Easton = 0;

const daysInNYDuringWeek = [];
const daysInPA = [];
var totalDistance = 0;

function determineLocationAddresses(data) {
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
    } else if (item.activitySegment) {
      const startTime = new Date(item.activitySegment.duration.startTimestamp);
      const endTime = new Date(item.activitySegment.duration.endTimestamp);
      const dateKey = startTime.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!midnightLocations[dateKey]) {
        midnightLocations[dateKey] = [];
      }

      const duration = endTime - startTime;
      var message = "";
      if (item.activitySegment.activities[0].activityType == 'IN_PASSENGER_VEHICLE') {
        message += "Driving from ";
      } else {
        message += "Travelling from ";
      }

      message += startTime.toLocaleTimeString()
        + " to "
        + endTime.toLocaleTimeString()
        + " for ";

      if ((duration / 1000 / 60 / 60) < 1) {
        message += Math.round(duration / 1000 / 60) + " minutes";
      } else {
        message += (duration / 1000 / 60 / 60).toFixed(2) + " hours";
      }
      midnightLocations[dateKey].push(message);
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
        const endTimestamp = new Date(item.placeVisit.duration.endTimestamp);
        const isSummer =  (endTimestamp.getMonth() >= 5 && endTimestamp.getMonth() <= 7);
        const dayOfWeek = endTimestamp.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        const isWeekdayOrWeekend = dayOfWeek >= 1 && dayOfWeek <= 5;


        if (item.placeVisit.location.address.includes(', NY')) {
          timeInStates.NY += time;
          const formattedDate = endTimestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          if (!daysInNYDuringWeek.includes(formattedDate)) {
            daysInNYDuringWeek.push(formattedDate);
          }
          if (isSummer) {
            timeInStates.NYSummer += time;
          } else {
            timeInStates.NYRestofYear += time;
            if (isWeekdayOrWeekend) {
              timeInStates.NYRestofYearWeekday += time;
            }
          }
        } else if (item.placeVisit.location.address.includes(', PA')) {
          timeInStates.PA += time;

          const formattedDate = endTimestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          if (!daysInPA.includes(formattedDate)) {
            daysInPA.push(formattedDate);
          }
          if (isSummer) {
            timeInStates.PASummer += time;
          } else {
            timeInStates.PARestofYear += time;
            if (isWeekdayOrWeekend) {
              timeInStates.PARestofYearWeekday += time;
            }
          }
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

  const filePaths = {};
  for (let month = 1; month <= 12; month++) {
    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const filePath = path.join(year.toString(), `${year}_${monthName}.json`);
    filePaths[monthName] = filePath;
  }

  for (let key in filePaths) {
    if (fs.existsSync(filePaths[key])) {
      const data = readDataFromFile(filePaths[key]);
      const locations = determineLocationAddresses(data);

      // Store locations for the current date
      midnightLocationsForYear[key].push(locations);
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
console.log(daysInNYDuringWeek);
fs.writeFileSync("daysInNY.json", JSON.stringify(daysInNYDuringWeek,null, 2), 'utf-8');

fs.writeFileSync("daysInPA.json", JSON.stringify(daysInPA,null, 2), 'utf-8');
fs.writeFileSync("2023.json", JSON.stringify(midnightLocationsForYears[2023],null, 2), 'utf-8');

fs.writeFileSync("2022.json", JSON.stringify(midnightLocationsForYears[2022],null, 2), 'utf-8');

fs.writeFileSync("2021.json", JSON.stringify(midnightLocationsForYears[2021],null, 2), 'utf-8');


