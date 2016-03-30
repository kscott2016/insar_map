// how to do it with leaflet
/*var map = L.map("map-container").setView([51.505, -0.09], 13);

L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'kjjj11223344.p8g6k9ha',
    accessToken: "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw"
}).addTo(map);*/

// my mapbox api key
mapboxgl.accessToken = "pk.eyJ1Ijoia2pqajExMjIzMzQ0IiwiYSI6ImNpbDJqYXZ6czNjdWd2eW0zMTA2aW1tNXUifQ.cPofQqq5jqm6l4zix7k6vw";

// the map
var map = new mapboxgl.Map({
    container: 'map-container', // container id
    style: 'style.json', //stylesheet location
    center: [-74.50, 40], // starting position
    zoom: 9 // starting zoom
});

map.addControl(new mapboxgl.Navigation());

// function to use AJAX to load json from this same website - I looked online and AJAX is basically just used
// to asynchronously load data using javascript from a server, in our case, our local website
function loadJSON(callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'test.json', true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

var geoJSONSource = null;
var geodata = null;
var geoDataMap = {};

// what to do after the map loads
map.once("load", function load() {
    // load in our sample json
    loadJSON(function(response) {
        // this function is called once the AJAX loads the geojson

        geodata = JSON.parse(response); // put response geojson string into a js object
        //tileIndex = geojsonvt(data);

        // example loop to show how we can change the geodata JSON object at runtime with code
        for (var i = 0; i < geodata.features.length; i++) {
            // set title
            geodata.features[i].properties.title = "\"" + i + "\"";
            geodata.features[i].properties["marker-color"] = "#09A5FF";
            if (i % 3 == 0) {
	            geodata.features[i].properties["marker-symbol"] = "greenMarker";
            } else if (i % 3 == 1) {
	            geodata.features[i].properties["marker-symbol"] = "redMarker";
            } else {
            	geodata.features[i].properties["marker-symbol"] = "yellowMarker";	
            }

            geoDataMap[geodata.features[i].properties.title] = geodata.features[i];
        }

        // a fast webgl (I think) geoJSON layer which will hopefully allow us to add millions of points
        // with little performance hit
        geoJSONSource = new mapboxgl.GeoJSONSource({
            data: geodata
        });

        // IGNORE add in our markers
        /*map.addSource("markers", {
            "type": "geojson",
            "data": geodata
        });*/

        map.addSource('markers', geoJSONSource);
        map.addLayer({
            "id": "markers",
            "interactive": true,
            "type": "symbol",
            "source": "markers",
            "layout": {
                "icon-image": "{marker-symbol}", // stuff in {} gets replaced by the corresponding value
                "icon-allow-overlap": true,
                "icon-size": 1 // size of the icon
            }
        });
    });
});

var popup = new mapboxgl.Popup();

// When a click event occurs near a marker icon, open a popup at the location of
// the feature, with description HTML from its properties.
map.on('click', function(e) {
    map.featuresAt(e.point, {
        radius: 7.5, // Half the marker size (15px).
        includeGeometry: true,
        layer: 'markers'
    }, function(err, features) {
        if (err || !features.length) {
            popup.remove();
            return;
        }

        var feature = features[0];
        var title = feature.properties.title;

        // the features array seems to have a copy of the actual features, and not the real original
        // features that were added. Thus, I use the title of the feature as a key to lookup the
        // pointer to the actual feature we added, so changes made to it can be seen on the map.
        // this is just a test, so whenever a marker is clicked, the marker symbol is changed to a
        // different one before showing it's information in a popup.
        var actualFeature = geoDataMap[title];

        actualFeature.properties["marker-symbol"] = "yellowMarker";
        actualFeature.properties["marker-color"] = "#ff8888";

        geoJSONSource.setData(geodata);

        // Populate the popup and set its coordinates
        // based on the feature found.
        /*popup.setLngLat(feature.geometry.coordinates)
            .setHTML("lat " + feature.geometry.coordinates[1] + ", long " + feature.geometry.coordinates[0])
            .addTo(map);*/
        popup.setLngLat(feature.geometry.coordinates)
            .setHTML("<div id='chartDiv'><canvas id='chart'></canvas></div>")
            .addTo(map);
        var pieData = [{
            value: 20,
            color: "#878BB6"
        }, {
            value: 40,
            color: "#4ACAB4"
        }, {
            value: 10,
            color: "#FF8153"
        }, {
            value: 30,
            color: "#FFEA88"
        }];

        var ctx = document.getElementById("chart").getContext("2d");
        var myNewChart = new Chart(ctx).Pie(pieData);
    });
});

// Use the same approach as above to indicate that the symbols are clickable
// by changing the cursor style to 'pointer'.
map.on('mousemove', function(e) {
    map.featuresAt(e.point, {
        radius: 7.5, // Half the marker size (15px).
        layer: 'markers'
    }, function(err, features) {
        map.getCanvas().style.cursor = (!err && features.length) ? 'pointer' : '';
    });
});

// handle zoom changed. we want to change the icon-size in the layer for varying zooms.
// if you notice, in tremaps, all the points are just one size, as if they were real, physical points.
// so, when you zoom out, the points appear to be smaller than when you are zoomed in. with the markers
// we are using, though, the marker icons are always the same size, so we can use this function to
// dynamically change the sizes depending on the current map zoom.
map.on('zoomend', function() {
    // here's where you decided what zoom levels the layer should and should
    // not be available for: use javascript comparisons like < and > if
    // you want something other than just one zoom level, like
    // (map.getZoom > 10)
    console.log(map.getZoom());
    if (map.getZoom() < 9) {
        // remove the old layer with large markers and add a new one with small markers
        map.removeLayer("markers");
        map.addLayer({
            "id": "markers",
            "interactive": true,
            "type": "symbol",
            "source": "markers",
            "layout": {
                "icon-image": "{marker-symbol}",
                "icon-allow-overlap": true,
                "icon-size": 0.14 // notice the new, smaller size at higher zoom levels
            }
        });
    } else {
        // if there is a layer with this name, remove it before adding
        if (map.getLayer("markers")) {
            map.removeLayer("markers");
        }

        map.addLayer({
            "id": "markers",
            "interactive": true,
            "type": "symbol",
            "source": "markers",
            "layout": {
                "icon-image": "{marker-symbol}",
                "icon-allow-overlap": true,
                "icon-size": 1 // notice the bigger size at smaller zoom levels.
            }
        });
    }
});

// TODO: the above function can be made much more granular with more else if's
