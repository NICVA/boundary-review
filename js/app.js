var $ = require('jquery');

var Papa = require('papaparse');
require('leaflet');
window.jQuery = require('jquery');
require('bootstrap');
window.jQuery = null;
require('leaflet-providers');
require('leaflet-ajax');

var ukQuota = 74769,
    ukQuotaMin = 71031,
    ukQuotaMax = 78507;

var layerStyle = {
    weight: 2,
    color: 'blue',
    fillOpacity: 0.1,
    opacity: 0.7
};

var wardsStyle = {
    weight: 2,
    color: 'red',
    fillOpacity: 0.1,
    opacity: 0.7
};

var oldConstituencyStyle = {
    weight: 2,
    color: 'green',
    fillOpacity: 0.1,
    opacity: 0.7
}

var newConstituencyStyle = {
    weight: 2,
    color: 'blue',
    fillOpacity: 0.1,
    opacity: 0.7
}

var proposedWardsAccordion = $('#proposed-wards-accordion'),
    proposedStats = $('#panel-proposed');

var proposedMap = new L.map('map-proposed', {
    center: new L.LatLng(54.6071, -6.3247),
    zoom: 8,
    minZoom: 7,
    maxZoom: 17
});

var info = L.control();

var mapitRoute = 'https://mapit.mysociety.org/postcode/:pcode.json?generation=:gen';

$('#postcode-button')
    .click(function() {
        postcodeFinder();
    });

$('#postcode-input')
    .keypress(function(e) {
        if (e.which == '13') {
            postcodeFinder();
        }
    });

function postcodeFinder() {
		$('#postcode-input-group').removeClass('has-error has-feedback').tooltip('hide');
    var value = $('#postcode-input').val().replace(/\s/g, ""),
        regex = /[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}/i,
        query = mapitRoute.replace(":pcode", value).replace(":gen", 29);
    if (regex.test(value) === false) {
        $('#postcode-input-group').addClass('has-error has-feedback').attr('data-toggle', 'tooltip').attr('data-placement', 'top').attr('title', 'Invalid Postcode. Must start with "BT"').tooltip('show');
    } else {
        $('#postcode-input-group').removeClass('has-error has-feedback').tooltip('hide');
        $.getJSON(query, function(data) {
                var areas = data.areas;
                L.marker([data.wgs84_lat, data.wgs84_lon]).addTo(proposedMap);
                proposedMap.flyTo(new L.latLng(data.wgs84_lat, data.wgs84_lon), 10);
                $.each(areas, function(key, value) {
                    if (value.type == 'WMC') {
                        var wmcGSS = value.codes.gss;
                        clearMap();
                        addGeoLayer(proposedMap, 'data/current/' + wmcGSS + '.json', oldConstituencyStyle, null);
                        $('#which-constituencies').show(400).html('<h3><small>Old Constituency: </small>' + value.name + ' (green)</h3>');
                    }
                    if (value.type == 'LGW') {
                        var lgwGSS = value.codes.gss;
                        findNewWard(lgwGSS);
                    }
                });

            })
            .fail(function() {
                $('#postcode-input-group').addClass('has-error has-feedback').attr('data-toggle', 'tooltip').attr('data-placement', 'top').attr('title', 'Could not find a location for this entry.').tooltip('show');
            })
            .error(function() {
                $('#postcode-input-group').addClass('has-error has-feedback').attr('data-toggle', 'tooltip').attr('data-placement', 'top').attr('title', 'Could not find a result for this postcode').tooltip('show');
            });
    }
}

info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'map-info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function(props) {
    if (props && props.hasOwnProperty('PC_Name')) {
        this._div.innerHTML = '<h5>' + props.PC_Name + '</h5>';
    } else if (props && props.hasOwnProperty('WARDNAME')) {
        this._div.innerHTML = '<h5>Ward: ' + props.WARDNAME + '</h5>';
    } else {
        this._div.innerHTML = '<h5> Hover over an area </h5>';
    }
}

function zoomToFeature(e, map) {
    map.flyToBounds(e.target.getBounds());
}

function addTopoData(topoData, topoLayer) {
    topoLayer.addData(topoData);
    topoLayer.addTo(map);
}

