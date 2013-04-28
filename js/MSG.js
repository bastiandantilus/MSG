/**
 * @author Scott Robert Lawrence
 */

function canvas_fit() {
  var canvas = document.getElementById("mainCanvas");

  canvas.height = canvas.width = Math.min(document.width, document.height - 100);
  var canvasW = canvas.width;
  var canvasH = canvas.height;

  if (canvas.getContext) {
    var ctx = canvas.getContext("2d");
    /* ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#CCFFCC";
    ctx.fill(); */
    //setup();
  }
}

window.onresize = canvas_fit;

//JavaScript HTML5 Canvas example by Dan Gries, rectangleworld.com.
//The basic setup here, including the debugging code and window load listener, is copied from 'HTML5 Canvas' by Fulton & Fulton.

//window.addEventListener("load", windowLoadHandler, false);

//The code below establishes a way to send debug messages to the browser JavaScript Console,
//but in such a way as to ignore errors when the browser doesn't support the JavaScript Console.
//To log a messages to the console, insert into the code:
//Debugger.log("my message");
var Debugger = function() {
};
Debugger.log = function(message) {
  try {
    console.log(message);
  } catch (exception) {
    return;
  }
}
function windowLoadHandler() {
  canvasApp();
}

function canvasSupport() {
  return true;
  //Modernizr.canvas;
}

