let trafiklabAPI = "4c3f0307-e59c-46cf-aecd-f4242cfb2e97";
const mapAPIToken = 'pk.eyJ1Ijoiam9oYW5raXZpIiwiYSI6ImNrcnl6M25xMDA4aWUyd3BqY3EzYnA1NTEifQ.ve5rEn8ZDwUGKvphMkEdpw';

let nearbyBtnElem = document.getElementById("getNearby");
let stopsList = document.getElementById("stopsList");
let departuresList = document.getElementById("departuresList");
let routeList = document.getElementById("routeList");
let recentStopsList = document.getElementById("recentStops");

let dateInput = document.getElementById("date");
let timeInput = document.getElementById("time");
let timeSelect = document.getElementById("timeType");

let cameraBtn = document.getElementById("cameraBtn");
let picBtn = document.getElementById("picBtn");
let camera = document.getElementById("camera");
let canvas = document.getElementById("canvas");
let gallery = document.getElementById("gallery");
let cancelBtn = document.getElementById("cancelBtn");
let ctx = canvas.getContext("2d");

let images = JSON.parse(localStorage.getItem("images")) || [];
populateGallery();

let clearGallery = document.getElementById("clearGallery")
let clearProfile = document.getElementById("clearProfile");

let menu = document.getElementById("menu");

let directionInput = document.getElementById("direction");
let filterBtn = document.getElementById("filterTimeTable");
let sortBtn = document.getElementById("sort");

let routeBtnElem = document.getElementById("createRoute");

let removeSavedStops = document.getElementById("removeSaved");

let nearbyDiv = document.getElementById("nearbyDiv");
let timeTableDiv = document.getElementById("timeTableDiv");
let routeDiv = document.getElementById("routeDiv");

let dataList = document.getElementById("stopsFromJSON");

let clickedStop = "";

let savedStopsFromStorage = JSON.parse(localStorage.getItem("savedStops"));
if(savedStopsFromStorage !== null) {
  showSavedStops();
}

var departuresArray = [];

let loader = `<div class="boxLoading"></div>`;

nearbyBtnElem.addEventListener("click", function() {
  getNearby();
});

routeBtnElem.addEventListener("click", function() {
  searchRoute();
});

filterBtn.addEventListener("click", function() {
  filterTimeTable();
});

sortBtn.addEventListener("click", function() {
  sortByTrack();
});

removeSavedStops.addEventListener("click", function() {
  localStorage.removeItem("savedStops");
  savedStopsFromStorage = [];
  showSavedStops();
});

let stream;
cameraBtn.addEventListener("click", async function() {
  if('mediaDevices' in navigator) {
    stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
    camera.srcObject = stream;
    camera.style.display = "block";
    camera.play();
  }
});

cancelBtn.addEventListener("click", function() {
  stream.getTracks().forEach(function(track) {
    track.stop();
  });
  camera.style.display = "none";
});

picBtn.addEventListener("click", function() {
  if(stream) {
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);
    //canvas.style.display = "block";
    const imageData = canvas.toDataURL("image/png");
    images.push({
      id: Date.now(),
      imageData: imageData
    });
    localStorage.setItem("images", JSON.stringify(images));
    populateGallery();
  } else {
    alert("Starta kameran först!")
  }
});

menu.addEventListener("click", function() {
  document.getElementById("menuContent").classList.toggle("hidden");
});

clearGallery.addEventListener("click", () => {
  localStorage.removeItem("images");
  images = [];
  populateGallery();
})

clearProfile.addEventListener("click", function() {
  menu.style.backgroundImage = "";
  document.getElementById("menu").innerHTML = "🐶";
  localStorage.removeItem("profile");
});

nearbyDiv.addEventListener("click", collapse);
timeTableDiv.addEventListener("click", collapse);
routeDiv.addEventListener("click", collapse);

if(!navigator.onLine) {
  alert("Du är inte online, avgångar och resor är därför inte längre aktiva!")
}

function populateGallery() {
  gallery.innerHTML = "";
  gallery.innerHTML += "<h2>Galleri</h2> <h4>Klicka på en bild för att välja den som profilbild :)</h4>";
  images.forEach(image => {
    let img = document.createElement("img")
    img.classList.add("galleryImg")
    img.setAttribute("src", image.imageData);
    gallery.appendChild(img)
    img.addEventListener("click", function() {
      setProfilePicture(image);
    });
  })
}

function setProfilePicture(img) {
  menu.style.backgroundImage = `url(${img.imageData})`;
  menu.innerHTML = "";
  localStorage.setItem("profilePicture", JSON.stringify(img));
}

