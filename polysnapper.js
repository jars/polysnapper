/*
             _                                             
            | |                                            
 _ __   ___ | |_   _ ___ _ __   __ _ _ __  _ __   ___ _ __ 
| '_ \ / _ \| | | | / __| '_ \ / _` | '_ \| '_ \ / _ \ '__|
| |_) | (_) | | |_| \__ \ | | | (_| | |_) | |_) |  __/ |   
| .__/ \___/|_|\__, |___/_| |_|\__,_| .__/| .__/ \___|_|   
| |             __/ |               | |   | |              
|_|            |___/                |_|   |_|              

@jordanarseno - MIT LICENSE

*/ 

function PolySnapper(opts){ 

    function extend(obj) {

        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
            if (source) {
                for (var prop in source) {
                    if (source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            extend(obj[prop], source[prop]);
                        } else {
                            obj[prop] = source[prop];
                        }
                    } else {
                        obj[prop] = source[prop];
                    }
                }
            }
        });
        return obj;
    }

    function defined(obj, key){
      return typeof obj[key] !== 'undefined'
    }
    
    var that = this;
    
    this.keyDownListener = null;
    this.keyUpListener   = null;

    this.drawing    = false;
    this.currentpoly = null;
    this.polys    = ( defined(opts, 'polygons') )?  opts.polygons : [];
    
    var _map      = ( defined(opts, 'map')  )?    opts.map : null;
    var _marker   = ( defined(opts, 'marker') )?    opts.marker : new google.maps.Marker(); 
    var _thresh   = ( defined(opts, 'threshold') )?   opts.threshold : 20;
    var _key      = ( defined(opts, 'key') )?     opts.key : 'shift';
    var _keyReq   = ( defined(opts, 'keyRequired') )? opts.keyRequired : false;
    
    var _onEnabled  = ( defined(opts, 'onEnabled') )?   opts.onEnabled : function(){};
    var _onDisabled = ( defined(opts, 'onDisabled') )?  opts.onDisabled : function(){}; 
    var _onChange = ( defined(opts, 'onChange') )? opts.onChange : function(){};

    var _polystyle  = ( defined(opts, 'polystyle') )? (JSON.parse(JSON.stringify(opts.polystyle))) : {};
    var _hidePOI    = ( defined(opts, 'hidePOI') )?   opts.hidePOI : false;

    
    var _keyDown = false;
    
    if( !_map ){
      console.log("We need to know the map");
        return;
    }
    
    if( _hidePOI ){
      
        _map.poi = function(state){

          var styles = [
            {
              "featureType": "transit",
              "stylers": [
                { "visibility": "off" }
              ]
            },{
              "featureType": "poi",
              "stylers": [
                { "visibility": "off" }
              ]
            },{
              "featureType": "landscape",
              "stylers": [
                { "visibility": "off" }
              ]
            }
          ];

          this.set("styles", (state)? {} : styles );

        }
        
    }
    
    if( _keyReq ){
        
        var keymap = {
          'shift': 16,
            'ctrl': 17
        }
        var which = keymap[_key];

        this.keyDownListener = window.addEventListener("keydown", function(e){
            _keyDown = (e.which == which);
        });

        this.keyUpListener = window.addEventListener("keyup", function(e){
            _keyDown = (e.which == which)? false : true;
        });
    }
    
    return {
        polygon: function(){
          return that.currentpoly;
        },
        enabled: function(){
          return that.drawing;
        },
        enable: function(){
          
            that.drawing = true;
            
            if( _hidePOI ) _map.poi(false);
            
            var vertexMarker        = _marker;
            var snapable_polys      = that.polys.filter( function(p){ return ( typeof p.snapable !== 'undefined' && p.snapable ) } );
            var snapable_points     = snapable_polys.map( function(p){ return p.getPath().getArray() } ).reduce(function(a,b){ return a.concat(b) });
            var last_closeby        = null;
            
            //the official Drawing Manager will not work!
            _map.setOptions({draggableCursor:'crosshair'});

            that.currentpoly = new google.maps.Polygon(
              extend( _polystyle, {editable: true, map: _map})
            );

            that.currentpoly.addListener('rightclick', function(e){

              if (e.vertex != null && this.getPath().getLength() > 3) {
                  this.getPath().removeAt(e.vertex);
                  _onChange();
              }

            });

            //you can delete vertices in the current polygon by right clicking them 
            _map.addListener("click", function(e){

                // Because path is an MVCArray, we can simply append a new coordinate
                // and it will automatically appear.
                var ll = (last_closeby && (!_keyReq || _keyReq && _keyDown) )? last_closeby : e.latLng; 
                that.currentpoly.getPath().push(ll);
                _onChange();

            });

            /*listening to set_at event, and calling the setAt() method inside
              will cause a Maximum call stack size exceeded...

                google.maps.event.addListener(currentpoly.getPath(), "set_at", function(idx){
                    if(last_closeby) currentpoly.getPath().setAt(idx, last_closeby);
                });

            Instead, we can addListenerOnce, and make sure to re-attach the listner AFTER setAt
            */
            (function setAtRecurse(){
                google.maps.event.addListenerOnce(currentpoly.getPath(), "set_at", function(idx){
                    if(last_closeby && (!_keyReq || _keyReq && _keyDown)) that.currentpoly.getPath().setAt(idx, last_closeby);
                    setAtRecurse();
                    _onChange();
                });
            }());
      
            //Same comments go for insert_at ...
            (function insertAtRecurse(){
                google.maps.event.addListenerOnce(currentpoly.getPath(), "insert_at", function(idx){
                    if(last_closeby && (!_keyReq || _keyReq && _keyDown)) that.currentpoly.getPath().setAt(idx, last_closeby);
                    insertAtRecurse();
                    _onChange();
                });
            }());

            
            /*
                we cannot listen to move events on the gmap object.. because when we
                drag existing points, or new ones, the mouse move events are suspended
                instead, we must attach mousemove to the mapcanvas (jquery), and then 
                convert x,y coordinates in the map canvas to lat lng points.
            */
            var mapdiv = document.getElementById( _map.getDiv().getAttribute('id') );
            
            mapdiv.onmousemove  = function(e){

                bounds   = _map.getBounds();
                neLatlng = bounds.getNorthEast();
                swLatlng = bounds.getSouthWest();
                startLat = neLatlng.lat();
                endLng   = neLatlng.lng();
                endLat   = swLatlng.lat();
                startLng = swLatlng.lng();

                lat = startLat + (( e.offsetY/ this.offsetHeight ) * (endLat - startLat));
                lng = startLng + (( e.offsetX/ this.offsetWidth )  * (endLng - startLng));

                var ll = new google.maps.LatLng(lat, lng);

                //find any of the existing polygon points are close to the mousepointer
                var closeby = snapable_points.filter ( function(p){ 
                    return ( google.maps.geometry.spherical.computeDistanceBetween(ll, p) ) < _thresh 
                })[0] || null;

                /* we could just use:

                    if(closeby){    
                        vertexMarker.setOptions({
                            position: closeby,
                            map: map
                        });
                    }
                    else vertexMarker.setMap(null);


                However, it causes the marker to flicker because we are constantly calling
                setOptions every mousemove. We will instead, save the last position of closeby,
                and only set it again if it has changed...

                */

                if(closeby && closeby != last_closeby){    
                    last_closeby = closeby;
                    vertexMarker.setPosition(closeby);
                    vertexMarker.setMap(_map);
                }
                else if(!closeby) {
                    last_closeby = null;
                    vertexMarker.setMap(null);
                }


            };
            
            //now execute the callback
            _onEnabled();
        },
        disable: function(){
          
            if(_hidePOI) _map.poi(true);
            
            that.drawing = false;
            _map.setOptions({draggableCursor:null});
            that.currentpoly.setMap(null);
            
            //annnd the callback
            _onDisabled();

             if(_keyReq){

                window.removeEventListener("keydown", this.keyDownListener);
                window.removeEventListener("keyup", this.keyUpListener);

            }
        }
        
    }
    
} 