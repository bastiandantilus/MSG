/**
 * @author Scott Robert Lawrence
 */

var Debugger = function() {"use strict";
};
Debugger.log = function() {"use strict";
  //return;
  try {
    console.log(arguments);
  } catch (exception) {
    return;
  }
};

function canvasSupport() {"use strict";
  return true;
  //Modernizr.canvas;
}

function MSG(rowLength) {"use strict";
  if (!canvasSupport()) {
    return;
  }

  var sounds = {};

  var theCanvas = document.getElementById("mainCanvas");
  var parent = theCanvas.parentNode;
  parent.removeChild(theCanvas);

  theCanvas = document.createElement("canvas");
  theCanvas.id = "mainCanvas";
  parent.appendChild(theCanvas);

  var context = theCanvas.getContext("2d");

  var score, failed, paused, valid_moves, numColors, numShapes, rowLength, radius, baseX, baseY, shapes;

  var dragIndex;

  var swapIndex;
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

  init();

  var touchToMouse = function(event) {
    if (event.touches.length > 1)
      return;
    //allow default multi-touch gestures to work
    var touch = event.changedTouches[0];
    var type = "";

    switch (event.type) {
      case "touchstart":
        type = "mousedown";
        break;
      case "touchmove":
        type = "mousemove";
        break;
      case "touchend":
        type = "mouseup";
        break;
      default:
        return;
    }

    // https://developer.mozilla.org/en/DOM/event.initMouseEvent for API
    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);

    touch.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
  };

  function init() {
    canvas_fit();
    numShapes = rowLength * rowLength;
    numColors = 4;
    easeAmount = 0.80;

    bgColor = "#DDDDFF";

    shapes = [];

    score = 0;

    failed = false;
    paused = true;

    valid_moves = {
      rank : 0,
      suit : 0
    };

    makeShapes();

    drawScreen();

    theCanvas.addEventListener("mousedown", mouseDownListener, false);
    theCanvas.addEventListener("touchstart", touchToMouse, false);

    check_for_matches(false);

    drawShapes();
    //start timer
    timer = setInterval(onTimerTick, 1000 / 30);

  }

  function game_over(score, numColors) {
    theCanvas.removeEventListener("mousedown", mouseDownListener, false);
    theCanvas.removeEventListener("touchstart", touchToMouse, false);

    setTimeout(function() {
      clearInterval(timer);
    }, 1000);
    var header = document.getElementsByTagName("header")[0];
    var div = document.createElement("div");
    div.className = 'message';
    div.setAttribute('onclick', 'this.parentNode.removeChild(this);');
    div.setAttribute('title', "click to close");
    if (score > 0) {
      div.innerHTML = "Congratulations! You reached level " + numColors + " with a final score of " + score;
    } else {
      div.innerHTML = "Game Over! Sorry, you made too many illegal moves.";
    }
    header.appendChild(div);
  }

  function playSound(filename) {
    if (!sounds[filename]) {
      sounds[filename] = new Howl({
        urls : [filename]
      });
    }
    sounds[filename].play();
  }

  function getRadius() {
    return theCanvas.width / (3 * (rowLength + 1));
  }

  function getGrad(suit) {
    var color1, color2;
    var tempGrad;
    var gradFactor = 1.25;
    var h1, s1, l1, h2, s2, l2;

    var seed = suit / numColors;
    h1 = Math.floor(seed * 360);
    s1 = Math.floor(70 + seed * 20);
    l1 = suit % 2 ? Math.floor(40 + seed * 20) : Math.floor(20 + seed * 40);
    color1 = "hsl(" + h1 + "," + s1 + "%," + l1 + "%)";

    h2 = h1 + numColors;
    s2 = Math.floor(Math.min(s1 * gradFactor, 100));
    l2 = l1 + 20;
    color2 = "hsl(" + h2 + "," + s2 + "%," + l2 + "%)";
    //Debugger.log(color1, color2);

    return [color1, color2];
  }

  function makeShape(i) {
    var tempX;
    var tempY;
    var tempShape;
    radius = getRadius();
    baseX = radius * 2;
    baseY = radius * 2;
    //position
    tempX = (i % rowLength) * radius * 3 + baseX;
    tempY = Math.floor(i / rowLength) * radius * 3 + baseY;

    //Randomize the suit and rank
    var suit = (Math.floor(Math.random() * numColors) + 1);
    var rank = (Math.floor(Math.random() * numColors) + 1);

    var grad = getGrad(suit);

    tempShape = {
      x : tempX,
      y : tempY,
      rad : radius,
      gradColor1 : grad[0],
      gradColor2 : grad[1],
      suit : suit,
      rank : rank,
      marked : 0,
      targetX : tempX,
      targetY : tempY
    };
    shapes[i] = tempShape;

  }

  function makeShapes() {
    var i;
    for ( i = 0; i < numShapes; i++) {
      makeShape(i);
    }
  }

  function repositionShapes() {
    var i, timer;
    for ( i = 0; i < numShapes; i++) {
      //position
      if (!dragging || (i !== dragIndex && i !== swapIndex)) {
        // Don't reposition actively moving shapes
        shapes[i].targetX = getX(i);
        shapes[i].targetY = getY(i);
      }
    }
    drawScreen();
  }

  function getX(i) {
    return (i % rowLength) * radius * 3 + baseX;
  }

  function getY(i) {
    return Math.floor(i / rowLength) * radius * 3 + baseY;
  }

  function mouseDownListener(evt) {
    if (paused) {
      Debugger.log("paused");
      return;
    }
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
      window.addEventListener("touchmove", touchToMouse, false);

      //We read record the point on this object where the mouse is "holding" it:
      dragHoldX = mouseX - shapes[dragIndex].x;
      dragHoldY = mouseY - shapes[dragIndex].y;

      //The "target" position is where the object should be if it were to move there instantaneously. But we will
      //set up the code so that this target position is approached gradually, producing a smooth motion.
      targetX = mouseX - dragHoldX;
      targetY = mouseY - dragHoldY;
    }
    theCanvas.removeEventListener("mousedown", mouseDownListener, false);
    theCanvas.removeEventListener("touchstart", touchToMouse, false);
    window.addEventListener("mouseup", mouseUpListener, false);
    window.addEventListener("touchend", touchToMouse, false);

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
    // Resets shapes to proper locations
    // console.log("tick");

    if (dragIndex === -1) {
      return;
    }
    // Moves selected shape in direction dragged, exactly one space
    if (Math.max(Math.abs(targetX - getX(dragIndex)), Math.abs(targetY - getY(dragIndex))) > radius) {
      if (Math.abs(targetX - getX(dragIndex)) > Math.abs(targetY - getY(dragIndex))) {
        if (targetX < getX(dragIndex) && targetX > baseX) {
          shapes[dragIndex].targetX = Math.max(targetX, getX(dragIndex) - radius * 3);
          shapes[dragIndex - 1].targetX = getX(dragIndex);
          swapIndex = dragIndex - 1;
        }

        if (targetX > getX(dragIndex) && targetX < rowLength * (radius * 3) - radius) {
          shapes[dragIndex].targetX = getX(dragIndex) + radius * 3;
          shapes[dragIndex + 1].targetX = getX(dragIndex);
          swapIndex = dragIndex + 1;
        }

      } else {
        if (targetY < getY(dragIndex) && targetY > baseY) {
          shapes[dragIndex].targetY = getY(dragIndex) - radius * 3;
          shapes[dragIndex - rowLength].targetY = getY(dragIndex);
          swapIndex = dragIndex - rowLength;
        }

        if (targetY > getY(dragIndex) && targetY < rowLength * (radius * 3) - radius) {
          shapes[dragIndex].targetY = getY(dragIndex) + radius * 3;
          shapes[dragIndex + rowLength].targetY = getY(dragIndex);
          swapIndex = dragIndex + rowLength;
        }

      }
    } else {
      swapIndex = dragIndex;
      if (shapes[dragIndex]) {
        shapes[dragIndex].targetX = getX(dragIndex);
        shapes[dragIndex].targetY = getY(dragIndex);
      }
    }// if movement is at least minimum

    drawScreen();
  }

  function mouseUpListener(evt) {
    theCanvas.addEventListener("mousedown", mouseDownListener, false);
    theCanvas.addEventListener("touchstart", touchToMouse, false);
    window.removeEventListener("mouseup", mouseUpListener, false);
    window.removeEventListener("touchend", touchToMouse, false);
    if (dragging) {
      dragging = false;
      window.removeEventListener("mousemove", mouseMoveListener, false);
      window.removeEventListener("touchmove", touchToMouse, false);
    }

    if (swapIndex !== -1 && dragIndex !== -1 && swapIndex != dragIndex) {
      Debugger.log("Swap", swapIndex, "Drag", dragIndex);
      swapShapes(swapIndex, dragIndex);
      if (!check_for_matches(true)) {
        swapShapes(swapIndex, dragIndex);
        failed = true;
        check_for_moves();
        score -= 100;
        playSound("sound/bad_move.wav");
        if (score < 0) {
          game_over(score, numColors);
        }
        Debugger.log("Can't swap those, no match!");
      }

    }
    swapIndex = -1;
    dragIndex = -1;
  }

  function swapShapes(i, j) {
    var tempShape;
    tempShape = copy(shapes[swapIndex]);
    shapes[i] = shapes[j];
    shapes[j] = tempShape;
    playSound("sound/thunk.wav");
  }

  function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
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
      //if (dragging) {
      shapes[i].x = shapes[i].x + easeAmount * (shapes[i].targetX - shapes[i].x);
      shapes[i].y = shapes[i].y + easeAmount * (shapes[i].targetY - shapes[i].y);
      //}
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
    rad = shapes[i].rad + radius / 3;
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
    var sides = shapes[i].suit % 2 ? shapes[i].suit + 2 : (numColors - shapes[i].suit) + 4
    //context.arc(x, y, rad, 0, 2 * Math.PI, false);
    context.moveTo(x + rad, y);
    for (var vertex = 1; vertex < sides; vertex += 1) {
      context.lineTo(x + rad * Math.cos(vertex * 2 * Math.PI / sides), y + rad * Math.sin(vertex * 2 * Math.PI / sides));
    }
    context.closePath();
    context.fill();
    context.font = "400 " + rad + "px sans-serif";
    // + "'Caesar Dressing'";
    context.fillStyle = "black";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(shapes[i].rank, shapes[i].x, shapes[i].y);

  }

  function drawScreen() {
    //bg
    context.fillStyle = bgColor;
    context.fillRect(0, 0, theCanvas.width, theCanvas.height);
    drawShapes();
    drawScore(score);
  }

  function drawScore(score) {
    context.font = "400 " + theCanvas.width / 15 + "px 'Caesar Dressing'";
    context.fillStyle = "black";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("Score " + score, radius, theCanvas.height - radius);
    if (valid_moves) {
      context.fillText("C: " + numColors + " R: " + valid_moves.rank + " S: " + valid_moves.suit, theCanvas.width / 2, theCanvas.height - radius);
    }
  }

  function canvas_fit() {
    var winW = 630, winH = 460;
    if (document.body && document.body.offsetWidth) {
      winW = document.body.offsetWidth;
      winH = document.body.offsetHeight;
    }
    if (document.compatMode == 'CSS1Compat' && document.documentElement && document.documentElement.offsetWidth) {
      winW = document.documentElement.offsetWidth;
      winH = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight) {
      winW = window.innerWidth;
      winH = window.innerHeight;
    }
    theCanvas.style.display = "inline-block";
    theCanvas.height = theCanvas.width = Math.min(winW, winH - 150);
    var canvasW = theCanvas.width;
    var canvasH = theCanvas.height;

    if (shapes) {
      radius = getRadius();
      baseX = baseY = radius * 2;
      shapes.forEach(function(s) {
        s.rad = getRadius();
      });
      repositionShapes();
    }
  }


  window.onresize = function() {
    canvas_fit();
    drawScreen();
  };

  function check_for_moves() {
    var index, i, j, k, type, types, scored = false, shape1, shape2, shape3;
    var topLeft, topMid, topRight, topFarRight, midLeft, midMid, midRight, botLeft, botMid, botRight
    types = ["rank", "suit"];
    valid_moves = {
      rank : 0,
      suit : 0
    };
    Debugger.log("checking for moves...");
    for ( i = 0; i < rowLength; i++) {
      for ( j = 0; j < rowLength; j++) {
        for (k in types) {
          type = types[k];
          index = i + j * rowLength;
          topLeft = index;
          topMid = index + 1;
          topRight = index + 2;
          topFarRight = index + 3;
          midLeft = topLeft + rowLength;
          midMid = topMid + rowLength;
          midRight = topRight + rowLength;
          botLeft = midLeft + rowLength;
          botMid = midMid + rowLength;
          botRight = midRight + rowLength;
          farBotLeft = botLeft + rowLength;
          farBotMid = botMid + rowLength;
          farBotRight = botRight + rowLength;
          if (i < rowLength - 3) {
            // Check horizontal
            // XX_X
            check_move(shapes[topLeft], shapes[topMid], shapes[topFarRight], type);
            // X_XX
            check_move(shapes[topLeft], shapes[topRight], shapes[topFarRight], type);
          }

          if (i < rowLength - 2 && j < rowLength - 1) {
            // _XX
            // X__
            check_move(shapes[midLeft], shapes[topMid], shapes[topRight], type);
            // X_X
            // _X_
            check_move(shapes[topLeft], shapes[midMid], shapes[topRight], type);
            // XX_
            // __X
            check_move(shapes[topLeft], shapes[topMid], shapes[midRight], type);
            // X__
            // _XX
            check_move(shapes[topLeft], shapes[midMid], shapes[midRight], type);
            // _X_
            // X_X
            check_move(shapes[midLeft], shapes[topMid], shapes[midRight], type);
            // __X
            // XX_
            check_move(shapes[midLeft], shapes[midMid], shapes[topRight], type);

          }// end If there's space to check horizontal

          if (j < rowLength - 3) {
            // Check vertical
            // X
            // X
            // _
            // X
            check_move(shapes[topLeft], shapes[midLeft], shapes[farBotLeft], type);
            // X
            // _
            // X
            // X
            check_move(shapes[topLeft], shapes[botLeft], shapes[farBotLeft], type);
          }
          if (j < rowLength - 2 && i < rowLength - 1) {
            // _X
            // X_
            // X_
            check_move(shapes[topMid], shapes[midLeft], shapes[botLeft], type);
            // X_
            // _X
            // X_
            check_move(shapes[topLeft], shapes[midMid], shapes[botLeft], type);
            // X_
            // X_
            // _X
            check_move(shapes[topLeft], shapes[midLeft], shapes[botMid], type);
            // X_
            // _X
            // _X
            check_move(shapes[topLeft], shapes[midMid], shapes[botMid], type);
            // _X
            // X_
            // _X
            check_move(shapes[topMid], shapes[midLeft], shapes[botMid], type);
            // _X
            // _X
            // X_
            check_move(shapes[topMid], shapes[midMid], shapes[botMid], type);
          }
        } // endIf there's space to check vertical
      } // k in types
    } // j in length

  }// i in length

  if (valid_moves.rank <= 0 && valid_moves.suit <= 0) {
    game_over(score, numColors);
  }
}