function collapse(e) {
  if(e.target.id === "nearbyDiv" || e.target.id === "timeTableDiv" || e.target.id === "routeDiv") {
    e.target.classList.toggle("collapsed");
  }
}

//get nearby stops and display each stop
function getNearby() {
  if(navigator.geolocation) {
    stopsList.innerHTML = loader;
    navigator.geolocation.getCurrentPosition((position) => {
      let lat = position.coords.latitude.toFixed(3);
      let lng = position.coords.longitude.toFixed(3);
      let positionObj = {lat: lat, lng: lng}
      localStorage.setItem("lastPosition", JSON.stringify(positionObj) )
      getNearbyStops(lat, lng);
    }, (err) => {
      console.log(err)
      let lastPosition = localStorage.getItem("lastPosition");
      if(lastPosition !== null) {
        lastPosition = JSON.parse(lastPosition);
        getNearbyStops(lastPosition.lat, lastPosition.lng);
      }
    });
  }
}

async function getNearbyStops(lat, lng) {
  let link = `https://api.resrobot.se/v2.1/location.nearbystops?originCoordLat=${lat}&originCoordLong=${lng}&format=json&accessId=${trafiklabAPI}`;

  mapboxgl.accessToken = mapAPIToken;

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [lng, lat],
    zoom: 13
  });

  new mapboxgl
    .Marker({color: "red", scale: 0.7})
    .setLngLat([lng, lat])
    .addTo(map)

  let data = await fetch(link);
  let json = await data.json();
  let stops = json.stopLocationOrCoordLocation;
  stopsList.innerHTML = "";
  stops.forEach(stop => {
    showStop(stop.StopLocation);

    let divElement = document.createElement("div");
    let buttonElem = document.createElement("button");
    buttonElem.innerHTML = `${stop.StopLocation.name}`;
    buttonElem.addEventListener("click", function() {
      clickedStop = stop.StopLocation;
      getTimeTable(stop.StopLocation);
      if(document.getElementsByClassName("activeStop").length > 0) {
        document.getElementsByClassName("activeStop")[0].classList.remove("activeStop");
      }
      let timetableElems = document.getElementsByClassName("stopTimeTable");
      for (let stopHTML of timetableElems) {
        if(stopHTML.innerHTML.includes(stop.StopLocation.name)) {
          stopHTML.classList.add("activeStop");
        }
      };
    });
    divElement.appendChild(buttonElem);

    var popup = new mapboxgl.Popup()
      .addTo(map)
      .setDOMContent(divElement);
  
    new mapboxgl
      .Marker()
      .setLngLat([stop.StopLocation.lon, stop.StopLocation.lat])
      .addTo(map)
      .setPopup(popup)
      .togglePopup();
  })
}

function showStop(stop) {
  let li = document.createElement("li");
  li.classList.add("stopTimeTable");
  //if stop.name contains "(Göteborg kn)" then remove it
  if(stop.name.includes("(Göteborg kn)")) {
    stop.name = stop.name.replace("(Göteborg kn)", "");
  }
  li.innerHTML = `<div>${stop.name}</div <div>(${stop.dist} meter bort)</div>`;
  li.addEventListener("click", function() {
    clickedStop = stop;
    getTimeTable(stop)
    if(document.getElementsByClassName("activeStop").length > 0) {
      document.getElementsByClassName("activeStop")[0].classList.remove("activeStop");
    }
    li.classList.add("activeStop");
  });
  stopsList.appendChild(li);
}

//get time table for a stop, then display each departure
async function getTimeTable(stop) {
  timeTableDiv.classList.remove("hidden")
  departuresList.innerHTML = loader;
  document.getElementById("stop1").value = stop.name;
  let link = `https://api.resrobot.se/v2.1/departureBoard?id=${stop.extId}&format=json&accessId=${trafiklabAPI}`;
  let data = await fetch(link);
  let json = await data.json();
  let departures = json.Departure;
  if(departures === undefined) {
    departuresList.innerHTML = "Inga avgångar hittades från " + stop.name + " :(";
    return;
  }
  departuresArray = departures;
  departuresList.innerHTML = "";
  let notShown =[];
  departures.forEach(departure => {
    let text = (departure.name + departure.direction)
    if(notShown.includes(text)) {
      return;
    }
    showDeparture(departure);
    notShown.push(text);
  });
}

