//= require fabric
//= require jquery

DrawingFabric = {};

DrawingFabric.Functionality = {};

DrawingFabric.utils = {
  mouseCoord: function(event){
    return {x: event.e.layerX, y: event.e.layerY};
  },
  magnitudeBetweenPoints: function(x1,y1,x2,y2){
    return Math.sqrt(Math.pow(x1 - x2,2) + Math.pow(y1 - y2,2));
  }
};

DrawingFabric.Functionality.mouseInfo = (function(){

  return function(config){

    this.initialize = function(){

      this.fabricCanvas.on("mouse:move",function(event){
        config.x.html(event.e.layerX);
        config.y.html(event.e.layerY);
      });

    };

  };

}());

DrawingFabric.Functionality.keyboardCommands = (function(){

  return function(config){

    this.initialize = function(){

      var lastDownTarget;
      var that = this;
      var element = this.fabricCanvas.upperCanvasEl;

      var activeObject = function(){
        return that.fabricCanvas.getActiveGroup() || that.fabricCanvas.getActiveObject();
      };

      var move = function(x,y){
        var obj = activeObject();
        if(obj){
          obj.set('left',obj.left + x);
          obj.set('top',obj.top + y);
          obj.setCoords();
          that.fabricCanvas.renderAll();
        }
      };

      var destroy = function(){
        var obj = activeObject();
        if(obj){
          if(obj.hasOwnProperty('objects')){
            var objs = obj.objects;
            for( var i = 0; i < objs.length; i++ ){
              destroyObject(objs[i]);
            }
            that.fabricCanvas.discardActiveGroup();
            that.fabricCanvas.renderAll();
          } else {
            destroyObject(obj);
          }
        }
      };

      var destroyObject = function(obj){
        that.fabricCanvas.remove(obj);
      };

      var handle = function(e){
        var scale = (e.shiftKey && 10) || 1;

        switch(e.which){
        case 76: // l
        case 37: // left
          move(-1 * scale,0);
          break;
        case 72: // h
        case 39: // right
          move(1 * scale,0);
          break;
        case 75: // k
        case 38: // up
          move(0,-1 * scale);
          break;
        case 74: // j
        case 40: // down
          move(0,1 * scale);
          break;

        case 8:  // backspace
        case 46: // delete
          destroy();
        }
      };

      $(document).mousedown(function(e){
        lastDownTarget = e.target;
      });

      $(document).keydown(function(e){
        if(lastDownTarget == element){ handle(e); }
      });

    };

  };

}());

DrawingFabric.Functionality.tools = (function(){

  return function(config){

    var tool = 'cursor';

    this.initialize = function(){

      config.cursor.click(    function(){ tool = 'cursor';    });
      config.ellipse.click(   function(){ tool = 'ellipse';   });
      config.rectangle.click( function(){ tool = 'rectangle'; });
      config.triangle.click(  function(){ tool = 'triangle';  });
      config.line.click(      function(){ tool = 'line';      });

      this.tool = function(){ return tool; };
    };

  };

}());

DrawingFabric.Functionality.drawLineWithMouse = (function(){

  var utils = DrawingFabric.utils;

  return function(){

    this.initialize = function(){
      var that = this;

      var drawing = false;
      var startCoords, path;

      var isPath = function(){
        return 'line' == that.tool();
      };

      this.fabricCanvas.on('mouse:move', function(event){
        if(drawing){
          if(path){ that.fabricCanvas.remove(path); }

          var coords = utils.mouseCoord(event);
          path = new fabric.Path('M' + startCoords.x + ',' + startCoords.y+'L'+coords.x+','+coords.y);
          path.set({
            stroke: that.stroke()
          });

          that.fabricCanvas.add(path);
          that.fabricCanvas.renderAll();
        }
      });

      this.fabricCanvas.on('mouse:down', function(event){
        if(drawing){
          drawing = false;
          path    = null;
        } else if (isPath()) {
          drawing = true;
          var coords = utils.mouseCoord(event);
          startCoords = coords;
        }
      });


    };

  };

}());

