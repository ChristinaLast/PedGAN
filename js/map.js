mapboxgl.accessToken = "pk.eyJ1IjoiYWlycG9sbHBoaWxseSIsImEiOiJjbGF3dXRqcTIwamNuM3dwa3JuamdyNGxoIn0.vcsXDKW-TC66e4VpuX1pJA";
const map = new mapboxgl.Map({
    container: "map", // Container ID
    style: "mapbox://styles/airpollphilly/clgb3vqm4000v01pkcqhza1yr/draft", // Map style to use
    // center: [-75.1652, 39.9526], // center on philadelphia
    center: [-71.0589, 42.3601], // center on boston
    zoom: 12, // Starting zoom level
    projection: "globe",
});

// stylize the globe effect
map.on("style.load", () => {
    map.setFog({
        range: [1, 7],
        color: "#d6fffc",
        "horizon-blend": 0.03,
        "high-color": "#000000",
        "space-color": "#000000",
        "star-intensity": 0,
    });
});

// limit the search engine boundary extent to the center of philadelphia
const bostonBounds = [-71.196162, 42.289296, -70.951201, 42.376096];

// Initialize the geocoder aka the search engine
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken, // Set the access token
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
    placeholder: "Search Boston", //placeholer text for the search bar
    bbox: bostonBounds, //limit search results to Philadelphia bounds
});

// Add the geocoder to the map
map.addControl(geocoder);

JF.initialize({ apiKey: "e83551f0a2681795a8e8ae7d06535735" });

//ENTER YOUR JOTFORM API KEY HERE

