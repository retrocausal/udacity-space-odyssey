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
	render(layer = false) {
		return this.renderer.paint(this.avatar, this.x, this.y, this.width, this.height, layer);
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
	increment() {
		const name = this.constructor.name;
		Entity[name] = Entity[name] || 0;
		return ++Entity[name];
	}

}
/*
 *@Player extends an Entity and defines a Player
 */
class Player extends Entity {
	constructor() {
		super();
		const count = this.increment();
		const id = `player-composite-${count}`;
		const composite = this.renderer.setCustomComposite(id);
		this.composite = Drawing._layers.get(document.querySelector(`#${id}`));
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
		//SET A SPEED TO MOVE AT
		this.speed = {
			x: (Drawing._bounds.maxX) / (this.width),
			y: (Drawing._bounds.maxY) / (this.height)
		};
		//override pre defined initial positions, and place this player, bang at the center of the bottom most layer
		this.x = (Drawing._bounds.maxX) / 2;
		this.y = Drawing._bounds.maxY - this.bounds.maxEntityHeight;
		//render this player
		this.render(this.composite);
		//register appropriate event listeners for depicting motion on the compositing canvas
		this.registerInterruptHandlers();
	}
	/*
	 *@registerInterruptHandlers registers a set of acceptable motion triggers
	 */
	registerInterruptHandlers(trigger = false) {
		//define generic event handlers for each acceptable trigger
		const arrowUpHandler = () => {
			const y = this.y;
			//Distance to cover along Y
			const Y = -1 * this.speed.y;
			let dy = Math.floor(y + Y);
			//If the player has reached a maximum movable height along the canvas
			if (dy < (Drawing._bounds.minY + this.height)) {
				//the player can not loop back home, nor move out of canvas
				dy = Drawing._bounds.minY + this.height;
			}
			//Move along now
			this.y = dy;
			//Map to a quadrant or two on the Drawing
			this.mapToQuadrant();
		};
		const arrowDownHandler = () => {};
		const arrowRightHandler = () => {};
		const arrowLeftHandler = () => {};
		const actionKeyHandler = () => {};
		//define a map of acceptable keyboard triggers to action on that trigger
		//This helps to define a particular player motion on the compositing canvas
		const actionableTriggers = new Map();
		actionableTriggers.set('ArrowUp', arrowUpHandler);
		actionableTriggers.set('ArrowDown', arrowDownHandler);
		actionableTriggers.set('ArrowLeft', arrowLeftHandler);
		actionableTriggers.set('ArrowRight', arrowRightHandler);
		actionableTriggers.set('ActionKey', actionKeyHandler);
		//A trigger, has two states. On, or Off. initialize it to off.
		//On is when, an acceptable key is pressed
		//Off is when, the  previously pressed key is released
		let kbdTrigger = false;
		//define an event chain to handle
		document.addEventListener('keydown', (keyDownEvent) => {
			const key = keyDownEvent.key;
			//Only When a new key is pressed, record events
			//If the user holds down a particular key, for example, do not
			//record that event
			if (actionableTriggers.has(key) && (key !== kbdTrigger)) {
				//record action on keyboard, identify task
				kbdTrigger = key;
				document.addEventListener('keyup', (keyUpEvent) => {
					const key = keyUpEvent.key;
					if (key === kbdTrigger) {
						const triggerableAction = actionableTriggers.get(kbdTrigger);
						//act on trigger
						triggerableAction();
						//release pressed trigger
						kbdTrigger = false;
					}
				});
			}
			return false;
		});
	}
}