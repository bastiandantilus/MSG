/**
 * @author Scott Robert Lawrence
 */


function canvas_fit() {
  var canvas = document.getElementById("mainCanvas");

  canvas.height = canvas.width = Math.min(document.width, document.height-100);
  var canvasW = canvas.width;
  var canvasH = canvas.height;

  if (canvas.getContext) {
    var ctx = canvas.getContext("2d");
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#CCFFCC";
    ctx.fill();
    //setup();
    //setInterval(run, 33);
  }
}