function canvasApp() {
  if (!canvasSupport()) {
    return;
  }

  var theCanvas = document.getElementById("mainCanvas");
  var context = theCanvas.getContext("2d");

  init();

  var numShapes;
  var shapes;
  var dragIndex;
  var dragging;
  var mouseX;
  var mouseY;
  var dragHoldX;
  var dragHoldY;
  var timer;
  var targetX;
  var targetY;
  var easeAmount;
  var bgColor;

  function init() {
    numShapes = 64;
    easeAmount = 0.20;

    bgColor = "#000000";

    shapes = [];

    makeShapes();

    drawScreen();

    theCanvas.addEventListener("mousedown", mouseDownListener, false);
  }

  function makeShapes() {
    var i;
    var tempX;
    var tempY;
    var tempRad;
    var r1;
    var g1;
    var b1;
    var numColors = 4;
    var color1;
    var r2;
    var g2;
    var b2;
    var color2;
    var tempGrad;
    var gradFactor = 2;
    shape_count = 8;
    radius = theCanvas.width / (3 * (shape_count + 1));
    baseX = radius * 2;
    baseY = radius * 2;
    for ( i = 0; i < numShapes; i++) {
      //tempRad = 5 + Math.floor(Math.random() * 20);
      tempRad = radius;
      //position
      tempX = (i % shape_count) * radius * 3 + baseX;
      tempY = Math.floor(i / shape_count) * radius * 3 + baseY;

      //Randomize the color gradient. We will select a random color and set the center of the gradient to white.
      //We will only allow the color components to be as large as 200 (rather than the max 255) to create darker colors.
      var seed = (Math.floor(Math.random() * numColors) + 1) / numColors;
      h1 = Math.floor(seed * 375) - (300 / numColors);
      s1 = 50 + seed * 40;
      l1 = 50 + seed * numColors;
      color1 = "hsl(" + h1 + "," + s1 + "%," + l1 + "%)";
      //console.log(color1);

      h2 = h1 + 20;
      s2 = Math.min(Math.floor(gradFactor * s1), 100);
      l2 = Math.min(Math.floor(gradFactor * l1), 75);
      color2 = "hsl(" + h2 + "," + s2 + "%," + l2 + "%)";

      tempShape = {
        x : tempX,
        y : tempY,
        rad : tempRad,
        gradColor1 : color1,
        gradColor2 : color2
      };
      shapes.push(tempShape);
    }
  }

  function repositionShapes() {
    for ( i = 0; i < numShapes; i++) {
      //position
      shapes[i].x = getX(i);
      shapes[i].y = getY(i);
    }
    drawShapes();
  }

  function getX(i) {
    return (i % shape_count) * radius * 3 + baseX;
  }

  function getY(i) {
    return Math.floor(i / shape_count) * radius * 3 + baseY;
  }

  function mouseDownListener(evt) {
    repositionShapes();
    var i;

    //getting mouse position correctly
    var bRect = theCanvas.getBoundingClientRect();
    mouseX = (evt.clientX - bRect.left) * (theCanvas.width / bRect.width);
    mouseY = (evt.clientY - bRect.top) * (theCanvas.height / bRect.height);

    //find which shape was clicked
    for ( i = 0; i < numShapes; i++) {
      if (hitTest(shapes[i], mouseX, mouseY)) {
        dragging = true;
        //the following variable will be reset if this loop repeats with another successful hit:
        dragIndex = i;
      }
    }

    if (dragging) {
      window.addEventListener("mousemove", mouseMoveListener, false);

      //We now place the currently dragged shape on top by reordering the array which holds these objects.
      //We 'splice' out this array element, then 'push' it back into the array at the end.
      //shapes.push(shapes.splice(dragIndex,1)[0]);

      //shape to drag is now last one in array. We read record the point on this object where the mouse is "holding" it:
      dragHoldX = mouseX - shapes[dragIndex].x;
      dragHoldY = mouseY - shapes[dragIndex].y;

      //The "target" position is where the object should be if it were to move there instantaneously. But we will
      //set up the code so that this target position is approached gradually, producing a smooth motion.
      targetX = mouseX - dragHoldX;
      targetY = mouseY - dragHoldY;

      //start timer
      timer = setInterval(onTimerTick, 1000 / 30);
    }
    theCanvas.removeEventListener("mousedown", mouseDownListener, false);
    window.addEventListener("mouseup", mouseUpListener, false);

    //code below prevents the mouse down from having an effect on the main browser window:
    if (evt.preventDefault) {
      evt.preventDefault();
    }//standard
    else if (evt.returnValue) {
      evt.returnValue = false;
    }
    //older IE
    return false;
  }

  function onTimerTick() {
    repositionShapes();
    /*
     Because of reordering, the dragging shape is the last one in the array.
     The code below moves this shape only a portion of the distance towards the current "target" position, and
     because this code is being executed inside a function called by a timer, the object will continue to
     move closer and closer to the target position.
     The amount to move towards the target position is set in the parameter 'easeAmount', which should range between
     0 and 1. The target position is set by the mouse position as it is dragging.
     */

    if (Math.abs(targetX - getX(dragIndex)) > Math.abs(targetY - getY(dragIndex))) {
      if (targetX < getX(dragIndex) && targetX > baseX) {
        shapes[dragIndex].x = getX(dragIndex) - radius * 3;
        shapes[dragIndex - 1].x = getX(dragIndex);
      }

      if (targetX > getX(dragIndex) && targetX < shape_count * (radius * 3) - radius) {
        shapes[dragIndex].x = getX(dragIndex) + radius * 3;
        shapes[dragIndex + 1].x = getX(dragIndex);
      }

    } else {
      if (targetY < getY(dragIndex) && targetY > baseY) {
        shapes[dragIndex].y = getY(dragIndex) - radius * 3;
        shapes[dragIndex - shape_count].y = getY(dragIndex);
      }

      if (targetY > getY(dragIndex) && targetY < shape_count * (radius * 3) - radius) {
        shapes[dragIndex].y = getY(dragIndex) + radius * 3;
        shapes[dragIndex + shape_count].y = getY(dragIndex);
      }

    }

    //shapes[numShapes - 1].x = shapes[numShapes - 1].x + easeAmount * (targetX - shapes[numShapes - 1].x);
    //shapes[numShapes - 1].y = shapes[numShapes - 1].y + easeAmount * (targetY - shapes[numShapes - 1].y);

    //stop the timer when the target position is reached (close enough)
    if ((!dragging) && (Math.abs(shapes[numShapes - 1].x - targetX) < 0.1) && (Math.abs(shapes[numShapes - 1].y - targetY) < 0.1)) {
      shapes[numShapes - 1].x = targetX;
      shapes[numShapes - 1].y = targetY;
      //stop timer:
      clearInterval(timer);
    }
    drawScreen();
  }

  function mouseUpListener(evt) {
    theCanvas.addEventListener("mousedown", mouseDownListener, false);
    window.removeEventListener("mouseup", mouseUpListener, false);
    if (dragging) {
      dragging = false;
      window.removeEventListener("mousemove", mouseMoveListener, false);
    }
  }

  function mouseMoveListener(evt) {
    var posX;
    var posY;
    var shapeRad = shapes[numShapes - 1].rad;
    var minX = shapeRad;
    var maxX = theCanvas.width - shapeRad;
    var minY = shapeRad;
    var maxY = theCanvas.height - shapeRad;
    //getting mouse position correctly
    var bRect = theCanvas.getBoundingClientRect();
    mouseX = (evt.clientX - bRect.left) * (theCanvas.width / bRect.width);
    mouseY = (evt.clientY - bRect.top) * (theCanvas.height / bRect.height);

    //clamp x and y positions to prevent object from dragging outside of canvas
    posX = mouseX - dragHoldX;
    posX = (posX < minX) ? minX : ((posX > maxX) ? maxX : posX);
    posY = mouseY - dragHoldY;
    posY = (posY < minY) ? minY : ((posY > maxY) ? maxY : posY);

    targetX = posX;
    targetY = posY;
  }

  function hitTest(shape, mx, my) {

    var dx;
    var dy;
    dx = mx - shape.x;
    dy = my - shape.y;

    return (dx * dx + dy * dy < shape.rad * shape.rad);
  }

  function drawShapes() {
    var i;
    for ( i = 0; i < numShapes; i++) {
      drawShape(i, false);
    }
    if (dragging) {
      drawShape(dragIndex, true);
    }
  }

  function drawShape(i, top) {
    var grad;
    var x;
    var y;
    var rad;
    //define gradient
    rad = shapes[i].rad;
    if (top) {
      rad += 3;
    }
    x = shapes[i].x;
    y = shapes[i].y;
    grad = context.createRadialGradient(x - 0.33 * rad, y - 0.33 * rad, 0, x - 0.33 * rad, y - 0.33 * rad, 1.33 * rad);
    grad.addColorStop(0, shapes[i].gradColor2);
    grad.addColorStop(1, shapes[i].gradColor1);

    context.fillStyle = grad;
    context.beginPath();
    context.arc(x, y, rad, 0, 2 * Math.PI, false);
    context.closePath();
    context.fill();

  }

  function drawScreen() {
    //bg
    context.fillStyle = bgColor;
    context.fillRect(0, 0, theCanvas.width, theCanvas.height);
    if (!dragging) {
      repositionShapes();
    }
    drawShapes();
  }

}