JF.getFormSubmissions("223104390365146", function (response) {
    console.log(response);
    map.addSource("air-data", {
        type: "geojson",
        data: "https://raw.githubusercontent.com/AQ-AI/breathing-space/main/json/tripuuids.geojson",
    });

    map.addLayer({
        id: "air-data",
        type: "circle",
        source: "air-data",
        filled: true,
        stroke: false,
        layout: {
            // Make the layer visible by default.
            visibility: "visible",
        },
        paint: {
            "circle-radius": 3,
            "circle-color": "#291e9e",
            "circle-stroke-width": 0.1,
            "circle-stroke-color": "#000000",
        },

    });
    // Center the map on the coordinates of any clicked circle from the 'circle' layer.
    map.on("click", "air-data", (e) => {
        console.log("i get here", e.features[0].geometry.coordinates);
        console.log("tripuuid", e.features[0].properties.tripUuid);
        map.flyTo({
            center: e.features[0].geometry.coordinates,
        });
        const gif = ["json/gifs/trip_uuids/", e.features[0].properties.tripUuid, ".gif"];

        getImageGallery([gif.join('')], e.features[0].properties.Len_m);
    });
    function getImageGallery(images, text) {
        const imageGallery = document.createElement("div")
        imageGallery.className = "image-gallery"
        imageGallery.id = "image-gallery"

        const image = document.createElement("img")
        image.src = images[0]
        image.className = "image-gallery-image"
        imageGallery.appendChild(image)

        const exitButton = document.createElement("button");
        exitButton.className = "image-gallery-button";
        exitButton.id = "image-gallery-button";
        exitButton.innerHTML = "X";
        exitButton.addEventListener("click", () => {
            document.getElementById("image-gallery").remove();
        });
        imageGallery.appendChild(exitButton)

        const textDiv = document.createElement("div");
        textDiv.className = "image-gallery-text";
        textDiv.id = "image-gallery-text";
        textDiv.innerHTML = "<i>\"" + text + "\"</i>";
        imageGallery.appendChild(textDiv)

        // append the image gallery to the body
        document.body.appendChild(imageGallery);
    }
    function flyToClick(coords) {
        map.flyTo({
            center: [coords[0], coords[1]],
            zoom: 17,
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        });
    }
    // create “current location” function, which doesn’t trigger until called upon.
    function addUserLocation(latitude, longitude) {
        return map.addLayer(
            new MapboxLayer({
                id: "user-location",
                type: ScatterplotLayer,
                data: [{ longitude, latitude }],
                getPosition: (d) => [d.longitude, d.latitude],
                getSourceColor: [0, 255, 0],
                sizeScale: 15,
                getSize: 10,
                radiusUnits: "pixels",
                getRadius: 5,
                opacity: 0.7,
                stroked: false,
                filled: true,
                radiusScale: 3,
                getFillColor: [3, 202, 252],
                parameters: {
                    depthTest: false,
                },
            })
        );
    }
    // get current location
    const successCallback = (position) => {
        // add new point layer of current location to deck gl
        const { latitude, longitude } = position.coords;
        addUserLocation(latitude, longitude);
    };

    const errorCallback = (error) => {
        console.log(error);
    };

    // create async function to await for current location and then return the promise as lat long coordinates then resolve the promise
    function getCurrentLocation() {
        const currentLocation = navigator.geolocation.getCurrentPosition(
            successCallback,
            errorCallback
        );
        return currentLocation;
    }
    if (navigator.geolocation) {
        getCurrentLocation();
    }

    const locationButton = document.createElement("div");
    // create a button that will request the users location
    locationButton.addEventListener("click", () => {
        // when clicked, get the users location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;

                locationButton.textContent =
                    "Where am I? " +
                    position.coords.latitude.toFixed(3) +
                    ", " +
                    position.coords.longitude.toFixed(3);

                addUserLocation(latitude, longitude);
                flyToClick([longitude, latitude]);
            });
        }
    });
    document.body.appendChild(locationButton);
});
JF.getFormSubmissions("223104390365146", function (response) {
    console.log(response);
    // array to store all the submissions: we will use this to create the map
    const incidents = [];
    // for each response
    for (var i = 0; i < response.length; i++) {
        const incidentProps = {};
        // add all fields of response.answers to our object
        const keys = Object.keys(response[i].answers);
        keys.forEach((answer) => {
            const lookup = response[i].answers[answer].cfname ? "cfname" : "name";
            incidentProps[response[i].answers[answer][lookup]] =
                response[i].answers[answer].answer;
        });

        incidentProps["Location Coordinates"] = response[i].answers[22].answer.split(/\r?\n/)
            .map((x) => parseFloat(x.replace(/[^\d.-]/g, ""))).slice(0, 2);
        // convert location coordinates string to float array
        console.log(incidentProps)
        // add submission to submissions array
        incidents.push(incidentProps);
    }
    const { MapboxLayer, ScatterplotLayer } = deck;
    const firstLabelLayerId = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol").id;
    map.on("click", "air", (e) => {
        map.flyTo({
            center: e.features[0].geometry.coordinates,
        });
    });
    function getImageGallery(images, text) {

        const imageGallery = document.createElement("div")
        imageGallery.className = "image-gallery"
        imageGallery.id = "image-gallery"

        const image = document.createElement("img")
        image.src = images[0]
        image.className = "image-gallery-image"
        imageGallery.appendChild(image)

        const exitButton = document.createElement("button");
        exitButton.className = "image-gallery-button";
        exitButton.id = "image-gallery-button";
        exitButton.innerHTML = "X";
        exitButton.addEventListener("click", () => {
            document.getElementById("image-gallery").remove();
        });
        imageGallery.appendChild(exitButton)

        const textDiv = document.createElement("div");
        textDiv.className = "image-gallery-text";
        textDiv.id = "image-gallery-text";
        textDiv.innerHTML = "<i>\"" + text + "\"</i>";
        imageGallery.appendChild(textDiv)

        // append the image gallery to the body
        document.body.appendChild(imageGallery);
    }
    function flyToClick(coords) {
        map.flyTo({
            center: [coords[0], coords[1]],
            zoom: 17,
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        });
    }
    // create “current location” function, which doesn’t trigger until called upon.
    function addUserLocation(latitude, longitude) {
        return map.addLayer(
            new MapboxLayer({
                id: "user-location",
                type: ScatterplotLayer,
                data: [{ longitude, latitude }],
                getPosition: (d) => [d.longitude, d.latitude],
                getSourceColor: [0, 255, 0],
                sizeScale: 15,
                getSize: 10,
                radiusUnits: "pixels",
                getRadius: 5,
                opacity: 0.7,
                stroked: false,
                filled: true,
                radiusScale: 3,
                getFillColor: [3, 202, 252],
                parameters: {
                    depthTest: false,
                },
            })
        );
    }
    // get current location
    const successCallback = (position) => {
        // add new point layer of current location to deck gl
        const { latitude, longitude } = position.coords;
        addUserLocation(latitude, longitude);
    };

    const errorCallback = (error) => {
        console.log(error);
    };

    // create async function to await for current location and then return the promise as lat long coordinates then resolve the promise
    function getCurrentLocation() {
        const currentLocation = navigator.geolocation.getCurrentPosition(
            successCallback,
            errorCallback
        );
        return currentLocation;
    }
    if (navigator.geolocation) {
        getCurrentLocation();
    }

    const locationButton = document.createElement("div");
    // create a button that will request the users location
    locationButton.addEventListener("click", () => {
        // when clicked, get the users location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;

                locationButton.textContent =
                    "Where am I? " +
                    position.coords.latitude.toFixed(3) +
                    ", " +
                    position.coords.longitude.toFixed(3);

                addUserLocation(latitude, longitude);
                flyToClick([longitude, latitude]);
            });
        }
    });
    document.body.appendChild(locationButton);
});