DrawingFabric.Functionality.drawShapeWithMouse = (function(){

  return function(){

    var mouseState, mouseObject, mouseStartCoord;
    var utils = DrawingFabric.utils;

    this.initialize = function(){
      var that = this;

      var newObject = function(args){
        switch(that.tool()){
        case 'ellipse':
          return new fabric.Ellipse(args);
        case 'rectangle':
          return new fabric.Rect(args);
        case 'triangle':
          return new fabric.Triangle(args);
        }
      };

      var setDimensions = function(object,width,height){
        switch(that.tool()){
        case 'ellipse':
          object.set('rx',width * 0.5).
                 set('ry',height * 0.5).
                 set('width',width).
                 set('height',height);
          break;
        case 'triangle':
        case 'rectangle':
          object.set('width',width).
                 set('height',height);
          break;
        }
      };

      var isObject = function(){
        return ['ellipse','rectangle','triangle'].indexOf(that.tool()) >= 0;
      };

      this.fabricCanvas.on('mouse:down', function(event){
        if(isObject() && !event.target ){
          mouseStartCoord = utils.mouseCoord(event);
          mouseState      = 'down';

          var object = newObject({
            left:   mouseStartCoord.x,
            top:    mouseStartCoord.y,
            fill:   that.fill(),
            active: true
          });

          object.set('width',0).set('height',0);

          that.fabricCanvas.add(object);
          that.fabricCanvas.setActiveObject(object,event);
          mouseObject = object;
        }
      });

      this.fabricCanvas.on('mouse:up', function(event){
        mouseState  = 'up';
        if(mouseObject){
          // Remove object if mouse didn't move anywhere
          var coords = utils.mouseCoord(event);
          if(coords.x == mouseStartCoord.x && coords.y == mouseStartCoord.y){
            that.fabricCanvas.remove(mouseObject);
          }
          mouseObject.setCoords();
          mouseObject = null;
        }
      });

      this.fabricCanvas.on('mouse:move', function(event){

        if(isObject() && mouseState == 'down'){
          // Resize object as mouse moves
          var coords = utils.mouseCoord(event);

          var width  = coords.x - mouseStartCoord.x;
          var height = coords.y - mouseStartCoord.y;


          var centerX, centerY;
          if(event.e.altKey){
            centerX = mouseStartCoord.x;
            centerY = mouseStartCoord.y;
            width  *= 2;
            height *= 2;
          } else {
            centerX = mouseStartCoord.x + 0.5 * width;
            centerY = mouseStartCoord.y + 0.5 * height;
          }

          setDimensions(mouseObject,Math.abs(width),Math.abs(height));
          mouseObject.set('left',centerX).
                      set('top',centerY);

          that.fabricCanvas.renderAll();
        }
      });
    };

  };

}());

DrawingFabric.Functionality.selectedProperties = (function(){

  return function(config){

    this.initialize = function(){
      var that = this;

      var update = function(event){
        var shape = event.target;
        config.fill.html(shape.fill);
        config.top.html(shape.top);
        config.left.html(shape.left);
        config.width.html(shape.get('width'));
        config.height.html(shape.get('height'));
      };

      this.fabricCanvas.on('object:selected', update);
      this.fabricCanvas.on('object:modified', update);
      this.fabricCanvas.on('object:scaling',  update);
      this.fabricCanvas.on('object:moving',   update);

      this.fabricCanvas.on('selection:cleared', function(event){
        config.fill.html('');
        config.top.html('');
        config.left.html('');
        config.width.html('');
        config.height.html('');
      });

    };

  };

}());

DrawingFabric.Canvas = (function(){

  return function(canvas_id){

    var that = this;

    this.fill = function(){
      return 'green';
    };

    this.stroke = function(){
      return 'black';
    };

    this.fabricCanvas = new fabric.Canvas(canvas_id);

    this.addFunctionality = function(functionality){
      functionality.initialize.apply(this);
    };

  };

}());
