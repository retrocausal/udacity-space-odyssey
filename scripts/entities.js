/*
 *@Entity defines generic behaviours of any game entity
 *These behaviours need to be extended by individual entites, defining their individuality!
 */
class Entity {
	/*
	 * Constructor identifies a pre initiated composite canvas layer to render this entity on.
	 * And initializes this entity's position on the layer
	 */
	constructor() {
		this.renderer = new Matter()
			.init();
	}
	init() {
		this.bounds = this.renderer.getBounds();
    [this.x, this.y] = this.position();
		[this.width, this.height] = this.size();
		this.lerpFactor = 0.25;
		//Define an angle of rotation per frame
		this.radians = 15 * (Math.PI / 180);
		//initialize a current tilt angle
		//rotation per rotation call will be the sum total of this.radians and this.currentTilt
		this.currentTilt = 0;
		return this;
	}
	/*
	 *@size defines a random dimension for this entity
	 */
	size() {
		const ceilW = this.bounds.maxEntityWidth;
		const ceilH = this.bounds.maxEntityHeight;
		const floorW = this.bounds.minEntityWidth;
		const floorH = this.bounds.minEntityHeight;
		const randomW = Math.floor(Math.random() * (ceilW - floorW + 1)) + floorW;
		const randomH = Math.floor(Math.random() * (ceilH - floorH + 1)) + floorH;
		return [randomW, randomH];
	}
	/*
	 *@render renders this entity on a predefined position on the composite layer
	 */
	render(...recipe) {
		let [x = false, y = false, layer = false, skipClear = false] = recipe;
		const X = (x !== false) ? x : this.x;
		const Y = (y !== false) ? y : this.y;
		const composite = layer || this.composite;
		return this.renderer.paint(this.avatar, X, Y, this.width, this.height, composite, skipClear);
	}
	/*
	 *@position randomly generates an initial position for this entity on the composite layer
	 */
	position() {
		const randomX = Math.floor(Math.random() * (this.bounds.esMaxX - this.bounds.esMinX + 1)) + this.bounds.esMinX;
		const randomY = Math.floor(Math.random() * (this.bounds.esMaxY - this.bounds.esMinY + 1)) + this.bounds.esMinY;
		return [randomX, randomY];
	}
	/*
	 *@mapToQuadrant maps this entity on to a predefined quadrant on the composite layer
	 */
	mapToQuadrant() {
		//gather pre defined quadrants
		const quadrants = Drawing._bounds.quadrants;
		//identify quadrants this entity is bound by, depending on its current position
		const reducer = (accumalate, quadrant) => {
			const xBound = ((this.x + this.width / 2) >= quadrant.minX && (this.x + this.width / 2) <= quadrant.maxX) ||
				((this.x - this.width / 2) >= quadrant.minX && (this.x - this.width / 2) <= quadrant.maxX);
			const yBound = ((this.y + this.height / 2) >= quadrant.minY && (this.y + this.height / 2) <= quadrant.maxY) ||
				((this.y) >= quadrant.minY && (this.y) <= quadrant.maxY);
			//If this entity is bound by the current quadrant being investigated, add it to the set of entities
			//mapped by the current quadrant
			if (xBound && yBound) {
				accumalate.add(quadrant);
				Drawing._QEM.get(quadrant)
					.add(this);
			} //else, delete this entity from the set of entities mapped by the current quadrant
			else {
				Drawing._QEM.get(quadrant)
					.delete(this);
			}
			return accumalate;
		};
		//return a list of quadrants this entity occupies at the moment
		return quadrants.reduce(reducer, new Set());
	}
	/*
	 *@increment increments the number of an entity on the drawing
	 */
	increment() {
		const name = this.constructor.name;
		Entity[name] = Entity[name] || 0;
		return ++Entity[name];
	}
	/*
	 *@lerp linear interpolates the transition between coordinates
	 */
	lerp(dx, dy) {
		this.x = this.x + (dx) * this.lerpFactor;
		this.y = this.y + (dy) * this.lerpFactor;
	}
	/*
	 *@rotate defines one rotation along the center of this entity by 15 degrees
	 */
	rotate(direction = 'left') {
		let radians = 0;
		const tilt = this.radians / 10;
		this.currentTilt = this.currentTilt || ((direction === 'right') ? tilt : -1 * tilt);
		const animate = () => {
			if (radians < this.radians) {
				window.requestAnimationFrame(animate);
			}
			this.tilt();
			//increment radians by a tenth of 15 degrees
			radians += tilt;
			//increment current tilt on entity by the same measure too, as reference to next call to rotation,
			//as well as next frame in this animation call
			this.currentTilt += (direction === 'right') ? tilt : (-1) * tilt;
		};
		window.requestAnimationFrame(animate);
		return this;
	}
	/*
	 *@tilt tilts this entity by the current angle of tilt.
	 *Use this to tilt this entity before linear motion
	 */
	tilt() {
		//clear canvas
		this.renderer.clear(this.composite.canvas);
		//save context
		this.composite.twoDimContext.save();
		//translate to the center of this entity
		this.composite.twoDimContext.translate((this.x + this.width / 2), (this.y + this.height / 2));
		//rotate by currentTilt
		this.composite.twoDimContext.rotate(this.currentTilt);
		//draw this entity's avatar on new coordinates because of tilt
		this.render(-this.width / 2, -this.height / 2, this.composite, true);
		//restore context
		this.composite.twoDimContext.restore();
		//clear canvas
		this.renderer.clear(this.composite.canvas);
		//save context
		this.composite.twoDimContext.save();
		//translate to the center of this entity
		this.composite.twoDimContext.translate((this.x + this.width / 2), (this.y + this.height / 2));
		//rotate by currentTilt
		this.composite.twoDimContext.rotate(this.currentTilt);
		//draw this entity's avatar on new coordinates because of tilt
		this.render(-this.width / 2, -this.height / 2, this.composite, true);
		//restore context
		this.composite.twoDimContext.restore();
	}

}
/*
 *@Player extends an Entity and defines a Player
 */
