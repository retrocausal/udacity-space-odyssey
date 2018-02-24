/*
 * @class Drawing provides an interface which a game object can plug into
 * Drawing has methods such as hide,reveal which deal with layout
 * Also has methods identify getContext which deal with uniqueness
 * And, can Draw/paint, clip/set/transform images on the canvas
 */
class Drawing {
  /*
   * @constructor constructs a new Drawing object
   * Initializes a new canvas and sets a context handler
   */
  constructor() {
    this.canvas = document.createElement('canvas');
    this.twoDimContext = this.canvas.getContext('2d');
    this.gutter = 0;
  }
  /*
   * @init sets the width, and the height of a new canvas
   * @[selector] Optional and is the reference target element based on
   * which, the dimensions for a canvas element are determined
   */
  init(selector = 'main') {
    const Container = $(selector);
    const Width = Container.width();
    const Height = Container.height();
    this.canvas.width = Width;
    this.canvas.height = Height;
    this.parent = Container;
    return this;
  }
  selfAttach() {
    this.parent.append(this.canvas);
    return this;
  }
  getContext() {
    return this.twoDimContext;
  }
  identify(id) {
    this.canvas.setAttribute('id', id);
    return this;
  }
  hide() {
    $(this.canvas)
      .hide();
    return this;
  }
  reveal() {
    $(this.canvas)
      .show(1000);
    return this;
  }
  clear() {
    this.canvas.width = this.canvas.width;
    return this;
  }
  clipBackground() {
    return this.canvas.toDataURL();
  }
  /*
   * @defineCanvas defines the bounds and orientation of a canvas element
   * @[canvasElement] Optional argument. needs to have a readable dimension
   */
  defineCanvas(canvasElement) {
    const canvas = canvasElement || this.canvas;
    //Determine If the game is on a smaller/larger screen
    const axis = (canvas.height > canvas.width) ? "vertical" : "horizontal";
    const vmax = (axis == "vertical") ? canvas.height : canvas.width;
    const vmin = (axis == "vertical") ? canvas.width : canvas.height;
    const gutter = Math.ceil(0.05 * vmax);
    const definition = {
      axis,
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
    this.canvasDefinition = this.defineCanvas();
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = this.canvas.height;
      canvas.width = this.canvas.width;
      // If the canvas needs to be painted using n rows of a column
      if (single_column.length > 1) {
        //Initialize pen
        let xPos = 0,
          yPos = 0;
        const maxRowSide = Math.ceil(this.canvasDefinition.vmin / single_column.length);
        //Loop over rows, draw columns
        for (const cell of single_column) {
          const width = cell.width;
          const height = cell.height;
          //Determine how many columns make a row complete
          const colDivisor = (this.canvasDefinition.axis === "vertical") ? height : width;
          const maxCols = Math.floor(this.canvasDefinition.vmax / colDivisor);
          for (let i = 0; i <= maxCols; i++) {
            /* If on a smaller screen, for the same xPos, yPos
             * changes per column. If on a larger screen, for the
             * same yPos,xPos changes per column
             */
            yPos = (this.canvasDefinition.axis === "vertical") ? height * i : yPos;
            xPos = (this.canvasDefinition.axis === "vertical") ? xPos : width * i;
            //drawImage
            context.drawImage(cell, xPos, yPos);
          }
          /*reset row start points per row.Each row should start at Zero on the current axis(see above)
           * for example, each row on a larger screen would start at (0,height of the first row)
           * whereas each row on a smaller screen would begin at (width of the first row,0)
           */
          yPos = (this.canvasDefinition.axis === "vertical") ? 0 : yPos + maxRowSide;
          xPos = (this.canvasDefinition.axis === "vertical") ? xPos + maxRowSide : 0;
        }
      } else {
        // If a single asset is to fill the canvas
        context.drawImage(single_column[0], 0, 0, canvas.width, canvas.height);
      }
      //Begin resolve to keep this promise of returning a sprite,constructed from a single column of images
      //First off, capture a snapshot of the constructed sprite
      const iDataURI = canvas.toDataURL();
      //create an image to store the sprite on canvas
      const bgImage = new Image();
      /*
       * On image load, resize the sprite to a quarter of the canvas.
       * This is done, to decrease the amount of memory used per sprite use
       * The resolved sprite, can be scaled up when necessary to any dimensions
       */
      bgImage.onload = () => {
        canvas.width = bgImage.width * .25;
        canvas.height = bgImage.height * .25;
        context.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      // begin image load.
      bgImage.src = iDataURI;
    });
  }

