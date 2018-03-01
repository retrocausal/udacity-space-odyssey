/*
 * @class Drawing initiates, defines, and animates a canvas
 * Is extensible by overrides, and eases DOM level operations
 */
class Drawing {
  /*
   * @constructor constructs a new Drawing object
   * Initializes a new map of canvases,scroallables
   */
  constructor() {
    this.layers = new Map();
    this.scrollables = new Map();
  }
  /*
   *@newLayer initializes a canvas, maps it to an object referencing itself and its context
   *for later retrievals
   *@return canvas element initialized
   */
  newLayer() {
    const canvas = document.createElement('canvas');
    const twoDimContext = canvas.getContext('2d');
    this.layers.set(canvas, {
      canvas,
      twoDimContext
    });
    return canvas;
  }
  /*
   * @init sets the width, and the height of a default layer and defines necessary bounds
   * @[selector] Optional and is the reference target element based on
   * which, the dimensions for the default layer are determined
   */
  init(selector = 'main') {
    const Container = $(selector);
    const Width = Container.width();
    const Height = Container.height();
    const canvas = this.newLayer();
    this.primer = this.layers.get(canvas);
    this.primerContext = this.primer.twoDimContext;
    this.primer.canvas.width = Width;
    this.primer.canvas.height = Height;
    this.parent = Container;
    this.primerDefinition = this.defineCanvas();
    this.animationOn = false;
    return this;
  }
  //DOM ops
  attach(canvas) {
    this.parent.append(canvas || this.primer.canvas);
    return this;
  }
  hide(canvas) {
    $(canvas || this.primer.canvas)
      .hide();
    return this;
  }
  reveal(canvas) {
    $(canvas || this.primer.canvas)
      .show(1000);
    return this;
  }
  identify(id, canvas) {
    (canvas || this.primer.canvas)
    .setAttribute('id', id);
    return this;
  }
  //Canvas getters, setters, helpers
  getContext() {
    return this.primerContext;
  }
  clear(canvas) {
    (canvas || this.primer.canvas)
    .width = (canvas || this.primer.canvas)
      .width;
    return this;
  }
  clipBackground() {
    return this.primer.canvas.toDataURL();
  }
  /*
   * @defineCanvas defines the bounds and orientation of a canvas element
   * @[canvasElement] Optional argument. needs to have a readable dimension
   */
  defineCanvas(canvasElement) {
    const canvas = canvasElement || this.primer.canvas;
    //Determine If the game is on a smaller/larger screen
    const orientation = (canvas.height > canvas.width) ? "portrait" : "landscape";
    const vmax = (orientation === "portrait") ? canvas.height : canvas.width;
    const vmin = (orientation === "portrait") ? canvas.width : canvas.height;
    const gutter = Math.ceil(0.05 * vmax);
    const definition = {
      orientation,
      vmax,
      vmin,
      gutter
    };
    return definition;
  }
  /*
   * @constructScene constructs the canvas' scene as a sprite. Also resolves to
   * the constructed sprite.This sprite can be used for various transformations / complex animations
   * @single_column is MANDATORY and can either be an indexed list of rows using which
   * a sprite is constructed or, a single image which will be the sprite
   */
  constructScene(single_column) {
    //clean slate
    this.clear();
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = this.primer.canvas.height;
      canvas.width = this.primer.canvas.width;
      // If the canvas needs to be painted using n rows of a column
      if (single_column.length > 1) {
        //Initialize pen
        let xPos = 0,
          yPos = 0;
        const maxRowSide = Math.ceil(this.primerDefinition.vmin / single_column.length);
        //Loop over rows, draw columns
        for (const cell of single_column) {
          const width = cell.width;
          const height = cell.height;
          //Determine how many columns make a row complete
          const colDivisor = (this.primerDefinition.orientation === "portrait") ? height : width;
          const maxCols = Math.floor(this.primerDefinition.vmax / colDivisor);
          for (let i = 0; i <= maxCols; i++) {
            /* If on a smaller screen, for the same xPos, yPos
             * changes per column. If on a larger screen, for the
             * same yPos,xPos changes per column
             */
            yPos = (this.primerDefinition.orientation === "portrait") ? height * i : yPos;
            xPos = (this.primerDefinition.orientation === "portrait") ? xPos : width * i;
            //drawImage
            context.drawImage(cell, xPos, yPos);
          }
          /*reset row start points per row.Each row should start at Zero on the current axis(see above)
           * for example, each row on a larger screen would start at (0,height of the first row)
           * whereas each row on a smaller screen would begin at (width of the first row,0)
           */
          yPos = (this.primerDefinition.orientation === "portrait") ? 0 : yPos + maxRowSide;
          xPos = (this.primerDefinition.orientation === "portrait") ? xPos + maxRowSide : 0;
        }
      } else {
        // If a single asset is to fill the canvas
        context.drawImage(single_column[0], 0, 0, canvas.width, canvas.height);
      }

      //First off, capture a snapshot of the constructed sprite
      const iDataURI = canvas.toDataURL('image/webp');
      //create an image to store the sprite on canvas
      const bgImage = new Image();
      /*
       * On image load, Aggressively resize the sprite to a quarter of the canvas.
       * This is done, to decrease the amount of memory used per sprite use
       * The resolved sprite, can be scaled up when necessary to any dimensions
       */
      bgImage.onload = () => {
        ////Begin resolve
        //Resize and downscale the sprite to save memory. Animations/ Renderers MUST MANDATORILY upscale later
        canvas.width = bgImage.width * .15;
        canvas.height = bgImage.height * .15;
        context.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      // begin image load.
      bgImage.src = iDataURI;
    });
  }

  /*
   * @initScrollableFrame builds a map of scrollable frames { meta(n) => frame(n) }
   * @param sprite is MANDATORY, and is the configurator for the meta to be constructed
   * @[definition] is Optional and is an object of bounds of a canvas to use for scroll
   * @return constructed frame identifier : meta
   * NOTE needs to be called before scroll animations on a mandate
   */
  initScrollableFrame(sprite, definiton) {
    const canvasDefinition = definiton || this.primerDefinition;
    const width = Math.floor(sprite.width);
    const height = Math.floor(sprite.height);
    const unitSideAlongOrientation = (canvasDefinition.orientation === "portrait") ? height : width;
    const orientationSide = (canvasDefinition.vmax);
    const spritesNecessary = Math.ceil(orientationSide / unitSideAlongOrientation) + 1;
    const animation = "scroll";
    /* The animation, should progress along the canvas axis
     * should be just fast enough to be visualized accurately, and smoothly
     * NOTE this be speed per second, NOT speed per frame
     */
    const speed = Math.ceil((0.05 * orientationSide));
    //init time
    const time = {
      delta: 0,
      interval: 0
    };
    /* Build a Map of frame-meta-info to frame
     * the frame right now, consists of skeletal info, which can be overridden/used
     * The frame later, NEEDS to have a renderer object defined
     * this renderer, specifies the canvas to scroll the frame on, and transforms if any
     */
    const meta = {
      animation,
      unitSideAlongOrientation,
      orientationSide,
      speed,
      spritesNecessary,
      axis: canvasDefinition.axis,
      vmax: canvasDefinition.vmax,
      vmin: canvasDefinition.vmin,
      gutter: canvasDefinition.gutter,
      time
    };
    const frame = {
      sprite
    };
    //scrollables is an object level map! with possibly many scrollable frames stored
    this.scrollables.set(meta, frame);
    return meta;
  }
  /*
   * @scroll animates the current/requested canvas to a scrolling element using an animation config per frame
   * @param frameMeta is MANDATORY, and is the configurator for animations per frame.
   */
  scroll(frameMeta) {
    //Make a list of frame/frame metadata to be used per frame render
    const meta = frameMeta;
    const frame = this.scrollables.get(meta);
    //rendered MUST define a canvas,context and optionally, applicable transforms
    const renderer = frame.renderer;
    const context = renderer.context;
    const scrollContent = frame.sprite;
    /* Save the current canvas before animation
     * If not done, each translate on the canvas,
     * Moves the canvas by n pixels in either direction
     * depending on the orientation. At some point,
     * a translate call on the canvas, would move coordinates
     * (0,0), out of bounds of the wrapper element for the canvas
     * saving and restoring, restores (0,0) to its original place
     * on the layout prior to THIS FRAME's translate
     */
    context.save();
    // Animate, only if time has passed since the last frame or, since animation began
    if (meta.time.delta > 0) {
      /* calculate the translation.
       * If the speed configured is 1 pixel per second,
       * the time elapsed since the animation began is 10 seconds,
       *
          THEN,
       *
       * distance covered  = (speed per second as in configurator) * number-of-seconds
       * that gives us, 10 seconds * 1 pixel per second = 10 pixels.
       */
      const distance = (meta.time.delta * meta.speed);
      /*
       * Great ! we reiterated that distance = speed * time.
       * Assuming the canvas height is 300 pixels,
       * the height of the  background image is the unitSideAlongOrientation because orientation is vertical,
       * and the background image is standing at a 100 pixels high
       * translating the canvas by 10 pixels on the Y axis, means,
       * the rendering of the background image begins at (0,10)
       * the background image being 100 pixels high, would imply,
       * the image is painted (0,10) through (0,110)
       * the canvas is 300 pixels high, so, the number of background images to fill the canvas height,
       * would be a minimum of 2 and a maximum of 3
       * So, the subsequent iterations paint the second image (0,110) through (0,210) and the third(0,210) through (0,300)
       */

      /*
       * All of the above, sounds wonderful!
       * What if, the time since we started the animation, is 3,60,000 seconds?
       * distance = speed*time heh? = (3,60,000*1) = 3,60,000 pixels!!!!
       * Obviously, we can not paint that background beginning at (0,3,60,000) on a 300 pixel high canvas!
       * So what now?
       * We (Modulo divide) the distance, by the axial side dimension of the canvas.
       * That way, The translation IMPORTANTLY, NEVER outgrows the canvas dimensions,
       * But rather loops between 0 -  canvas dimensions
       * NOTE If however, we choose the above end points to loop over, the next frame begins anywhere
       * between 0 and the canvas axial side
       * We want it to begin immediately after the current frame.Hence, choose to loop between 0 and the width/Height
       * of the composing image/sprite
       */
      const translate = distance % (meta.unitSideAlongOrientation);
      // If orientation vertical, translate background along Y
      //Else, tranlate background along X
      const translation = (meta.orientation === "portrait") ?
        context.translate(0, -translate) :
        context.translate(-translate, 0);
      //Begin Drawing Scene
      let x = 0,
        y = 0;
      for (let i = 0; i < meta.spritesNecessary; i++) {
        //Move along current orientation
        const next = Math.ceil(i * meta.unitSideAlongOrientation);
        if (meta.orientation === "portrait") {
          y = next;
        } else {
          x = next;
        }
        //Draw
        context.drawImage(
          scrollContent,
          x, y
        );
      }
    }
    //End Drawing Scene
    //restore canvas state to before animation
    context.restore();
    return this;
  }
}
/*
 *Class SpaceTimeContinuum is an independant Canvas, and a descendant of Drawing
 *Used to construct an illustration of animated space, and to draw its inhabitants too!
 */