function clickFeature(e) {
    geojsonLayer.setStyle(layerStyle);
    var layer = e.target;
    zoomToFeature(e, proposedMap);
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    selectConstituency(e.target.feature.properties.code, false);
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 10,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info.update(layer.feature.properties);
}

function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
    info.update();
}

function addGeoLayer(map, filepath, style, onEachFeature) {

    window.geojsonLayer = new L.GeoJSON.AJAX(filepath, {
        style: style,
        onEachFeature: onEachFeature
    });

    geojsonLayer.addTo(map);

}

function addWardLayer(map, id) {
    clearMap();
    var filepath = 'data/proposed/wards/' + id + '.json';
    console.log(filepath);
    window.geojsonLayer = new L.GeoJSON.AJAX(filepath, {
        style: wardsStyle,
        onEachFeature: onEachFeatureWards
    });
    geojsonLayer.addTo(map);
    $("#reset-div").html('<a id="reset-button" class="btn btn-primary btn-lg pull-right" role="button">Reset Map</a>');
    $("#reset-button").on({
        click: mapReset
    });
}

function mapReset() {
    clearMap();
    addConstituencyBounds();
    proposedMap.flyTo(new L.LatLng(54.6071, -6.3247), 8);
}

function onEachFeature(feature, layer) {
    layer.on({
        click: clickFeature,
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}

function onEachFeatureWards(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}

function handleLayer(layer) {
    layer.bindPopup('Hello');
}

function csvJSON(csv) {

    var lines = csv.split("\n");
    var result = [];
    var headers = lines[0].split(",");

    for (var i = 1; i < lines.length; i++) {

        var obj = {};
        var currentline = lines[i].split(",");

        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j];
        }

        result.push(obj);

    }

    //return result; //JavaScript object
    return console.log(JSON.stringify(result)); //JSON
}

function resetInputDiv() {
    var code = '<div class="dropdown">		<button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">			Choose a new constituency			<span class="caret"></span>		</button>		<ul id="constituency-dropdown-options" class="dropdown-menu" aria-labelledby="dropdownMenu1">			<li class="dropdown-header">Proposed Provisional Constituencies</li>		</ul>	</div>';
    $('#input-div').html(code);
}

function tileLayers(map) {
    var northEast = L.latLng(55.3166, -8.2919),
        southWest = L.latLng(54, -5.327),
        bounds = L.latLngBounds(southWest, northEast);
    L.tileLayer.provider('Stamen.Terrain').addTo(map);
    map.setMaxBounds(bounds);
    map.setMaxZoom();
}

function loadConstituencies(filepath) {

    Papa.parse(filepath, {
        download: true,
        header: true,
        complete: function(results) {
            console.log("Finished constituencies:", results.data);
            var constituencies = results.data;
            fillConstituencyDropdown(constituencies);
        }
    })
}

function genereateConstituencyStats(id, constituencies) {
    var div = proposedStats;
    var divHTML = '<div id="panel-proposed" class="panel-body">				</div>';
    div.replaceWith(divHTML);
    Papa.parse('data/proposed_constituencies.csv', {
        download: true,
        header: true,
        complete: function(results) {
            var constituencies = results.data;
            for (i = 0; i < constituencies.length; i++) {
                var constituency = constituencies[i];
                if (constituency.constituencycode == id) {
                    console.log(constituency);
                    document.getElementById('panel-proposed').innerHTML = '<h3>' + constituency.constituencyname + ' <span class="badge">' + constituency.electors + ' electors</span></h3></br><h5><strong><abbr title="The number of electors difference with the mandated UK quota">Difference with UK quota</abbr></strong> ' + constituency.diff + '</h5><h5><strong><abbr title="The percentage difference of the number of electors with the mandated UK quota. The maximum is +/- 5%">Percentage Difference</abbr></strong> ' + constituency.percentdiff + '%</h5>';
                }
            }
        }
    });
}

function fillConstituencyDropdown(constituencies) {

    for (i = 0; i < constituencies.length; i++) {
        var constituency = constituencies[i];
        var constituencycode = constituency.constituencycode;
        var constituencyname = constituency.constituencyname;
        document.getElementById('constituency-dropdown-options').innerHTML += '<li><a id="constituency-option-' + constituencycode + '" onclick="selectConstituency(' + constituencycode + ', true);" href="#">' + constituencyname + '</a></li>';
    }
}