function check_move(shape1, shape2, shape3, type) {
  if (shape1[type] && shape2[type] && shape3[type]) {
    if (shape1[type] === shape2[type] && shape2[type] === shape3[type]) {
      valid_moves[type] += 1;
      if (failed) {
        shape1.gradColor1 = "black";
        shape2.gradColor1 = "black";
        shape3.gradColor1 = "black";
        failed = false;
      }
    }
  }
}

function check_match(shape1, shape2, shape3, type) {
  if (shape1[type] && shape2[type] && shape3[type]) {
    if (shape1[type] === shape2[type] && shape2[type] === shape3[type]) {
      shape1.marked += 1;
      shape2.marked += 1;
      shape3.marked += 1;
    }
  }
}

function check_for_matches(in_game) {
  var index, i, j, k, type, types, scored = false, shape1, shape2, shape3;
  paused = true;
  types = ["rank", "suit"];
  Debugger.log("marking...");
  for ( i = 0; i < rowLength; i++) {
    for ( j = 0; j < rowLength; j++) {
      for (k in types) {
        type = types[k];
        index = i + j * rowLength;
        if (i < rowLength - 2) {
          // Check horizontal
          check_match(shapes[index], shapes[index + 1], shapes[index + 2], type);
        }// If there's space to check horizontal
        if (j < rowLength - 2) {
          // Check vertical
          check_match(shapes[index], shapes[index + rowLength], shapes[index + rowLength * 2], type);
        } // If there's space to check vertical
      } // k in types
    } // j in length
  }// i in length

  Debugger.log("scoring...");
  for ( i = 0; i < shapes.length; i++) {
    if (shapes[i].marked > 0) {
      shapes[i].gradColor1 = "white";
      //shapes[i].gradColor2 = "black";
      scored = true;
      if (in_game) {
        score += shapes[i].marked ^ 2;
      }
    } else {
      var grad = getGrad(shapes[i].suit);
      shapes[i].gradColor1 = grad[0];
      shapes[i].gradColor2 = grad[1];
    }
  }

  drawScreen();

  numColors = Math.floor(score / 100 + 4);

  if (scored) {
    if (in_game) {
      playSound("sound/destruct.wav");
      Debugger.log("setting timer...");
    }
    var timeout = in_game ? 300 : 0;
    setTimeout(function() {
      recheck_matches(in_game);
    }, timeout);
    return true;
  } else {
    Debugger.log("unpausing...");
    paused = false;
    check_for_moves();
    drawScreen();
    return false;
  }

}// check_for_matches

function recheck_matches(in_game) {
  clear_marked();
  if (in_game)
    playSound("sound/thunk.wav");
  check_for_matches(in_game);

}

function clear_marked() {
  Debugger.log("clearing...");
  var i, j;
  for ( i = numShapes - 1; i >= 0; i--) {
    while (shapes[i].marked) {
      for ( j = i; j >= 0; j -= rowLength) {
        if (shapes[j - rowLength]) {
          shapes[j] = copy(shapes[j - rowLength]);
          shapes[j].y -= radius * 3;
          makeShape(j - rowLength);
        } else {
          makeShape(j);
          shapes[j].y -= radius * 3;
        }
      }
    }
  }
}

}