class SpaceTimeContinuum extends Drawing {
  constructor() {
    super();
    this.overlay = this.newLayer();
  }
  /*
   *@initScrollableSpace initiates and finishes building the frame meta data
   *This meta data, is to be used to request a frame from the set of animatable frames
   *@param sprite is MANDATORY, and helps build a Hologram canvas element
   *This hologram, can then be projected onto a bigger canvas
   *@return animation name
   */
  initScrollableSpace(sprite) {
    //Construct hologram at image bounds
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const context = canvas.getContext('2d');
    //Define hologram bounds and gather orientation
    const canvasDefinition = this.defineCanvas(canvas);
    //Define a frame of animation
    const hologram = this.initScrollableFrame(sprite, canvasDefinition);
    //Define a scale for upscaling the frame rendered, onto the larger canvas
    const xFactor = this.primer.canvas.width / canvas.width;
    const yFactor = this.primer.canvas.height / canvas.height;
    const scale = {
      xFactor,
      yFactor
    };
    //define space
    //This, is the bit used to render the background animation via a super.scroll call
    const space = {
      canvas,
      context,
      scale
    };
    // add space
    const frame = this.scrollables.get(hologram);
    frame.renderer = space;
    this.hologram = hologram;
    return hologram.animation;
  }
  /*
   *@requestAnimationFrame requests A particular animation
   *This method is called once per frame. Can be used to batch / throttle animations
   *@param time is MANDATORY, and has to be the delta of now, and time when animation began
   *@param animation is Mandatory, and should name the animation to process
   */
  requestAnimationFrame(animation, time) {
    return this[animation](time);
  }
  /*
   *@scroll scrolls a hologram and then projects an upscaled hologram onto the game canvas
   *@param time is MANDATORY and helps super scroll our hologram in time so
   *We have Sapcetime!
   */
  scroll(time) {
    //set canvas busy
    this.animationOn = this.hologram;
    this.hologram.time.delta = time;
    //gather hologram
    const hologram = this.scrollables.get(this.hologram);
    //scroll the hologram
    super.scroll(this.hologram);
    //begin projection onto the game canvas
    this.clear();
    this.primerContext.save();
    this.primerContext.scale(hologram.renderer.scale.xFactor, hologram.renderer.scale.yFactor);
    this.primerContext.drawImage(
      hologram.renderer.canvas,
      0, 0
    );
    //end projection
    this.primerContext.restore();
  }
}