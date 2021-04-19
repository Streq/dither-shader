// Import stylesheets
import "./style.css";
import DitherShader from "./pixel-shader.js";
import vertexShaderSource from "./vertex-shader.js";
import * as Matrices from "./dither-matrices.js";
import * as Palettes from "./dither-palettes.js";
import Utils from "./webgl-utils.js";
const shad = new DitherShader();
shad.threshold = 1;
shad.light = 1;
shad.r_fact = 1;
shad.g_fact = 1;
shad.b_fact = 0.5;
shad.mask.r = 0.5;
shad.mask.g = 0.5;
shad.mask.b = 0.5;

const dom = (() => {
  let get = id => {
    return document.querySelector("[name=app-" + id + "]");
  };
  const paletteText = get("palette-text"),
    matrixText = get("matrix-text"),
    fromUrlButton = get("img-load-from-url"),
    fromUrlField = get("img-url"),
    ditherButton = get("dither"),
    fromUploadButton = get("img-upload"),
    fromPasteText = get("img-paste"),
    paletteSelect = get("palette"),
    matrixSelect = get("matrix"),
    canvasOriginal = get("canvas-original"),
    canvas = get("canvas-result"),
    reader = new FileReader(),
    r_fact = get("r-factor"),
    g_fact = get("g-factor"),
    b_fact = get("b-factor"),
    light = get("light"),
    mask = get("mask"),
    threshold = get("threshold"),
    image = (() => {
      const image = new Image();
      image.crossOrigin = "";
      image.src = "";
      image.onload = () => {
        changeSourcePic(image);
        ditherSourcePic(); //first load also dithers
        image.onload = () => {
          changeSourcePic(image);
        };
      };
      return image;
    })();

  reader.onloadend = () => {
    image.src = reader.result;
  };

  function changeSourcePic(image) {
    canvasOriginal.width = canvas.width = image.width;
    canvasOriginal.height = canvas.height = image.height;
    canvasOriginal.getContext("2d").drawImage(image, 0, 0);
  }

  function ditherSourcePic() {
    shad.palette = getPaletteFromField();
    shad.matrix = getMatrixFromField();
    shad.r_fact = getFromField(r_fact);
    shad.g_fact = getFromField(g_fact);
    shad.b_fact = getFromField(b_fact);
    shad.light = getFromField(light);
    shad.mask = getFromField(mask);
    shad.threshold = getFromField(threshold);
    try {
      fragmentShaderSource = shad.create();
      render(canvasOriginal);
    } catch (e) {
      console.log(e.message);
    }
  }

  function getFromField(field) {
    try {
      let text = field.value;
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function getPaletteFromField() {
    try {
      let text = "[" + dom.paletteText.value + "]";
      return JSON.parse(text);
    } catch (e) {
      return Palettes.gameboy_pocket;
    }
  }

  function getMatrixFromField() {
    try {
      let text = dom.matrixText.value;
      return JSON.parse(text);
    } catch (e) {
      return Matrices._16;
    }
  }

  let ret = {
    paletteText: (e => {
      return e;
    })(paletteText),

    matrixText: (e => {
      return e;
    })(matrixText),

    fromUrlButton: (e => {
      e.onclick = () => {
        image.src = fromUrlField.value;
      };
      return e;
    })(fromUrlButton),

    fromUrlField: (e => {
      return e;
    })(fromUrlField),

    ditherButton: (e => {
      e.onclick = ditherSourcePic;
      return e;
    })(ditherButton),

    fromUploadButton: (e => {
      e.oninput = () => {
        let file = fromUploadButton.files[0];
        reader.readAsDataURL(file);
      };
      return e;
    })(fromUploadButton),

    fromPasteText: (e => {
      e.onpaste = pasteEvent => {
        if (!pasteEvent.clipboardData) {
          return;
        }
        var items = pasteEvent.clipboardData.items;
        if (!items) {
          return;
        }
        for (var i = 0; i < items.length; i++) {
          // Skip content if not image
          if (items[i].type.indexOf("image") == -1) continue;
          // Retrieve image on clipboard as blob
          var blob = items[i].getAsFile();
          reader.readAsDataURL(blob);
        }
      };
      return e;
    })(fromPasteText),

    paletteSelect: (e => {
      e.onchange = () => {
        try {
          let palette = Palettes[e.value];
          let str = JSON.stringify(palette);
          shad.palette = palette;
          paletteText.value = str.substr(1, str.length - 2);
        } catch (e) {}
      };
      return e;
    })(paletteSelect),

    matrixSelect: (e => {
      e.onchange = () => {
        try {
          let matrix = Matrices[e.value];
          let str = JSON.stringify(matrix);
          shad.matrix = matrix;
          matrixText.value = str;
        } catch (e) {}
      };
      return e;
    })(matrixSelect),

    image: image,

    canvas: canvas,
    canvasOriginal: canvasOriginal,

    //functions
    ditherSourcePic: ditherSourcePic,
    changeSourcePic: changeSourcePic
  };

  paletteSelect.onchange();
  matrixSelect.onchange();

  return ret;
})();

let fragmentShaderSource = "";

dom.image.src = (() => {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = 300;
  canvas.height = 400;
  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "#ff0000");
  gradient.addColorStop(1 / 6, "#ffff00");
  gradient.addColorStop(2 / 6, "#00ff00");
  gradient.addColorStop(3 / 6, "#00ffff");
  gradient.addColorStop(4 / 6, "#0000ff");
  gradient.addColorStop(5 / 6, "#ff00ff");
  gradient.addColorStop(6 / 6, "#ff0000");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
})();

function render(image) {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var gl = dom.canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var program = Utils.webglUtils.createProgramFromSources(gl, [
    vertexShaderSource,
    fragmentShaderSource
  ]);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

  // lookup uniforms
  var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  var imageLocation = gl.getUniformLocation(program, "u_image");

  var flipYLocation = gl.getUniformLocation(program, "u_flipY");

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Create a buffer and put a single pixel space rectangle in
  // it (2 triangles)
  var positionBuffer = gl.createBuffer();

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2; // 2 components per iteration
  var type = gl.FLOAT; // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  // provide texture coordinates for the rectangle.
  var texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      1.0
    ]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(texCoordAttributeLocation);
  var size = 2; // 2 components per iteration
  var type = gl.FLOAT; // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    texCoordAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  function createAndSetupTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set up texture so we can render any size image and so we are
    // working with pixels.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
  }

  // Create a texture and put the image in it.
  var originalImageTexture = createAndSetupTexture(gl);

  // Upload the image into the texture.
  var mipLevel = 0; // the largest mip
  var internalFormat = gl.RGBA; // format we want in the texture
  var srcFormat = gl.RGBA; // format of data we are supplying
  var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
  gl.texImage2D(
    gl.TEXTURE_2D,
    mipLevel,
    internalFormat,
    srcFormat,
    srcType,
    image
  );

  // create 2 textures and attach them to framebuffers.
  var textures = [];
  var framebuffers = [];
  for (var ii = 0; ii < 2; ++ii) {
    var texture = createAndSetupTexture(gl);
    textures.push(texture);

    // make the texture the same size as the image
    var mipLevel = 0; // the largest mip
    var internalFormat = gl.RGBA; // format we want in the texture
    var border = 0; // must be 0
    var srcFormat = gl.RGBA; // format of data we are supplying
    var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
    var data = null; // no data = create a blank texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      mipLevel,
      internalFormat,
      image.width,
      image.height,
      border,
      srcFormat,
      srcType,
      data
    );

    // Create a framebuffer
    var fbo = gl.createFramebuffer();
    framebuffers.push(fbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Attach a texture to it.
    var attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      attachmentPoint,
      gl.TEXTURE_2D,
      texture,
      mipLevel
    );
  }

  // Bind the position buffer so gl.bufferData that will be called
  // in setRectangle puts data in the position buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Set a rectangle the same size as the image.
  setRectangle(gl, 0, 0, image.width, image.height);

  // Setup a ui.
  var ui = document.getElementById("ui");

  drawEffects();

  function drawEffects() {
    Utils.webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // start with the original image on unit 0
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(imageLocation, 0);

    // don't y flip images while drawing to the textures
    gl.uniform1f(flipYLocation, 1);

    // finally draw the result to the canvas.
    gl.uniform1f(flipYLocation, -1); // need to y flip for canvas

    setFramebuffer(null, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    draw();
  }

  function setFramebuffer(fbo, width, height) {
    // make this the framebuffer we are rendering to.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    // Tell the shader the resolution of the framebuffer.
    gl.uniform2f(resolutionLocation, width, height);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, width, height);
  }

  function draw() {
    // Draw the rectangle.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    gl.STATIC_DRAW
  );
}