function get_gifs() {
    console.log(response);
    // array to store all the submissions: we will use this to create the map
    const incidents = [];
    // for each response
    for (var i = 0; i < response.length; i++) {
        const incidentProps = {};
        // add all fields of response.answers to our object
        const keys = Object.keys(response[i].answers);
        keys.forEach((answer) => {
            const lookup = response[i].answers[answer].cfname ? "cfname" : "name";
            incidentProps[response[i].answers[answer][lookup]] =
                response[i].answers[answer].answer;
        });

        incidentProps["Location Coordinates"] = response[i].answers[22].answer.split(/\r?\n/)
            .map((x) => parseFloat(x.replace(/[^\d.-]/g, ""))).slice(0, 2);
        // convert location coordinates string to float array
        console.log(incidentProps)
        // add submission to submissions array
        incidents.push(incidentProps);
    }
    const { MapboxLayer, ScatterplotLayer } = deck;
    const firstLabelLayerId = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol").id;

    map.addLayer(
        new MapboxLayer({
            id: "deckgl-circle",
            type: ScatterplotLayer,
            data: incidents,
            getPosition: (d) => {
                return d["Location Coordinates"];
            },
            // Styles
            radiusUnits: "pixels",
            getRadius: 5,
            opacity: 0.7,
            stroked: true,
            filled: true,
            radiusScale: 3,
            getFillColor: [252, 186, 3],
            lineWidthMinPixels: 1,
            getLineColor: [0, 0, 0],
            pickable: true,
            autoHighlight: true,
            highlightColor: [255, 255, 255, 255],
            parameters: {
                depthTest: false,
            },
            // onClick: (info) => {
            //     //ADD NEW INPUT TO GETIMAGE GALLERY:
            //     getImageGallery(info.object.fileUpload, info.object.describeThe);
            //     flyToClick(info.object["Location Coordinates"]);
            // },
        }),
        firstLabelLayerId
    );
    map.addSource("air-data", {
        type: "geojson",
        data: "https://opendata.arcgis.com/datasets/1839b35258604422b0b520cbb668df0d_0.geojson",
    });

    map.addLayer({
        id: "air",
        type: "circle",
        source: "airpollphilly.7q3mnlp5",
        filled: true,
        stroke: false,
        layout: {
            // Make the layer visible by default.
            visibility: "visible",
        },
        paint: {
            "circle-radius": 3,
            "circle-color": "#291e9e",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#000000",
        },
        onClick: (info) => {
            //ADD NEW INPUT TO GETIMAGE GALLERY:
            const image = ["json/gifs/trip_uuids/", info.features[0].properties.tripUuid, ".gif"]
            console.log(image.join());
            getImageGallery(["https://picsum.photos/200/300"], info.features[0].properties.Len_m);
        },
    });
    // Center the map on the coordinates of any clicked circle from the 'circle' layer.
    map.on("click", "air", (e) => {
        console.log("i get here", e.features[0].geometry.coordinates);

        map.flyTo({
            center: e.features[0].geometry.coordinates,
        });
    });
    function getImageGallery(images, text) {

        const imageGallery = document.createElement("div")
        imageGallery.className = "image-gallery"
        imageGallery.id = "image-gallery"

        const image = document.createElement("img")
        image.src = images[0]
        image.className = "image-gallery-image"
        imageGallery.appendChild(image)

        const exitButton = document.createElement("button");
        exitButton.className = "image-gallery-button";
        exitButton.id = "image-gallery-button";
        exitButton.innerHTML = "X";
        exitButton.addEventListener("click", () => {
            document.getElementById("image-gallery").remove();
        });
        imageGallery.appendChild(exitButton)

        const textDiv = document.createElement("div");
        textDiv.className = "image-gallery-text";
        textDiv.id = "image-gallery-text";
        textDiv.innerHTML = "<i>\"" + text + "\"</i>";
        imageGallery.appendChild(textDiv)

        // append the image gallery to the body
        document.body.appendChild(imageGallery);
    }
    function flyToClick(coords) {
        map.flyTo({
            center: [coords[0], coords[1]],
            zoom: 17,
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        });
    }
    // create “current location” function, which doesn’t trigger until called upon.
    function addUserLocation(latitude, longitude) {
        return map.addLayer(
            new MapboxLayer({
                id: "user-location",
                type: ScatterplotLayer,
                data: [{ longitude, latitude }],
                getPosition: (d) => [d.longitude, d.latitude],
                getSourceColor: [0, 255, 0],
                sizeScale: 15,
                getSize: 10,
                radiusUnits: "pixels",
                getRadius: 5,
                opacity: 0.7,
                stroked: false,
                filled: true,
                radiusScale: 3,
                getFillColor: [3, 202, 252],
                parameters: {
                    depthTest: false,
                },
            })
        );
    }
    // get current location
    const successCallback = (position) => {
        // add new point layer of current location to deck gl
        const { latitude, longitude } = position.coords;
        addUserLocation(latitude, longitude);
    };

    const errorCallback = (error) => {
        console.log(error);
    };

    // create async function to await for current location and then return the promise as lat long coordinates then resolve the promise
    function getCurrentLocation() {
        const currentLocation = navigator.geolocation.getCurrentPosition(
            successCallback,
            errorCallback
        );
        return currentLocation;
    }
    if (navigator.geolocation) {
        getCurrentLocation();
    }

    const locationButton = document.createElement("div");
    // create a button that will request the users location
    locationButton.addEventListener("click", () => {
        // when clicked, get the users location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;

                locationButton.textContent =
                    "Where am I? " +
                    position.coords.latitude.toFixed(3) +
                    ", " +
                    position.coords.longitude.toFixed(3);

                addUserLocation(latitude, longitude);
                flyToClick([longitude, latitude]);
            });
        }
    });
    document.body.appendChild(locationButton);
};