  /*
   * @initScrollable configures an object to be used for animations
   * @param image is MANDATORY, and is the configurator. The dimensions of this image
   * in tandem with canvas axis and dimensions, help determine
   * how many images are needed along the canvas orientation(axial dimension),
   * and determine what is the axial dimension
   * @[definition] is Optional and is an object of bounds of a canvas to use for scroll
   * NOTE needs to be called before scroll animations on a mandate
   */
  initScrollable(image, definiton) {
    const canvasDefinition = definiton || this.canvasDefinition;
    const width = image.width;
    const height = image.height;
    const unitAxialDimension = (canvasDefinition.axis === "vertical") ? height : width;
    const minImages = Math.ceil(canvasDefinition.vmax / unitAxialDimension) + 1;
    const axialDimension = Math.ceil(canvasDefinition.vmax);
    const name = "scroll";
    /* The animation, should progress along the canvas axis
     * should be just fast enough to be visualized accurately, and smoothly
     * NOTE this be speed per second, NOT speed per frame
     */
    const speed = Math.ceil((0.05 * axialDimension));
    return ({
      name,
      image,
      unitAxialDimension,
      axialDimension,
      speed,
      minImages
    });
  }
  /*
   * @scroll animates the current/requested canvas to a scrolling element using an animation config per frame
   * @param animation is MANDATORY, and is the configurator for animations per frame.
   */
  scroll(animation) {
    const canvas = animation.hologram.canvas || this.canvas;
    const context = animation.hologram.context || this.twoDimContext;
    const canvasDefinition = animation.canvasDefinition || this.canvasDefinition;
    /* Save the current canvas before animation
     * If not done, each translate on the canvas,
     * Moves the canvas by n pixels in either direction
     * depending on the orientation. At some point,
     * a translate call on the canvas, would move coordinates
     * (0,0), out of bounds of the wrapper element for the canvas
     * saving and restoring, restores (0,0) to its original place
     * on the layout prior to THIS FRAME's translate
     */
    //canvas.width = canvas.width;
    context.save();
    // Animate, only if time has passed since the last frame
    if (animation.dt > 0) {
      /* calculate the translation.
       * If the speed configured is 1 pixel per second,
       * the time elapsed since the animation began is 10 seconds,
       *
          THEN,
       *
       * distance covered  = (speed per second as in configurator) * number-of-seconds
       * that gives us, 10 seconds * 1 pixel per second = 10 pixels.
       */
      const distance = (animation.dt * animation.speed);
      /*
       * Great ! we reiterated that distance = speed * time.
       * Assuming the canvas height is 300 pixels,
       * the height of the  background image is the unitAxialDimension because orientation is vertical,
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
       */
      const translate = distance % animation.unitAxialDimension;
      // If orientation vertical, translate background along Y
      //Else, tranlate background along X
      const translation = (canvasDefinition.axis === "vertical") ?
        context.translate(0, -translate) :
        context.translate(-translate, 0);
      //Begin Drawing Scene
      let x = 0,
        y = 0;
      for (let i = 0; i < animation.minImages; i++) {
        //Move along current orientation
        if (canvasDefinition.axis === "vertical") {
          y = Math.floor((i * animation.unitAxialDimension));
        } else {
          x = Math.ceil((i * animation.unitAxialDimension));
        }
        //Draw
        context.drawImage(animation.image, x, y);
      }
    }
    //End Drawing Scene
    //restore canvas state to before animation
    context.restore();
  }
}
/*
 *Class SpaceTimeContinuum is an independant Canvas, and a descendant of Drawing
 *Used to construct an illustration of animated space
 */
class SpaceTimeContinuum extends Drawing {
  constructor() {
    super();
  }
  /*
   *@initScrollableSpace initializes a reference object for scrollable space illustrations
   *@param image is MANDATORY, and helps build a Hologram canvas element
   *This hologram, is then projected onto a bigger canvas
   */
  initScrollableSpace(image) {
    //Construct hologram at image bounds
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    //Define hologram bounds and gather orientation
    const canvasDefinition = this.defineCanvas(canvas);
    //Define a scale for upscaling onto the game canvas
    const xFactor = this.canvas.width / canvas.width;
    const yFactor = this.canvas.height / canvas.height;
    //Define an animation helper object
    const animationReference = this.initScrollable(image, canvasDefinition);
    //Add hologram, scale
    animationReference.canvasDefinition = canvasDefinition;
    animationReference.hologram = {
      canvas,
      context
    };
    animationReference.scale = {
      xFactor,
      yFactor
    }
    return animationReference;
  }
  /*
   *@requestAnimationFrame requests A particular animation from SUPER
   *This method is called once per frame
   *@param animationReference is MANDATORY, and has the name of the aniamtion to call
   */
  requestAnimationFrame(animationReference) {
    return this[animationReference.name](animationReference);
  }
  /*
   *@scroll scrolls a hologram and then projects an upscaled hologram onto the game canvas
   *@param animationReference os MANDATORY and helps super scroll animation methods
   *animate the hologram
   */
  scroll(animationReference) {
    //gather hologram,scale
    const hologram = animationReference.hologram;
    const scale = animationReference.scale;
    //scroll the hologram
    super.scroll(animationReference);
    //begin projection onto the game canvas
    this.clear();
    this.twoDimContext.save();
    this.twoDimContext.scale(scale.xFactor, scale.yFactor);
    this.twoDimContext.drawImage(
      hologram.canvas,
      0, 0
    );
    //end projection
    this.twoDimContext.restore();
  }
}