async function filterTimeTable() {
  departuresList.innerHTML = loader;
  let stop = await getStopInfo(directionInput.value);
  stop = await stop.stopLocationOrCoordLocation[0].StopLocation;
  let link = `https://api.resrobot.se/v2.1/departureBoard?id=${clickedStop.extId}&direction=${stop.extId}&format=json&accessId=${trafiklabAPI}`;
  let data = await fetch(link);
  let json = await data.json();
  let departures = json.Departure;
  if(departures === undefined) {
    departuresList.innerHTML = "Inga avgångar hittades från denna hållplats :(";
    return;
  }
  departuresList.innerHTML = "";
  let notShown =[];
  departures.forEach(departure => {
    let text = (departure.name + departure.direction)
    if(notShown.includes(text)) {
      return;
    }
    showDeparture(departure);
    notShown.push(text);
  });
}

function sortByTrack() {
  // depatruesArray is sorted by time
  // departure.rtTrack is the track letter (A - Z)
  // if departure.rtTrack is undefined, it is sorted to the end of the list
  departuresArray.sort(function(a, b) {
    if(a.rtTrack === undefined) {
      return 1;
    }
    if(b.rtTrack === undefined) {
      return -1;
    }
    return a.rtTrack.localeCompare(b.rtTrack);  
  });

  departuresList.innerHTML = "";
  let notShown =[];
  departuresArray.forEach(departure => {
    let text = (departure.name + departure.direction)
    if(notShown.includes(text)) {
      return;
    }
    showDeparture(departure);
    notShown.push(text);
  });
}

function showDeparture(departure) {
  let li = document.createElement("li");
  li.classList.add("departure");
  //if departure.direction contains "(Göteborg kn)" then remove it
  if(departure.direction.includes("(Göteborg kn)")) {
    departure.direction = departure.direction.replace("(Göteborg kn)", "");
  }
  let time = departure.time;
  time = time.substring(0, time.length - 3);
  li.innerHTML = `<div>${departure.Product[0].operator === "Västtrafik" ? "" : departure.Product[0].operator + ": "} ${departure.Product[0].displayNumber} mot ${departure.direction}</div> <div style="white-space: nowrap;">⏰${time} ${departure.rtTrack ? "(Läge " + departure.rtTrack + ")" : ""}</div>`;
  departuresList.appendChild(li);
  departuresList.scrollIntoView({behavior: "smooth"});
}

// search route, get id of both stops, then search route between them
// lastly, display result
async function searchRoute() {
  if(document.getElementById("stop1").value === "" || document.getElementById("stop2").value === "" || document.getElementById("stop1").value === document.getElementById("stop2").value) {
    alert("Du måste fylla i 2 olika hållplatser");
    return;
  }
  routeList.innerHTML = loader;
  let stop1 = await getStopInfo(document.getElementById("stop1").value);
  let stop2 = await getStopInfo(document.getElementById("stop2").value);
  if(stop1 === undefined || stop2 === undefined) { console.error("ERROR finding stops"); return; }
  saveRouteStops(stop1.stopLocationOrCoordLocation[0].StopLocation, stop2.stopLocationOrCoordLocation[0].StopLocation);
  let route = createRoute(await stop1.stopLocationOrCoordLocation[0].StopLocation.extId, await stop2.stopLocationOrCoordLocation[0].StopLocation.extId);
  displayRoute(await route);
}

async function getStopInfo(stopName) {
  let link =`https://api.resrobot.se/v2.1/location.name?input=${stopName}&format=json&accessId=${trafiklabAPI}`;
  let data = await fetch(link);
  let json = await data.json();
  return await json;
}

async function createRoute(stop1, stop2) {
  let dateText = ""; // we dont want to send a empty date= parameter, so we add nothing to the fetch
  if(dateInput.value !== "") {
    dateText = `&date=${dateInput.value}`; // if date is not empty, add it to the fetch with requested parameter
  }

  let timeText = ""; // same as above
  if(timeInput.value !== "") {
    timeText = `&time=${timeInput.value}`;
  }

  let timeTypeText = `&searchForArrival=0`; // we can add this everytime, unlike above so this is not ""
  if(timeSelect.value == "1") {
    timeTypeText = `&searchForArrival=1`;
  }

  let link = `https://api.resrobot.se/v2.1/trip?originId=${stop1}&destId=${stop2}&passlist=true${dateText}${timeText}${timeTypeText}&format=json&accessId=${trafiklabAPI}`;
  let data = await fetch(link);
  let json = await data.json();
  return await json;
}

function displayRoute(route) {
  routeList.innerHTML = "";
  route.Trip.forEach(trip => {
    showTrip(trip);
  });
  routeList.scrollIntoView({behavior: "smooth"});
}