// BEGIN LEGEND



// Function for drawing circles in legend
function draw_circle(canvas, size, color) {
    console.log("calling draw circle with color", color)
    canvas.width = 30
    canvas.height = 30
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    //ctx.lineWidth = 2
    ctx.fillStyle = color;
    console.log("my fill style is ", ctx.fillStyle)
    console.log(ctx.strokeStyle)
    ctx.beginPath();
    ctx.arc(15, 15, size, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
}

// Function for defining point elements on legend
function define_point(color, size, name) {
    const point_label = document.createElement("div")
    point_label.className = "legend-point-label"
    const label_text = document.createElement("p")
    label_text.textContent = name;
    point_label.appendChild(label_text)

    const point_drawing = document.createElement("div")
    point_drawing.className = "legend-point"
    const point_canvas = document.createElement("canvas", { width: 100, height: 100 })
    console.log("calling draw circle with color", color)
    draw_circle(point_canvas, size, color)
    point_drawing.appendChild(point_canvas)

    const point = document.createElement("div");
    point.className = "legend-section"
    point.appendChild(point_drawing)
    point.appendChild(point_label)

    return point
}

function add_checkbox(content, layer_id) {
    const existing_content = document.createElement("legend-section-no-check");
    existing_content.className = "legend-section-no-check"
    existing_content.appendChild(content)

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = layer_id
    checkbox.checked = true

    checkbox.onclick = function (e) {
        const clickedLayer = this.id;
        e.stopPropagation();

        const visibility = map.getLayoutProperty(
            clickedLayer,
            'visibility'
        );

        console.log(visibility)

        // Toggle layer visibility by changing the layout object's visibility property.
        if (visibility != 'none') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            this.className = '';
        } else {
            this.className = 'active';
            map.setLayoutProperty(
                clickedLayer,
                'visibility',
                'visible'
            );
        }
    };

    const checkbox_div = document.createElement("div")
    checkbox_div.className = "legend-check"
    checkbox_div.appendChild(checkbox)

    const with_check = document.createElement("div")
    with_check.appendChild(existing_content)
    with_check.appendChild(checkbox_div)

    return with_check
}

// Initialize title and content for traffic section of legend
const pca_1_description = document.createElement("p");
pca_1_description.id = "legend-description";
pca_1_description.textContent = "PCA 1";

const pca_1_content = document.createElement("div")
pca_1_content.className = "legend-items";