class Player extends Entity {
	constructor() {
		super();
		const id = `player-composite-${this.increment()}`;
		const composite = this.renderer.setCustomComposite(id);
		this.composite = Drawing._layers.get(composite.canvas);
	}
	/*
	 *@init identifies a rendering context, overrides the pre initialized random x,y positions
	 *Renders and registers event listeners for this player on the compositing canvas
	 */
	init(avatar) {
		super.init();
		//set an avatar
		this.avatar = avatar.value;
		//set/reset dimensions
		this.width = this.bounds.maxEntityWidth;
		this.height = this.bounds.maxEntityHeight;
		//Set A Distance To Cover Per Trigger
		this.distancePerTrigger = {
			x: Math.ceil((Drawing._bounds.maxX) / (this.width)),
			y: Math.floor((Drawing._bounds.maxY) / (this.height))
		};
		//override pre defined initial positions, and place this player, bang at the center of the bottom most layer
		this.x = (Drawing._bounds.maxX) / 2;
		this.y = Drawing._bounds.maxY - this.bounds.maxEntityHeight;
		//render this player
		this.render();
		//register appropriate event listeners for depicting motion on the compositing canvas
		this.registerInterruptHandlers();
	}
	/*
	 *@registerInterruptHandlers registers a set of acceptable motion triggers
	 */
	registerInterruptHandlers(trigger = false) {
		//define generic event handlers for each acceptable trigger
		const arrowUpHandler = () => {
			const dx = 0;
			const dy = this.distancePerTrigger.y * (-1);
			const threshold = this.y + dy;
			const animate = () => {
				if (this.y > threshold && threshold > (Drawing._bounds.minY)) {
					window.requestAnimationFrame(animate);
					this.lerp(dx, dy);
					//render this player
					this.render();
					//tilt if there is a tilt
					this.tilt();
					const quadrant = this.mapToQuadrant();
				}
			};
			return window.requestAnimationFrame(animate);
		};
		const arrowDownHandler = () => {
			const dx = 0;
			const dy = this.distancePerTrigger.y;
			const threshold = this.y + dy;
			const animate = () => {
				if (this.y < threshold && threshold < (Drawing._bounds.maxY - this.height)) {
					window.requestAnimationFrame(animate);
					this.lerp(dx, dy);
					//render this player
					this.render();
					//tilt if there is a tilt
					this.tilt();
					const quadrant = this.mapToQuadrant();
				}
			};
			return window.requestAnimationFrame(animate);
		};
		const arrowRightHandler = () => {
			const dy = 0;
			const dx = this.distancePerTrigger.x;
			let threshold = this.x + dx;
			const animate = () => {
				if (this.x < threshold) {
					if (threshold > (this.bounds.esMaxX - this.width / 2)) {
						this.x = this.bounds.esMinX;
						threshold = this.x;
					}
					window.requestAnimationFrame(animate);
					this.lerp(dx, dy);
					//render this player
					this.render();
					//tilt if there is a tilt
					this.tilt();
					const quadrant = this.mapToQuadrant();
				}
			};
			return window.requestAnimationFrame(animate);
		};
		const arrowLeftHandler = () => {
			const dy = 0;
			const dx = this.distancePerTrigger.x * (-1);
			let threshold = this.x + dx;
			const animate = () => {
				if (this.x > threshold) {
					if (threshold < (this.bounds.esMinX + this.width / 2)) {
						this.x = this.bounds.esMaxX;
						threshold = this.x;
					}
					window.requestAnimationFrame(animate);
					this.lerp(dx, dy);
					//render this player
					this.render();
					//tilt if there is a tilt
					this.tilt();
					const quadrant = this.mapToQuadrant();
				}
			};
			return window.requestAnimationFrame(animate);

		};
		const arrowRightAltHandler = () => {
			this.rotate('right');
		};
		const arrowLeftAltHandler = () => {
			this.rotate();
		};
		//define a map of acceptable keyboard triggers to action on that trigger
		//This helps to define a particular player motion on the compositing canvas
		const actionableTriggers = new Map();
		const unactionables = new Set(['Control', 'Tab', 'Shift', 'Alt']);
		actionableTriggers.set('ArrowUp', arrowUpHandler);
		actionableTriggers.set('ArrowDown', arrowDownHandler);
		actionableTriggers.set('ArrowLeft', arrowLeftHandler);
		actionableTriggers.set('ArrowRight', arrowRightHandler);
		actionableTriggers.set('altArrowLeft', arrowLeftAltHandler);
		actionableTriggers.set('altArrowRight', arrowRightAltHandler);
		//A trigger, has two states. On, or Off. initialize it to off.
		//On is when, an acceptable key is pressed
		//Off is when, the  previously pressed key is released
		let kbdTrigger = false;
		let MatchableAlternateTrigger = false;
		//define an event chain to handle
		document.addEventListener('keydown', (keyDownEvent) => {
			//which key?
			const key = keyDownEvent.key;
			//was alt pressed too?
			const alt = keyDownEvent.altKey;
			//if yes, prevent default action for alt key
			if (alt) {
				keyDownEvent.preventDefault();
				MatchableAlternateTrigger = `alt${key}`;
			}
			//Only When a new key is pressed, record events
			//If the user holds down a particular key, for example, do not
			//record that event
			//Also, do not process unactionables alone, unless they are pressed with an option
			if (actionableTriggers.has(key) && (key !== kbdTrigger) && !unactionables.has(key)) {
				//record action on keyboard, identify task
				kbdTrigger = key;
				document.addEventListener('keyup', (keyUpEvent) => {
					let AlternateTrigger = false;
					const key = keyUpEvent.key;
					//rerecord alt
					const alt = keyUpEvent.altKey;
					if (alt) {
						keyUpEvent.preventDefault();
						AlternateTrigger = `alt${key}`;
					}
					//If the user used a plain keyboard action (one of the arrow keys)
					//Recognize the trigger, and set it off
					if (!unactionables.has(key) && key === kbdTrigger && !AlternateTrigger) {
						const triggerAction = actionableTriggers.get(kbdTrigger) || false;
						if (triggerAction) {
							triggerAction();
						}
						//release pressed trigger
						kbdTrigger = false;
					}
					//If the user pressed 'ALT' + 'KBD ARROW KEY'
					//recognize the alternate trigger and set it off
					if (AlternateTrigger && MatchableAlternateTrigger && AlternateTrigger === MatchableAlternateTrigger) {
						const triggerAltAction = actionableTriggers.get(AlternateTrigger) || false;
						if (triggerAltAction) {
							triggerAltAction();
						}
						//release AlternateTrigger
						MatchableAlternateTrigger = false;
						AlternateTrigger = false;
					}
				});
			}
			return false;
		});
		//Activate Panel
		const cpanelUp = document.querySelector('#ctrl-up');
		const cpanelDown = document.querySelector('#ctrl-down');
		const cpanelRight = document.querySelector('#ctrl-right');
		const cpanelLeft = document.querySelector('#ctrl-left');
		cpanelUp.addEventListener('click', arrowUpHandler);
		cpanelDown.addEventListener('click', arrowDownHandler);
		cpanelLeft.addEventListener('click', arrowLeftHandler);
		cpanelRight.addEventListener('click', arrowRightHandler);
	}
}