function saveRouteStops(stop1, stop2) {
  // save stops to local storage
  if(localStorage.getItem("savedStops") === null) {
    localStorage.setItem("savedStops", JSON.stringify([]));
    savedStopsFromStorage = [];
  }
  let alreadySaved = true;
  savedStopsFromStorage.forEach(stop => {
    if(stop.stop1.extId === stop1.extId && stop.stop2.extId === stop2.extId) {
      alreadySaved = false;
      return;
    }
  });

  if(alreadySaved) {
    let stopsObj = {
      stop1: stop1,
      stop2: stop2,
      quantity: 1
    }
    savedStopsFromStorage.unshift(stopsObj);
    localStorage.setItem("savedStops", JSON.stringify(savedStopsFromStorage));
    showSavedStops();
  } else {
    savedStopsFromStorage.forEach(stop => {
      if(stop.stop1.extId === stop1.extId && stop.stop2.extId === stop2.extId) {
        stop.quantity++;
      }
      localStorage.setItem("savedStops", JSON.stringify(savedStopsFromStorage));
    });
  }
}

function showSavedStops() {
  recentStopsList.innerHTML = "";
  let sorted = savedStopsFromStorage.sort(function(a, b) {
    return b.quantity - a.quantity;
  });
  sorted.forEach((stopCombo, index) => {
    if(index >= 7) { return; }
    //sort stopCombo by stopCombo.quantity
    let li = document.createElement("li");
    li.classList.add("savedStop");
    li.innerHTML = `${stopCombo.stop1.name} - ${stopCombo.stop2.name}`;
    li.addEventListener("click", async () => {
      document.getElementById("stop1").value = stopCombo.stop1.name;
      document.getElementById("stop2").value = stopCombo.stop2.name;

      routeList.innerHTML = loader;
      saveRouteStops(stopCombo.stop1, stopCombo.stop2);
      let route = await createRoute(stopCombo.stop1.extId, stopCombo.stop2.extId);
      displayRoute(await route);
    });
    recentStopsList.appendChild(li);
  });
}

function showTrip(trip) {
  let li = document.createElement("li");
  li.classList.add("trip");
  li.innerHTML = `<div class="pointyFinger">☞</div>`;
  let originTime = trip.Origin.time;
  originTime = originTime.substring(0, originTime.length - 3);
  let destinationTime = trip.Destination.time;
  destinationTime = destinationTime.substring(0, destinationTime.length - 3);
  li.innerHTML += `<div class="tripTime">${originTime} - ${destinationTime}</div>`;
  li.addEventListener("click", function() {
    li.classList.toggle("opened");
  });
  trip.LegList.Leg.forEach(leg => {
    let stops = document.createElement("ul");
    stops.classList.add("stopsList");
    let duration = leg.duration;
    //remove "PT" from duration
    duration = duration.replace("PT", "");
    let originTime = leg.Origin.time;
    originTime = originTime.substring(0, originTime.length - 3);
    let destinationTime = leg.Destination.time;
    destinationTime = destinationTime.substring(0, destinationTime.length - 3);
    if(leg.name === "Promenad") {
      li.innerHTML += `<h4>Promenad to ${leg.Destination.name} (${duration})</h4>`;
    } else {
      li.innerHTML += `<h4>${leg.Product[0].displayNumber} mot ${leg.direction}, ${originTime} - ${destinationTime} (${duration})</h4>`;
    }
    if(leg.Stops === undefined) { return; }
    leg.Stops.Stop.forEach((stop, index) => {
      let stopLi = document.createElement("li");
      stopLi.classList.add("stop");
      if(index === 0) {
        let depTime = stop.depTime;
        depTime = depTime.substring(0, depTime.length - 3);
        stopLi.innerHTML = `${stop.name}, ${depTime}`;
      } else {
        let arrTime = stop.arrTime;
        arrTime = arrTime.substring(0, arrTime.length - 3);
        stopLi.innerHTML = `${stop.name}, (${arrTime})`;
      }
      stops.appendChild(stopLi);
    });
    li.appendChild(stops);
  })
  routeList.appendChild(li);
}

window.addEventListener('load', async () => {

  let profileImg = await JSON.parse(localStorage.getItem("profilePicture"))
  if(profileImg !== null) {
    setProfilePicture(profileImg);
  }

  let data = await fetch("onlyStops.json");
  let fetchJson = await data.json();

  //sort json so stops with "göteborg" are at the beginning
  fetchJson.sort(function(a, b) {
    if(a.includes("Göteborg") && !b.includes("Göteborg")) {
      return -1;
    }
    if(!a.includes("Göteborg") && b.includes("Göteborg")) {
      return 1;
    }
    return 0;
  });
  fetchJson.forEach(stop => {
    let option = document.createElement("option");
    option.value = stop;
    option.innerHTML = stop;
    dataList.appendChild(option);
  });

  if('serviceWorker' in navigator){
    try {
      await navigator.serviceWorker.register('service-worker.js');
    } catch(err) {
      console.error('Whooopsie!', err)
    }
  }
});