const [legendValues_pca_1, legendColors_pca_1] = [[0, 1], ["hsl(0, 0%, 80%)", "hsl(0, 0%, 31%)"]];

legendValues_pca_1.forEach((layer, i) => {
    const color = legendColors_pca_1[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_1_content.appendChild(item);
});

const pca_1 = document.createElement("div");
pca_1.className = "legend-section"
pca_1.appendChild(pca_1_description)
pca_1.appendChild(pca_1_content);
pca_1_with_check = add_checkbox(pca_1, "tripuuid-pca-1-selected-100-72tqmf")


// Initialize title and content for traffic section of legend
const pca_2_description = document.createElement("p");
pca_2_description.id = "legend-description";
pca_2_description.textContent = "PCA 2";

const pca_2_content = document.createElement("div")
pca_2_content.className = "legend-items";

const [legendValues_pca_2, legendColors_pca_2] = [[0, 1], ["hsl(64, 100%, 88%)", "hsl(62, 100%, 39%)"]];

legendValues_pca_2.forEach((layer, i) => {
    const color = legendColors_pca_2[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_2_content.appendChild(item);
});

const pca_2 = document.createElement("div");
pca_2.className = "legend-section"
pca_2.appendChild(pca_2_description)
pca_2.appendChild(pca_2_content);
pca_2_with_check = add_checkbox(pca_2, "tripuuid-pca-2-selected-100-754smp")



// Initialize title and content for traffic section of legend
const pca_3_description = document.createElement("p");
pca_3_description.id = "legend-description";
pca_3_description.textContent = "PCA 3";

const pca_3_content = document.createElement("div")
pca_3_content.className = "legend-items";

const [legendValues_pca_3, legendColors_pca_3] = [[0, 1], ["hsl(293, 97%, 88%)", "hsl(293, 94%, 25%)"]];

legendValues_pca_3.forEach((layer, i) => {
    const color = legendColors_pca_3[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_3_content.appendChild(item);
});

const pca_3 = document.createElement("div");
pca_3.className = "legend-section"
pca_3.appendChild(pca_3_description)
pca_3.appendChild(pca_3_content);
pca_3_with_check = add_checkbox(pca_3, "tripuuid-pca-3-selected-100-4v3ujx")


// Initialize title and content for traffic section of legend
const pca_4_description = document.createElement("p");
pca_4_description.id = "legend-description";
pca_4_description.textContent = "PCA 4";

const pca_4_content = document.createElement("div")
pca_4_content.className = "legend-items";

const [legendValues_pca_4, legendColors_pca_4] = [[0, 1], ["hsl(177, 96%, 86%)", "hsl(177, 100%, 32%)"]];

legendValues_pca_4.forEach((layer, i) => {
    const color = legendColors_pca_4[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_4_content.appendChild(item);
});

const pca_4 = document.createElement("div");
pca_4.className = "legend-section"
pca_4.appendChild(pca_4_description)
pca_4.appendChild(pca_4_content);
pca_4_with_check = add_checkbox(pca_4, "tripuuid-pca-4-selected-100-acg665")


// Initialize title and content for traffic section of legend
const pca_5_description = document.createElement("p");
pca_5_description.id = "legend-description";
pca_5_description.textContent = "PCA 5";

const pca_5_content = document.createElement("div")
pca_5_content.className = "legend-items";

const [legendValues_pca_5, legendColors_pca_5] = [[0, 1], ["hsl(27, 97%, 90%)", "hsl(27, 96%, 32%)"]];

legendValues_pca_5.forEach((layer, i) => {
    const color = legendColors_pca_5[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_5_content.appendChild(item);
});

const pca_5 = document.createElement("div");
pca_5.className = "legend-section"
pca_5.appendChild(pca_5_description)
pca_5.appendChild(pca_5_content);
pca_5_with_check = add_checkbox(pca_5, "tripuuid-pca-5-selected-100-7s42ut")


// Initialize title and content for traffic section of legend
const pca_6_description = document.createElement("p");
pca_6_description.id = "legend-description";
pca_6_description.textContent = "PCA 6";

const pca_6_content = document.createElement("div")
pca_6_content.className = "legend-items";

const [legendValues_pca_6, legendColors_pca_6] = [[0, 1], ["hsl(234, 14%, 86%)", "hsl(234, 79%, 39%)"]];

legendValues_pca_6.forEach((layer, i) => {
    const color = legendColors_pca_6[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_6_content.appendChild(item);
});

const pca_6 = document.createElement("div");
pca_6.className = "legend-section"
pca_6.appendChild(pca_6_description)
pca_6.appendChild(pca_6_content);
pca_6_with_check = add_checkbox(pca_6, "tripuuid-pca-6-selected-100-7g0ukd")


// Initialize title and content for traffic section of legend
const pca_7_description = document.createElement("p");
pca_7_description.id = "legend-description";
pca_7_description.textContent = "PCA 7";

const pca_7_content = document.createElement("div")
pca_7_content.className = "legend-items";

const [legendValues_pca_7, legendColors_pca_7] = [[0, 1], ["hsl(0, 12%, 85%)", "hsl(0, 83%, 28%)"]];

legendValues_pca_7.forEach((layer, i) => {
    const color = legendColors_pca_7[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_7_content.appendChild(item);
});

const pca_7 = document.createElement("div");
pca_7.className = "legend-section"
pca_7.appendChild(pca_7_description)
pca_7.appendChild(pca_7_content);
pca_7_with_check = add_checkbox(pca_7, "tripuuid-pca-7-selected-100-64dc75")


// Initialize title and content for traffic section of legend
const pca_8_description = document.createElement("p");
pca_8_description.id = "legend-description";
pca_8_description.textContent = "PCA 8";

const pca_8_content = document.createElement("div")
pca_8_content.className = "legend-items";

const [legendValues_pca_8, legendColors_pca_8] = [[0, 1], ["hsl(53, 91%, 86%)", "hsl(53, 90%, 45%)"]];

legendValues_pca_8.forEach((layer, i) => {
    const color = legendColors_pca_8[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_8_content.appendChild(item);
});

const pca_8 = document.createElement("div");
pca_8.className = "legend-section"
pca_8.appendChild(pca_8_description)
pca_8.appendChild(pca_8_content);
pca_8_with_check = add_checkbox(pca_8, "tripuuid-pca-8-selected-100-3c8pjf")


// Initialize title and content for traffic section of legend
const pca_9_description = document.createElement("p");
pca_9_description.id = "legend-description";
pca_9_description.textContent = "PCA 9";

const pca_9_content = document.createElement("div")
pca_9_content.className = "legend-items";

const [legendValues_pca_9, legendColors_pca_9] = [[0, 1], ["hsl(116, 95%, 85%)", "hsl(116, 92%, 27%)"]];

legendValues_pca_9.forEach((layer, i) => {
    const color = legendColors_pca_9[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_9_content.appendChild(item);
});

const pca_9 = document.createElement("div");
pca_9.className = "legend-section"
pca_9.appendChild(pca_9_description)
pca_9.appendChild(pca_9_content);
pca_9_with_check = add_checkbox(pca_9, "tripuuid-pca-9-selected-100-5sil3t")


// Initialize title and content for traffic section of legend
const pca_10_description = document.createElement("p");
pca_10_description.id = "legend-description";
pca_10_description.textContent = "PCA 10";

const pca_10_content = document.createElement("div")
pca_10_content.className = "legend-items";

const [legendValues_pca_10, legendColors_pca_10] = [[0, 1], ["hsl(309, 93%, 87%)", "hsl(309, 89%, 35%)"]];

legendColors_pca_10.forEach((layer, i) => {
    const color = legendColors_pca_10[i];
    const item = document.createElement("div");
    const key = document.createElement("div");
    key.className = "legend-key";
    key.style.backgroundColor = color;

    const value = document.createElement("div");
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    // item.appendChild(value);
    pca_10_content.appendChild(item);
});

const pca_10 = document.createElement("div");
pca_10.className = "legend-section"
pca_10.appendChild(pca_10_description)
pca_10.appendChild(pca_10_content);
pca_10_with_check = add_checkbox(pca_10, "tripuuid-pca-10-selected-100-8yqrim")

filteres_start_points = add_checkbox(define_point("#000000", 7, "Starting points of high/low PCA walks"), "air-data")

// Initialize title and content for sensor location submission data
sensor_recs = add_checkbox(define_point("#2e8c29", 7, "Suggested Air Quality Sensor Locations"), "submissions")

// Initialize title and content for air pollution sensor data
// air_sensors = add_checkbox(define_point("#291e9e", 10, "Current Locations of Air Quality Sensors"), "air")

incident_reports = add_checkbox(define_point("#fcba03", 10, "Current air pollution incidents"), "incidents")

// Initialize dictionary of legend sections
legend_sections = {
    "pca_1": {
        "on": true,
        "content": pca_1_with_check,
    },
    "pca_2": {
        "on": true,
        "content": pca_2_with_check,
    },
    "pca_3": {
        "on": true,
        "content": pca_3_with_check,
    },
    "pca_4": {
        "on": true,
        "content": pca_4_with_check,
    },
    "pca_5": {
        "on": true,
        "content": pca_5_with_check,
    },
    "pca_6": {
        "on": true,
        "content": pca_6_with_check,
    },
    "pca_7": {
        "on": true,
        "content": pca_7_with_check,
    },
    "pca_8": {
        "on": true,
        "content": pca_8_with_check,
    },
    "pca_9": {
        "on": true,
        "content": pca_9_with_check,
    },
    "pca_10": {
        "on": true,
        "content": pca_10_with_check,
    },
    "filteres_start_points": {
        "on": true,
        "content": filteres_start_points,
    },
    // "sensor_recs": {
    //     "on": true,
    //     "content": sensor_recs
    // },
    // "air_sensors":
    // {
    //     "on": true,
    //     "content": air_sensors
    // },
    // incident_reports: {
    //     "on": true,
    //     "content": incident_reports
    // }
}

// When the map loads, load the legend
map.on("load", () => {
    // create legend
    const legend = document.getElementById("legend");

    //   create a title for the legend
    const title = document.createElement("h2");
    title.id = "legend-title";
    title.textContent = "Legend";
    legend.appendChild(title);
    //   create a child element for the legend explaining the metric

    for (let [_, section] of Object.entries(legend_sections)) {
        if (section["on"]) {
            legend.appendChild(section["content"])
        }
    }

    const firstLabelLayerId = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol").id;

    console.log(firstLabelLayerId)

    /*checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = "penn_traffic"
  
    checkbox.onclick = function (e) {
      const clickedLayer = this.id;
      e.stopPropagation();
  
      const visibility = map.getLayoutProperty(
          clickedLayer,
          'visibility'
      );
  
      // Toggle layer visibility by changing the layout object's visibility property.
      if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          this.className = '';
      } else {
          this.className = 'active';
          map.setLayoutProperty(
              clickedLayer,
              'visibility',
              'visible'
          );
      }
    };
  
    legend.appendChild(checkbox)*/
});

// END LEGEND

// immediately call the function to get the submissions
getSubmissions();

// create a popup on hover
const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
});

// add a hover event that shows a hoverPopup with the description
map.on("mouseenter", "submissions", (e) => {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "pointer";

    const coordinates = e.features[0].geometry.coordinates.slice();
    console.log(e.features[0])
    // create some HTML objects to render in the popup
    const htmlContainer = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = e.features[0].properties.placeName;
    const description = document.createElement("p");
    description.innerHTML = e.features[0].properties.undefined;

    // append the HTML objects to the container
    htmlContainer.appendChild(title);
    htmlContainer.appendChild(description);

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the hoverPopup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Populate the hoverPopup and set its coordinates
    hoverPopup.setLngLat(coordinates).setHTML(htmlContainer.outerHTML).addTo(map);
});

// hide the hoverPopup when the mouse leaves the layer
map.on("mouseleave", "submissions", () => {
    // set the cursor back to default
    map.getCanvas().style.cursor = "";
    // remove the hoverPopup
    hoverPopup.remove();
});

// create a popup for click events
const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
});

// create a global timeout that can be used to refresh the data on the map
let timeout;

// on click of the map add a new point to the map
map.on("click", (e) => {
    // create a new geojson object from click
    const newPoint = {
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [e.lngLat.lng, e.lngLat.lat],
        },
        properties: {
            description: "",
        },
    };
    //   add a new point to the map
    if (map.getSource("newPoint")) {
        //if the source already exists, update the source
        // map.getSource("newPoint").setData(newPoint);
    } else {
        //if its the first time the user has clicked, add the source and layer
        map.addSource("newPoint", {
            type: "geojson",
            data: newPoint,
        });
        // add a new layer to the map
        map.addLayer({
            id: "newPoint",
            type: "circle",
            source: "newPoint",
            paint: {
                "circle-radius": 10,
                "circle-color": "#f30",
                "circle-stroke-width": 1,
                "circle-stroke-color": "#000000",
            },
        });
    }

    //make callback function on submit to update the new point with the description and then submit to jotform
    const updateDescription = (location) => {
        /**
         * this function will update the description of the new point and then submit the data to jotform.
         * Since it is a function it will only trigger when called upon by the submit button.
         * @param {string} location - the location of the new point
         * @param {string} description - the description of the new point
         * @param {object} submission - the submission object
         */

        // clear the existing timeout if it is about to trigger
        clearTimeout(timeout);

        // get the description from the input
        const description = document.getElementById("description").value;
        newPoint.properties.description = description;
        newPoint.properties.placeName = location;
        // add name and email to newpoint
        newPoint.properties.name = document.getElementById("name").value;
        newPoint.properties.email = document.getElementById("email").value;

        map.getSource("newPoint").setData(newPoint);

        // add a new jotform submission
        const submission = new Object();

        /**
         * MAKE SURE TO UPDATE THE NUMBERS INSIDE OF THE SQUARE BRACKETS HERE TO CORRESPOND TO THE WAY YOU STRUCTURED YOUR JOFORM
         * REFER TO MY EMAIL TO SEE HOW YOUR ANSWERS ARE COMING IN
         * THANKS
         */

        // name
        submission[3] = newPoint.properties.name;
        // email
        submission[4] = newPoint.properties.email;
        // place name
        submission[5] = newPoint.properties.placeName;
        // latitude
        submission[6] = newPoint.geometry.coordinates[1];
        // longitude
        submission[7] = newPoint.geometry.coordinates[0];
        // description
        submission[9] = newPoint.properties.description;
        if (
            // if everything has been filled out
            newPoint.properties.description &&
            newPoint.properties.name &&
            newPoint.properties.email
        ) {
            // submit the data to jotform and remove the popup
            popup.remove();
            JF.createFormSubmission(
                "223193774186060",
                submission,
                function (response) {

                    // assign a timeout to the global timeout variable and reload the map after 3 seconds
                    timeout = setTimeout(() => {
                        getSubmissions();
                    }, 3000);
                }
            );
        } else {
            alert("Please fill out all fields");
            // assign a yellow outline to the popup
        }
    };

    async function getLocationName() {
        // reverse geocode the point using fetch
        await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${mapboxgl.accessToken}`
        )
            .then((response) => response.json())
            .then((data) => {
                const location = data.features[0].place_name
                    .split(",")
                    .slice(0, 2)
                    .join(",");

                //   add a popup to the new point with a textarea input field
                const htmlContainer = document.createElement("div");
                const title = document.createElement("h4");
                title.textContent = "Suggest sensor location at " + location;

                // create name and email input fields
                const nameInput = document.createElement("input");
                nameInput.setAttribute("type", "text");
                nameInput.setAttribute("id", "name");
                nameInput.setAttribute("placeholder", "name");
                nameInput.addEventListener("input", (e) => {
                    newPoint.properties.name = e.target.value;
                });

                const emailInput = document.createElement("input");
                emailInput.setAttribute("type", "email");
                emailInput.setAttribute("id", "email");
                emailInput.setAttribute("placeholder", "email");
                emailInput.addEventListener("input", (e) => {
                    newPoint.properties.email = e.target.value;
                });

                // create description input
                const textarea = document.createElement("textarea");
                textarea.id = "description";
                textarea.placeholder = "reason for sensor location";
                textarea.style.resize = "none";

                // create submit button
                const submitButton = document.createElement("button");
                submitButton.id = "submit";
                submitButton.textContent = "Submit";

                // append all the elements to the html container
                htmlContainer.appendChild(title);
                htmlContainer.appendChild(textarea);
                htmlContainer.appendChild(nameInput);
                htmlContainer.appendChild(emailInput);
                htmlContainer.appendChild(submitButton);

                // add the popup to the map
                popup
                    .setLngLat([e.lngLat.lng, e.lngLat.lat])
                    .setHTML(htmlContainer.outerHTML)
                    .addTo(map);

                // get the newly added submit button and call the updateDescription function on click
                const appendedSubmitButton = document.getElementById("submit");
                appendedSubmitButton.addEventListener("click", function () {
                    updateDescription(location);
                });
            });
    }
    // call the getLocationName function, which triggers the popup and updateDescription function
    getLocationName();
});

// close the click popup when pressing the escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        popup.remove();
    }
});
// instantiate a popup for the basemap
const basemapPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
});

$(window).on('load', function () {
    $('#mapFormTutorial1').modal('show');
});