function findNewWard(gss) {
    Papa.parse("data/proposed_wards.csv", {
        download: true,
        header: true,
        complete: function(results) {
            var wards = results.data;
            $.each(wards, function(key, value) {
                if (value.wardcode == gss) {
                    var newWard = value.wardname,
                        proposedCon = value.constituencyname;
                    id = value.constituencycode;
                    $('#which-constituencies').append('<h3><small><abbr title="The constituency area provisionally proposed by the Boundary Commission NI in September 2016, subject to final decision after public consultation">New Constituency</abbr>: </small>' + proposedCon + ' (blue)</h3>Scroll down for more info about the new constituency');
                    genereateConstituencyStats(id);
                    addGeoLayer(proposedMap, 'data/proposed/' + id + '.json', newConstituencyStyle, onEachFeature);
                    loadWards(id, "data/proposed_wards.csv", proposedWardsAccordion);
                    $("#reset-div").html('<a id="reset-button" class="btn btn-primary btn-lg pull-right" role="button">Reset Map</a>');
                    $("#reset-button").on({
                        click: mapReset
                    });
                }
            });
        }
    });
}

function loadWards(id, filepath, accordion) {

    Papa.parse(filepath, {
        download: true,
        header: true,
        complete: function(results) {
            console.log("Finished wards:", results.data);
            var wards = results.data;

            var accordionHTML = '<div class="panel panel-info" id="wards-panel-info">					<div class="panel-heading" role="tab" id="headingOne">					  <h4 class="panel-title">						<a class="collapsed" role="button" data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="false" aria-controls="collapseOne">						  Wards in <span id="constituency-name"></span>	(click to expand)				</a> 					  </h4>				</div>		<div id="collapseOne" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingOne">			<div class="panel-body" id="wards-panel-body"></div>				  <div class="list-group" id="wards-list">	  </div>					</div>				  </div>';
            accordion.html(accordionHTML);

            var count = 0;
            for (var i = 0; i < wards.length; i++) {
                var ward = wards[i];
                if (ward.constituencycode == id) {
                    count += 1;
                    $('#constituency-name').html(ward.constituencyname + ' <span class="badge pull-right">' + count + ' wards</span>');
                    if (ward.electors) {
                        document.getElementById("wards-list").innerHTML += '<li class="list-group-item"><h5>' + ward.wardname + ' <small>' + ward.wardcode + ' </small><span class="badge pull-right" id="ward-electors">' + ward.electors + ' electors</span></h5></li>';
                    } else {
                        document.getElementById("wards-list").innerHTML += '<li class="list-group-item"><h5>' + ward.wardname + ' <small>' + ward.wardcode + ' </small></h5></li>';
                    }
                }
            }
            document.getElementById("wards-panel-info").innerHTML += '<div class="panel-footer">The Boundary Review is required to use the Ward boundaries in force for the most recent local government elections to draw proposed constituencies. In Northern Ireland these are the 2012 Ward boundaries (of which there are 462 Wards in total). Note that these differ from the wards that match to the <em>current</em> Parliamentary Constituencies, known as the 1992 Ward boundaries (of which there are 582).</div>';

            $('#wards-panel-body').append('<a id="show-wards" href="#"> Show Wards on map</a>');
            $('#show-wards')
                .click(function() {
                    addWardLayer(proposedMap, id)
                })
            return $('#show-wards');
        }
    });
}

function selectConstituency(id, istrue) {
    var constituencycode = id;
    if (istrue == true) {
        proposedMap.eachLayer(function(layer) {
            if (layer.hasOwnProperty('feature')) {
                if (layer.feature.properties.code == id) {
                    proposedMap.flyToBounds(layer.getBounds());
                }
            }
        });
    }
    genereateConstituencyStats(id);
    loadWards(id, "data/proposed_wards.csv", proposedWardsAccordion);
}

function initialize() {
    tileLayers(proposedMap);
    addConstituencyBounds();
    info.addTo(proposedMap);
}

function clearMap() {
    proposedMap.eachLayer(function(layer) {
        if (layer.hasOwnProperty('feature')) {
            proposedMap.removeLayer(layer);
        }
    });
}

function addConstituencyBounds() {
    for (i = 1; i < 18; i++) {
        addGeoLayer(proposedMap, 'data/proposed/' + i + '.json', layerStyle, onEachFeature);
    }
}

initialize();
