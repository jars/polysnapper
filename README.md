# PolySnapper

Google Maps V3 Polygon Snapping

Check out [the jsfiddle](http://jsfiddle.net/jordanarseno/xw6gp9yq/19/)

Vanilla JS: No Deps.

----

###properties

- **`map`**: a `google.maps.Map` object.
- **`threshold`**: an integer minimum number of *meters* that will cause a snap to occur.
- **`marker`**: a `google.maps.Marker` that will appear when the users' mouse is within **threshold** distance from any point in **polygons**
- **`keyRequired`**: a boolean. If true, requires **key** to be held for snapping
- **`key`**: either `'shift'` or `'ctrl'` for now. requires keyRequired to be `true`
- **`polygons`**: an array of `google.maps.Polygon` objects that are snappable. These polygons MUST have a `snapable:true` property set on them. This allows you to use already existing polygon collections and only snap to the polygons you desire.
- **`polystyle`**: an object literal describing `StrokeWeight`, `fillColor`, etc that will be used on the polygon the user begins drawing when `enable()` is called
- **`hidePOI`**: when drawing polygons, often Points of Interest get in the way of click events. You can automagically hide them on `enable()` and show them on `disable()`.
- **`onEnabled`**: a callback once `enabled()` has been called.
- **`onDisabled`**: a callback once `disabled()` has been called. 
- **`onChange`**: a callback when a point is added, removed, or moved.

----

###methods

- **`enable()`**: invoke the custom drawing manager to begin drawing your polygon.
- **`disable()`**: cancel the custom drawing manager and remove the polygon from the map.
- **`enabled()`**: a boolean. whether we are in the enabled state, or not.
- **`polygon()`**: returns the currently editing polygon. You should call this immediately before calling `disable()` to get a copy of your polygon.

----

a brief example might look like:

```javascript
    var PS = PolySnapper({
          map: map,
          threshold: 20,
          key: 'shift',
          keyRequired: true,
          polygons: polygons,
          polystyle: polystyle,
          hidePOI: true,
          onEnabled: function(){
    		console.log("enabled");
          },
          onDisabled: function(){
    		console.log("disabled");
          },
          onChange: function(){
            console.log("a point was added, removed, or moved.");
          }
    });
    
    //first enable the manager (enter drawing mode)
    PS.enable();
    
    //user draws the polygon, point by point, snapping when necessary.
    //now, retrieve the polygon from the manager.
    the_poly = PS.polygon();
    
    //and disable the manager (exit drawing mode and clean up poly).
    //you should now use the_poly as a polygon reference
    PS.disable();
```
