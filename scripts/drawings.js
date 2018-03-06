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
		this.layers = Drawing._layers;
	}
	static set _layers(map) {
		return (this.layers) ? false : (this.layers = map);
	}
	static get _layers() {
		return this.layers;
	}
	static set _bounds(bounds) {
		return this.bounds = bounds;
	}
	static get _bounds() {
		return this.bounds;
	}
	static set _QEM(map) {
		return (this.QEM) ? false : (this.QEM = map);
	}
	static get _QEM() {
		return this.QEM;
	}
	/*
	 *@newLayer initializes a canvas to a set of dimensions,defines it
	 *@return canvas element initialized
	 */
	newLayer(width, height) {
		const canvas = document.createElement('canvas');
		const twoDimContext = canvas.getContext('2d');
		canvas.width = width;
		canvas.height = height;
		const definition = this.defineCanvas(canvas);
		this.attach(canvas);
		return {
			canvas,
			twoDimContext,
			definition
		};
	}
	/*
	 *@getPrimer returns a previously set primary layer if any
	 */
	getPrimer() {
		return this.layers.get(document.querySelector('#primer')) || false;
	}
	/*
	 *@setPrimer maps a new canvas on the DOM to its definiton, and identifies it as the primary layer
	 */
	setPrimer() {
		const layer = this.newLayer(...this.getParentDimensions());
		this.identify('primer', layer.canvas);
		this.layers.set(layer.canvas, layer);
		return layer;
	}
	/*
	 *@getParentDimensions returns the width and height of the containing element
	 */
	getParentDimensions() {
		const Width = this.parent.width();
		const Height = this.parent.height();
		return [Width, Height];
	}

	/*
	 *@getComposite returns a previously set composite layer if any
	 */
	getComposite() {
		return this.layers.get(document.querySelector('#composite')) || false;
	}
	/*
	 *@setComposite maps a canvas on the DOM to its definiton, and identifies it as the compositing layer
	 */
	setComposite() {
		const layer = this.newLayer(...this.getParentDimensions());
		this.identify('composite', layer.canvas);
		this.layers.set(layer.canvas, layer);
		return layer;
	}
	/*
	 *@setCustomComposite maps a canvas on the DOM to its definiton, and identifies it as the compositing layer
	 */
	setCustomComposite(identity) {
		const id = identity || 'new-custom-composite';
		const layer = this.newLayer(...this.getParentDimensions());
		this.identify(id, layer.canvas);
		layer.canvas.classList.add('composite');
		this.layers.set(layer.canvas, layer);
		return layer;
	}
	/*
	 * @init sets a parent container, the primary layer if not defined, and some initializations
	 * @[selector] Optional and is the reference target element based on
	 * which, the dimensions for the default layer are determined
	 */
	init(selector = 'main') {
		this.parent = $(selector);
		this.animatables = new Map();
		this.primer = this.getPrimer() || this.setPrimer(this.parent);
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
		return this.primer.twoDimContext;
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
		return new Promise((resolve, reject) => {
			const primer = this.primer.definition;
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			canvas.height = this.primer.canvas.height;
			canvas.width = this.primer.canvas.width;
			// If the canvas needs to be painted using n rows of a column
			if (single_column.length > 1) {
				//Initialize pen
				let xPos = 0,
					yPos = 0;
				const maxRowSide = Math.ceil(primer.vmin / single_column.length);
				//Loop over rows, draw columns
				for (const cell of single_column) {
					const width = cell.width;
					const height = cell.height;
					//Determine how many columns make a row complete
					const colDivisor = (primer.orientation === "portrait") ? height : width;
					const maxCols = Math.floor(primer.vmax / colDivisor);
					for (let i = 0; i <= maxCols; i++) {
						/* If on a smaller screen, for the same xPos, yPos
						 * changes per column. If on a larger screen, for the
						 * same yPos,xPos changes per column
						 */
						yPos = (primer.orientation === "portrait") ? height * i : yPos;
						xPos = (primer.orientation === "portrait") ? xPos : width * i;
						//drawImage
						context.drawImage(cell, xPos, yPos);
					}
					/*reset row start points per row.Each row should start at Zero on the current axis(see above)
					 * for example, each row on a larger screen would start at (0,height of the first row)
					 * whereas each row on a smaller screen would begin at (width of the first row,0)
					 */
					yPos = (primer.orientation === "portrait") ? 0 : yPos + maxRowSide;
					xPos = (primer.orientation === "portrait") ? xPos + maxRowSide : 0;
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
	 * @initAnimatableFrame builds an animatable frame, by initializing a skeletal frame meta object
	 * @param sprite is MANDATORY and should be an image with a dimension
	 * @[definition] is Optional, and should define a reference layer
	 * @return constructed frame identifier : meta
	 * NOTE needs to be called before any animation on a mandate
	 */
	initAnimatableFrame(sprite, definiton) {
		const canvasDefinition = definiton || this.layers.get(this.primer);
		const width = Math.floor(sprite.width);
		const height = Math.floor(sprite.height);
		const unitLength = (canvasDefinition.orientation === "portrait") ? height : width;
		const orientationLength = (canvasDefinition.vmax);
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
			unitLength,
			orientationLength,
			orientation: canvasDefinition.orientation,
			vmax: canvasDefinition.vmax,
			vmin: canvasDefinition.vmin,
			gutter: canvasDefinition.gutter,
			time
		};
		const frame = {
			sprite
		};
		//scrollables is an object level map! with possibly many scrollable frames stored
		this.animatables.set(meta, frame);
		return meta;
	}
	/*
	 * @scroll animates the current/requested canvas to a scrolling element using an animation config per frame
	 * @param frameMeta is MANDATORY, and is the configurator for animations per frame.
	 */
	scroll(frameMeta) {
		//Make a list of frame/frame metadata to be used per frame render
		const meta = frameMeta;
		const frame = this.animatables.get(meta);
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
			 * the height of the  background image is the unitLength because orientation is vertical,
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
			const translate = distance % (meta.unitLength);
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
				const next = Math.ceil(i * meta.unitLength);
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

	project(hologram) {
		//begin projection onto the game canvas
		this.clear();
		this.primer.twoDimContext.save();
		this.primer.twoDimContext.scale(hologram.renderer.scale.xFactor, hologram.renderer.scale.yFactor);
		this.primer.twoDimContext.drawImage(
			hologram.renderer.canvas,
			0, 0
		);
		//end projection
		this.primer.twoDimContext.restore();
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
	}
	/*
	 *@initAnimatableHologram,builds a generic animatable frame, and also, the canvas to render the frame on
	 @return an array of the built animatable frame, and its rendering context/canvas
	 *NOTE this renderer, MUST define a scale to upscale to a larger canvas
	 */
	initAnimatableHologram(sprite) {
		//Construct hologram at image bounds
		const canvas = document.createElement('canvas');
		canvas.width = sprite.width;
		canvas.height = sprite.height;
		const context = canvas.getContext('2d');
		//Define hologram bounds and gather orientation
		const hologramDefinition = this.defineCanvas(canvas);
		//Define a frame of animatable hologram
		const hologram = this.initAnimatableFrame(sprite, hologramDefinition);
		//Define a scale for upscaling the frame rendered, onto the larger canvas
		const xFactor = this.primer.canvas.width / canvas.width;
		const yFactor = this.primer.canvas.height / canvas.height;
		const scale = {
			xFactor,
			yFactor
		};
		//define renderer
		//This, is the bit used to render the background animation via a super.<animataion-name> call
		const renderer = {
			canvas,
			context,
			scale
		};
		return [hologram, renderer];
	}
	/*
	 *@initScrollableHologram defines a frame on a hologram, and defines the hologram's rendering canvas
	 *After defining the above, it converts, a generic animatable frame, into a scroll animatable frame
	 *@return animation name
	 */
	initScrollableHologram(sprite) {
		const [holographicFrame, holographicRenderer] = this.initAnimatableHologram(sprite);
		const animation = "scroll";
		const spritesNecessary = Math.ceil(holographicFrame.orientationLength / holographicFrame.unitLength) + 1;
		/* The animation, should progress along the canvas axis
		 * should be just fast enough to be visualized accurately, and smoothly
		 * NOTE this be speed per second, NOT speed per frame
		 */
		const speed = Math.ceil((0.05 * holographicFrame.orientationLength));
		//convert animatable frame of the hologram to a scroll animatable frame of the hologram
		//by adding scrollable properties
		holographicFrame.animation = animation;
		holographicFrame.speed = speed;
		holographicFrame.spritesNecessary = spritesNecessary;
		//define the canvas used to render the hologram
		const canvas = this.animatables.get(holographicFrame);
		canvas.renderer = holographicRenderer;
		//save scrollable frame
		this.scrollableHologram = holographicFrame;
		return animation;
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
	 *@scroll scrolls a previously defined scroll animatable frame on its renderer using super.scroll
	 *And projects the scrolling rendition of the hologram onto a larger canvas
	 *@param time is MANDATORY and helps super scroll our hologram in time so
	 *We have Sapcetime!
	 */
	scroll(time) {
		//set canvas busy
		this.animationOn = this.scrollableHologram;
		//update time delta
		this.scrollableHologram.time.delta = time;
		//gather the rendering canvas of the scrollable frame of hologram
		const canvas = this.animatables.get(this.scrollableHologram);
		//scroll the frame of hologram on its renderer
		super.scroll(this.scrollableHologram);
		//project the scrolling renderer onto the game
		return this.project(canvas);
	}
}
/*
 *Matter is what occupies space. This class defines basic functionalities to render, move an entity
 */
class Matter extends Drawing {
	constructor() {
		super();
	}
	/*
	 *@init defines the primary, and compositing layers for rendering an entity on
	 *It then initializes a set of bounds on the compositing canvas layer, identifying
	 *entity space thresholds, and defining quadrants on the compositing layer
	 */
	init() {
		super.init();
		this.composite = this.getComposite() || this.setComposite();
		this.getBounds();
		this.initQEM();
		return this;
	}
	/*
	 *@getBounds defines entity space, and maps a compositing canvas to four quadrants
	 */
	getBounds() {
		//define a setter for bounds, and quadrants
		const setBounds = () => {
			const definition = this.composite.definition;
			const orientation = definition.orientation;
			const [minX, minY] = [0, 0];
			const maxX = (orientation == 'landscape') ? definition.vmax : definition.vmin;
			const maxY = (orientation == 'portrait') ? definition.vmax : definition.vmin;
			const maxEntityHeight = (orientation == 'landscape') ? Math.floor(definition.vmin * 0.1) : Math.floor(definition.vmax * 0.1);
			const maxEntityWidth = Math.floor(maxEntityHeight * (4 / 3));
			const minEntityWidth = Math.ceil(maxEntityWidth / 3);
			const minEntityHeight = Math.ceil(maxEntityHeight / 3);
			const esMinX = (orientation == 'landscape') ? definition.gutter : 0;
			const esMaxX = (orientation == 'landscape') ? (definition.vmax - definition.gutter) : definition.vmin;
			const esMinY = Math.ceil(minY + maxEntityHeight + 1);
			const esMaxY = (orientation == 'portrait') ? (definition.vmax - maxEntityHeight - 1) : (definition.vmin - maxEntityHeight - 1);
			const quadrant_0 = {
				minX,
				minY,
				maxX: maxX / 2,
				maxY: maxY / 2,
				id: 0
			};
			const quadrant_1 = {
				minX: maxX / 2,
				minY,
				maxX,
				maxY: maxY / 2,
				id: 1
			};
			const quadrant_2 = {
				minX: maxX / 2,
				minY: maxY / 2,
				maxX,
				maxY,
				id: 2
			};
			const quadrant_3 = {
				minX,
				minY: maxY / 2,
				maxX: maxX / 2,
				maxY,
				id: 3
			};
			const entityBounds = {
				maxEntityHeight,
				maxEntityWidth,
				minEntityWidth,
				minEntityHeight,
				esMinX,
				esMinY,
				esMaxX,
				esMaxY,
			};
			const bounds = {
				minX,
				minY,
				maxX,
				maxY,
				quadrants: [quadrant_0, quadrant_1, quadrant_2, quadrant_3],
				entityBounds
			};
			//Set a static property on the Drawing, so that new entity initializations
			//DO NOT compute this whole stuff again and again and yet again
			Drawing._bounds = bounds;
			return entityBounds;
		};
		//If a static property defining the entity space and quadrants on the compositing layer is set, return it
		//else, compute the same, and set it using the setter above
		return (Drawing._bounds) ? Drawing._bounds.entityBounds : setBounds();
	}
	/*
	 *@initQEM sets a static property QEM on the Drawing, to help collision detection per entity
	 *This static property, maps a list of entities to a wuadrant on the compositing layer per frame
	 */
	initQEM() {
		//define a setter for Quadrant to entity mapping
		const setQEM = () => {
			if (!Drawing._bounds) {
				this.getBounds();
			}
			const bounds = Drawing._bounds;
			const quadrants = bounds.quadrants;
			//QEM should be a map of quadrant=>entities
			Drawing._QEM = new WeakMap();
			//Initialize the structure as a map of Quadrant=>Set of entities
			for (let quadrant of quadrants) {
				Drawing._QEM.set(quadrant, new Set());
			}
			return Drawing._QEM;
		};
		//If a static property QEM exists on the Drawing, listing a map of quadrants to entities, return it.
		//else, use the setter above, to define and set it
		return Drawing._QEM || setQEM();
	}
	/*
	 *@paint simply renders an entity on the compositing layer
	 *using a passed position and transform if any
	 */
	paint(sprite, x, y, width, height, layer) {
		const composite = layer || this.composite;
		this.clear(composite.canvas);
		composite.twoDimContext.drawImage(sprite, x, y, width, height);
	}

}