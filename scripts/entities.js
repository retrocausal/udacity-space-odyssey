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
      const bounds = this.renderer.getBounds();
      this.bounds = Object.create(bounds);
      this.composite = this.renderer.composite;
    }
    init(...options) {
      let [maxW, maxH, minW, minH] = options;
  [this.width, this.height] = this.size(maxW, maxH, minW, minH);
      this.lerpFactor = 0.25;
      //Define an angle of rotation per frame
      this.radians = 15 * (Math.PI / 180);
      //initialize a current tilt angle
      //rotation per rotation call will be the sum total of this.radians and this.currentTilt
      this.currentTilt = 0;
      //randomly position this entity
  [this.x, this.y] = this.position();
      return this;
    }
    defineDPS() {
      //Set A Maximum Distance To Cover Per move
      this.distancePerSecond = {
        x: Math.ceil((this.bounds.esMaxX) / (this.width)),
        y: Math.ceil((this.bounds.esMaxY) / (this.height))
      };
    }
    /*
     *@size defines a random dimension for this entity
     */
    size(...options) {
      let [ceilWidth, ceilHeight, floorWidth, floorHeight] = options;
      const ceilW = ceilWidth || this.bounds.maxEntityWidth;
      const ceilH = ceilHeight || this.bounds.maxEntityHeight;
      const floorW = floorWidth || this.bounds.minEntityWidth;
      const floorH = floorHeight || this.bounds.minEntityHeight;
      const randomW = Math.floor(Math.random() * (ceilW - floorW + 1)) + floorW;
      const randomH = Math.floor(Math.random() * (ceilH - floorH + 1)) + floorH;
      return [randomW, randomH];
    }
    /*
     *@render renders this entity on a predefined/specified position on the composite/specified layer
     */
    render(...options) {
      let [x = false, y = false, layer = false, skipClear = false] = options;
      const X = (x !== false) ? x : this.x;
      const Y = (y !== false) ? y : this.y;
      const composite = layer || this.composite;
      return this.renderer.paint(this.avatar, X, Y, this.width, this.height, composite, skipClear);
    }
    /*
     *@position randomly generates an initial position for this entity on the composite layer
     */
    position() {
      const randomX = Math.floor(Math.random() * ((this.bounds.esMaxX - this.bounds.maxEntityWidth) - this.bounds.esMinX + 1)) + this.bounds.esMinX;
      const randomY = Math.floor(Math.random() * ((this.bounds.esMaxY - this.bounds.maxEntityHeight) - this.bounds.esMinY + 1)) + this.bounds.esMinY;
      return [randomX, randomY];
    }
    /*
     *Adaptive adapting per context on a frame
     */
    adapt(orientation = 'landscape') {
      let queryY, queryX;
      queryY = this.y + this.height;
      queryX = this.x;
      const max = this.max || Math.max(this.height, this.width);
      const min = this.min || Math.min(this.height, this.width);
      const exceedsesMaxY = (queryY >= this.bounds.esMaxY);
      const exceedsesMaxX = (queryX >= this.bounds.esMaxX);
      if (exceedsesMaxY && orientation == 'portrait') {
        this.y = this.bounds.esMinY;
        const ceil = this.bounds.esMaxX - max;
        const floor = this.bounds.esMinX;
        this.x = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
      }
      if (exceedsesMaxX && orientation == 'landscape') {
        this.x = this.bounds.esMinX - this.width;
        const ceil = this.bounds.esMaxY;
        const floor = this.bounds.esMinY;
        this.y = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
      }
    }
    /*
     *@mapToQuadrant maps this entity on to a predefined quadrant on the composite layer
     */
    mapToQuadrant() {
      //gather pre defined quadrants
      const quadrants = Drawing._bounds.quadrants;
      const max = this.max || Math.max(this.height, this.width);
      const threshold = this.height / 2;
      //identify quadrants this entity is bound by, depending on its current position
      const reducer = (accumalate, quadrant) => {
        //define max and min binding canvas quadrant positions
        let quadrantMaxHorizontalSpan = quadrant.maxX;
        let quadrantMinHorizontalSpan = quadrant.minX;
        let quadrantMaxVerticalSpan = quadrant.maxY;
        let quadrantMinVerticalSpan = quadrant.minY;
        //If we are looking at quadrant bounds that involve canvas bounds,
        //we need to extend the range by the width of this entity
        //because, an entity is not off canvas, until, the entire entity has moved off canvas
        if (quadrant.id == 0 || 3) {
          quadrantMinHorizontalSpan -= max;
        } else {
          quadrantMaxHorizontalSpan += max;
        }
        //This entitiy is quadrant bounds along the x axis if, either of the three points
        //entity.x / entity.x -height/2 / entity.x +height/2 exist within the bounds of the quadrant
        //we use the max dimension, and not the width along x and height along y because, the entities are //constantly rotating along the y axis
        const quadrantXBound = (quadrantMinHorizontalSpan <= (this.x) && (this.x) <= quadrantMaxHorizontalSpan) || (quadrantMinHorizontalSpan <= (this.x - threshold) && (this.x - threshold) <= quadrantMaxHorizontalSpan) || (quadrantMinHorizontalSpan <= (this.x + threshold) && (this.x + threshold) <= quadrantMaxHorizontalSpan);
        //similar to the considerations above, for entity.y
        const quadrantYBound = (quadrantMinVerticalSpan <= (this.y) && (this.y) <= quadrantMaxVerticalSpan) || (quadrantMinVerticalSpan <= (this.y - threshold) && (this.y - threshold) <= quadrantMaxVerticalSpan) || (quadrantMinVerticalSpan <= (this.y + threshold) && (this.y + threshold) <= quadrantMaxVerticalSpan);
        //Do not bind an entity that is off canvas
        const investigate = ((Drawing._bounds.minX - max) <= this.x && this.x <= (Drawing._bounds.maxX + max)) && ((Drawing._bounds.minY) <= this.y && this.y <= (Drawing._bounds.maxY));
        //If this entity is bound by the current quadrant being investigated, add it to the set of entities
        //mapped by the current quadrant
        if (investigate && (quadrantXBound && quadrantYBound)) {
          Drawing._QEM.get(quadrant)
            .add(this);
          accumalate.add(quadrant);
        } //else, delete this entity from the set of entities mapped by the current quadrant
        else {
          Drawing._QEM.get(quadrant)
            .delete(this);
        }
        return accumalate;
      };
      //return a list of quadrants this entity occupies at the moment
      const qbt = quadrants.reduce(reducer, new Set());
      return (qbt.size > 0) ? qbt : new Set();
    }
    /*
     *@isSuperposedOn checks for collisions
     */
    isSuperposedOn(object) {
      const oradius = object.height / 2;
      const radius = this.height / 2;
      const deltaX = Math.abs(this.x - object.x);
      const deltaY = Math.abs(this.y - object.y);
      const hypotenuse = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const threshold = oradius + radius;
      const altRadius = this.width / 2;
      const altoradius = object.width / 2;
      const altThreshold = altRadius + altoradius;
      if (object.constructor.name == 'Player') {

      }
      //return (hypotenuse < threshold) || (hypotenuse < altThreshold);
      return false;
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
     *@rotate defines one rotation along the center of this entity by an angle specified / by 15 degrees
     */
    rotate(direction = 'left', angle, animate = true) {
      let radians = 0;
      let rotation;
      const Angle = angle || this.radians;
      const tilt = Angle / 10;
      this.currentTilt = this.currentTilt || ((direction === 'right') ? tilt : -1 * tilt);
      const Animate = () => {
        if (radians < Angle) {
          rotation = window.requestAnimationFrame(Animate);
        } else {
          window.cancelAnimationFrame(rotation);
        }
        this.tilt();
        //increment radians by a tenth of 15 degrees
        radians += tilt;
        //increment current tilt on entity by the same measure of the Angle too, as reference to next call to rotation,
        //as well as next frame in this animation call
        this.currentTilt += (direction === 'right') ? tilt : (-1) * tilt;
      };
      const sansAnimation = () => {
        this.currentTilt = this.currentTilt || 0;
        this.currentTilt += (direction === 'right') ? angle : -1 * angle;
        this.tilt();
      };
      if (animate)
        window.requestAnimationFrame(Animate);
      else
        sansAnimation();
      return this;
    }
    /*
     *@tilt tilts this entity by the current angle of tilt.
     *Use this to tilt this entity before linear motion
     */
    tilt() {
      if (this.currentTilt) {
        //clear canvas
        if (!this.skipClearOnTilt) this.renderer.clear(this.composite.canvas);
        //save context
        this.composite.twoDimContext.save();
        //translate to the center of this entity
        this.composite.twoDimContext.translate((this.x + this.width / 2), (this.y + this.height / 2));
        //rotate by currentTilt
        this.composite.twoDimContext.rotate(this.currentTilt);
        //draw this entity's avatar on new coordinates because of tilt
        //do not clear canvas, because we already have done it above
        this.render(-this.width / 2, -this.height / 2, this.composite, true);
        //restore context
        this.composite.twoDimContext.restore();
      }
    }
    /*
     *@spin animates rotation on this entity
     */
    spin() {
      const spin = (now) => {
        window.requestAnimationFrame(spin);
        this.rotate('right', 1 * (Math.PI / 180));
      };
      return window.requestAnimationFrame(spin);
    }
    /*
     *@interpolatedMotion moves this entity via LERP
     *@params dx,dy are Mandatory, and specify the distances to cover per axis
     */
    interpolatedMotion(dx, dy) {
      this.lerp(dx, dy);
      const render = /*render this player without tilt, if there is no angle of tilt*/
        (!this.currentTilt) ? this.render() :
        /*or, tilt and render if there is a tilt*/
        this.tilt();
      //Map to a quadrant on the Drawing, after each move
      this.quadrantsBoundTo = this.mapToQuadrant();
    }
    /*
     *@requestAnimationFrame requests A particular animation
     *This method is called once per frame. Can be used to batch / throttle animations
     *@param options is MANDATORY, and has to be the delta of now, and time when animation began
     *@param animation is Mandatory, and should name the animation to process
     */
    requestAnimationFrame(animation, options) {
      return this[animation](options);
    }
    linearProgression(options) {
      const [time, acceleration, orientation, swap] = options;
      //hack to deflate the browser's animation frame throttle on inactive tabs
      const Time = (time > 0.1 || time <= 0) ? 0.1 : time;
      let dx, dy;
      //if a request for swapping orientation is made, swap distances to move
      if (!swap) {
        dx = (orientation == 'landscape') ? this.distancePerSecond.x : 0;
        dy = (orientation == 'portrait') ? this.distancePerSecond.y : 0;
      } else {
        dx = (orientation == 'landscape') ? 0 : this.distancePerSecond.x;
        dy = (orientation == 'portrait') ? 0 : this.distancePerSecond.y;
      }
      //define distance this frame
      const Dx = Math.round((dx * Time * acceleration) * 100) / 100;
      const Dy = Math.round((dy * Time * acceleration) * 100) / 100;
      //total distance is the distance for this frame plus the current position
      this.x = this.x + Dx;
      this.y = this.y + Dy;
      //pull off canvas entities back on to canvas
      this.adapt(orientation);
      //map this entity to binding quadrants
      this.quadrantsBoundTo = this.mapToQuadrant();
      //finally, rotate this entity
      const angle = Math.PI / 180;
      this.rotate('left', angle, false);

    }
    /*
     *@hasCollided first accumalates entities in the same spacial grid as this entity
     *Then, loops through the identified set of entities individually, to check for superpositions
     *of this entity and the entity in loop
     *Returns a set of colliding entities, or, en empty set
     */
    hasCollided() {
      //Loop through entities mapped to the quadrant this entity is on
      const getSuperposedEntities = (entities) => {
        let superposedEntities = new Set();
        for (const entity of entities) {
          //If this entity is superposed on the entity in this loop
          //add the entity in this loop to a cllecting set
          if (this.isSuperposedOn(entity)) {
            superposedEntities.add(entity);
          }
        }
        return superposedEntities;
      };
      //Used to reduce entities to a set of entities within the quadrant(s) this entity is mapped to
      const reducer = (accumalate, entitiesMappedToQuadrant) => {
        const entitiesInQuadrant = Drawing._QEM.get(entitiesMappedToQuadrant);
        const doThisReduction = (entitiesInQuadrant.size <= 0) ? false : (() => {
          for (const entity of entitiesInQuadrant) {
            if (entity !== this) {
              accumalate.add(entity);
            }
          }
        })();
        return accumalate;
      };
      //identify collidables
      const entitiesInMySpacialDiv = [...this.quadrantsBoundTo].reduce(reducer, new Set());
      //check and return superposed set of entities
      return (entitiesInMySpacialDiv.size > 0) ? getSuperposedEntities(entitiesInMySpacialDiv) : false;
    }

    encircle(color = '#ffffff', width = 2) {
      this.composite.twoDimContext.lineWidth = width;
      this.composite.twoDimContext.strokeStyle = color;
      this.composite.twoDimContext.beginPath();
      this.composite.twoDimContext.arc(this.x + this.width / 2, this.y + this.height / 2, this.height / 2, 0, Math.PI * 2, true);
      this.composite.twoDimContext.stroke();
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
      this.max = Math.max(this.height, this.width);
      //Set A Distance To Cover Per Trigger
      this.distancePerTrigger = {
        x: Math.ceil((Drawing._bounds.maxX) / (this.width)),
        y: Math.ceil((Drawing._bounds.maxY) / (this.height))
      };
      this.reset();
      this.manifest();

      return this;
    }
    reset() {
      //override pre defined initial positions, and place this player, bang at the center of the bottom most layer
      this.x = (Drawing._bounds.maxX) / 2;
      this.y = Drawing._bounds.maxY - this.bounds.maxEntityHeight;
      this.moves = 0;
    }
    /*
     *@manifest renders and activates the player
     */
    manifest() {
      this.quadrantsBoundTo = this.mapToQuadrant();
      //render this player
      this.render();
      //register appropriate event listeners for depicting motion on the compositing canvas
      this.registerInterruptHandlers();
    }
    /*
     *@registerInterruptHandlers registers a set of acceptable motion triggers
     *And Also, activates them.
     */
    registerInterruptHandlers(trigger = false) {
      //define generic event handlers for each acceptable trigger
      const arrowUpHandler = () => {
        //the player will not move horizontally
        const dx = 0;
        //player has to move a certain predefined distance per trigger
        const dy = this.distancePerTrigger.y * -1;
        //threshold is, the current vertical postion of the player, minus the distance per trigger to cover
        const threshold = this.y + dy;
        let animation;
        const animate = () => {
          //Only move down, if the player's current vertical position is yet to cross the threshold
          //And, if the threshold itself, is not beyond the canvas
          if (this.y > threshold && threshold >= (Drawing._bounds.minY)) {
            animation = window.requestAnimationFrame(animate);
            this.interpolatedMotion(dx, dy);
          } else {
            window.cancelAnimationFrame(animation);
            this.encircle();

          }
        };
        return window.requestAnimationFrame(animate);
      };
      const arrowDownHandler = () => {
        //the player will not move horizontally
        const dx = 0;
        //player has to move a certain predefined distance per trigger
        const dy = this.distancePerTrigger.y;
        //threshold is, the current vertical postion of the player, plus the distance per trigger to cover
        const threshold = this.y + dy;
        let animation;
        const animate = () => {
          //Only move down, if the player's current vertical position is yet to cross the threshold
          //And, if the threshold itself, is not beyond the canvas
          if (this.y < threshold && threshold <= (Drawing._bounds.maxY - this.height)) {
            window.requestAnimationFrame(animate);
            this.interpolatedMotion(dx, dy);
          } else {
            window.cancelAnimationFrame(animation);
            this.encircle();

          }
        };
        return window.requestAnimationFrame(animate);
      };
      const arrowRightHandler = () => {
        //player will not move vertically
        const dy = 0;
        //player has to move a certain predefined distance per trigger
        let dx = this.distancePerTrigger.x;
        //threshold is, the current horizontal postion of the player, plus the distance per trigger to cover
        let threshold = this.x + dx;
        let animation;
        const animate = () => {
          //Only move, if the threshold, is greater than the current horizontal position of the plaayer
          if (this.x < threshold) {
            animation = window.requestAnimationFrame(animate);
            //if the threshold to move to, is beyond the canvas, reset the player's horizontal position to a minimum
            if (threshold > (Drawing._bounds.maxX - this.width)) {
              this.x = Drawing._bounds.minX;
              //reset threshold
              //If not done, the player's current position will remain lesser than the previous threshold
              //causing untriggered movement
              threshold = this.x;
              dx = 0;
            }
            this.interpolatedMotion(dx, dy);
          } else {
            window.cancelAnimationFrame(animation);
            this.encircle();

          }
        };
        return window.requestAnimationFrame(animate);
      };
      const arrowLeftHandler = () => {
        //player will not move vertically
        const dy = 0;
        //player has to move a certain predefined distance per trigger
        let dx = this.distancePerTrigger.x * -1;
        //threshold is, the current horizontal postion of the player, minus the distance per trigger to cover
        let threshold = this.x + dx;
        let animation;
        const animate = () => {
          //Only move, if the threshold, is lesser than the current horizontal position of the plaayer
          if (this.x > threshold) {
            animation = window.requestAnimationFrame(animate);
            //if the threshold to move to, is beyond the canvas, reset the player's horizontal position to a maximum
            if (threshold < (Drawing._bounds.minX + this.width)) {
              this.x = Drawing._bounds.maxX - this.width;
              //reset threshold
              //If not done, the player's current position will remain greater than the previous threshold
              //causing untriggered movement
              threshold = this.x;
              dx = 0;
            }
            this.interpolatedMotion(dx, dy);
          } else {
            window.cancelAnimationFrame(animation);
            this.encircle();

          }
        };
        return window.requestAnimationFrame(animate);

      };
      const arrowRightAltHandler = () => {
        this.rotate('right');
        this.encircle();
      };
      const arrowLeftAltHandler = () => {
        this.rotate();
        this.encircle();
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
            const normalTrigger = !unactionables.has(key) && key === kbdTrigger && !AlternateTrigger;
            if (normalTrigger) {
              const triggerAction = actionableTriggers.get(kbdTrigger) || false;
              if (triggerAction) {
                triggerAction();
              }
              //release pressed trigger
              kbdTrigger = false;
            }
            //If the user pressed 'ALT' + 'KBD ARROW KEY'
            //recognize the alternate trigger and set it off
            const altTrigger = AlternateTrigger && MatchableAlternateTrigger && (AlternateTrigger === MatchableAlternateTrigger);
            if (altTrigger) {
              const triggerAltAction = actionableTriggers.get(AlternateTrigger) || false;
              if (triggerAltAction) {
                triggerAltAction();
              }
              //release AlternateTrigger
              MatchableAlternateTrigger = false;
              AlternateTrigger = false;
            }
            if (normalTrigger || altTrigger)
              this.moves++;
          });
        }
        return false;
      });
      //Activate Panel
      const cpanelUp = document.querySelector('#ctrl-up');
      const cpanelDown = document.querySelector('#ctrl-down');
      const cpanelRight = document.querySelector('#ctrl-right');
      const cpanelLeft = document.querySelector('#ctrl-left');
      cpanelUp.addEventListener('click', () => {
        arrowUpHandler();
        this.moves++;
      });
      cpanelDown.addEventListener('click', () => {
        arrowDownHandler();
        this.moves++;
      });
      cpanelLeft.addEventListener('click', () => {
        arrowLeftHandler();
        this.moves++;
      });
      cpanelRight.addEventListener('click', () => {
        arrowRightHandler();
        this.moves++;
      });
    }
  }
  /*
   *Blackhole is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Blackhole extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
    }
    init(avatar) {
      super.init();
      this.avatar = avatar;
      //position the blackhole bang in the entity space center
      this.y = this.bounds.esMaxY / 2;
      this.x = this.bounds.esMaxX / 2;
      this.defineDPS();
      //define a factor to gain width by per frame
      //this is the width of the star. the blackhole gains 1/30th of this width per frame
      //until it reaches maximum possible width, which may not be this particular width always.
      this.gobbleThreshold = this.bounds.maxEntityHeight * 1.5;
      //define incerement / decrement pointers
      this.gain = 0;
      this.pan = 0;
      this.oscillation = 0;
      //define a threshold for width gain
      //the width should not exceed half the entity space, so that the blackhole is bound by the entity space
      this.gainThreshold = (this.bounds.esMaxY - this.bounds.esMinY) / 2;
      this.quadrantsBoundTo = this.mapToQuadrant();
      this.core = {
        width: this.width + 10,
        height: this.height + 10
      };
      return this;
    }
    encircle(color = '#ffffff', width = 2) {
      this.composite.twoDimContext.lineWidth = width;
      this.composite.twoDimContext.strokeStyle = color;
      this.composite.twoDimContext.beginPath();
      this.composite.twoDimContext.arc(this.x + this.width / 2, this.y + this.height / 2, this.height / 2, this.currentTilt, Math.PI, false);
      this.composite.twoDimContext.stroke();
      this.composite.twoDimContext.closePath();
      this.composite.twoDimContext.lineWidth = 1;
      this.composite.twoDimContext.strokeStyle = '#d0d0d0';
      this.composite.twoDimContext.beginPath();
      this.composite.twoDimContext.arc(this.x + this.width / 2, this.y + this.height / 2, this.core.height / 2, this.currentTilt, Math.PI * 2, false);
      this.composite.twoDimContext.stroke();
      this.composite.twoDimContext.closePath();
      if (this.eventHorizon) {
        this.composite.twoDimContext.lineWidth = 1;
        this.composite.twoDimContext.strokeStyle = '#eee';
        this.composite.twoDimContext.beginPath();
        this.composite.twoDimContext.arc(this.x + this.width / 2, this.y + this.height / 2, this.eventHorizon.height / 2, this.currentTilt, Math.PI * -2, false);
        this.composite.twoDimContext.stroke();
        this.composite.twoDimContext.closePath();
      }
    }
    /*
     *@linearProgression overrides the default animation on an entity by super.
     *Blackholes need to grow in size, and oscillate
     */
    linearProgression(options) {
      const [time, acceleration, orientation] = options;
      //Hack(s) to deflate the browser's animation frame drops on an inactive tab
      const Time = (time > 0.1 || time <= 0) ? 0.1 : time;
      const factorOfTime = Time * acceleration;
      //If the width gain hasn't passed a pre defined threshold, increment it by a factor of time
      this.width += (this.width >= this.gainThreshold) ? 0 : (this.gobbleThreshold * Time);
      //let the blackhole be symmetrical
      this.height = this.width;
      //if the width gained is equal or more than the threshold, oscillate
      if (this.width >= this.gainThreshold) {
        //define the maximum Y positions the blackhole should oscillate between
        this.max = this.max || Math.max(this.height, this.width);
        this.min = this.min || Math.min(this.height, this.width);
        this.eventHorizon = {
          width: this.width + this.width / 10,
          height: this.height + this.height / 10
        };
        //define a threshold for oscillation. The blackhole should only oscillate between the center
        //of the entity space, and the minimum y of the entity space
        this.oscillationThreshold = this.oscillationThreshold || (this.bounds.esMaxY / 2 - this.max / 2);
        //define an oscillation frequency
        //the blackhole should oscillate, by a factor of time
        const oscillation = this.oscillationThreshold * Time * this.lerpFactor;
        //If the blackhole has not swung to the threshold yet, continue swinging
        //increment counter towards the threshold
        //swing by decrementing y
        if (this.oscillation < this.oscillationThreshold) {
          this.y -= oscillation;
          this.oscillation += oscillation;
        }
        //If the blackhole has swung to a threshold, reset the threshold
        //swing back by increment of y
        else {
          this.y += oscillation;
          if (this.y >= (this.bounds.esMaxY / 2)) {
            this.oscillation = 0;
          }
        }
        //While oscillation happens, the blackhole should move horizontally too
        //decrement x per frame by a factor of time
        this.x -= (this.distancePerSecond.x) * factorOfTime;
        //If out of canvas, drag back to bounds
        if (this.x <= -this.width) {
          this.x = this.bounds.esMaxX;
          //If the blackhole has oscillated the length of the canvas,
          //everytime it does so, increment the speed by a factor of time
          const dx = Drawing._bounds.maxX / (this.width + this.height);
          this.distancePerSecond.x += Math.round((dx * factorOfTime) * 100) / 100;
          //canvas span covered times ++
          this.pan++;
        }
      } else {
        this.encircle('orange', 10);
      }
      //map to quadrants of the Drawing
      this.quadrantsBoundTo = this.mapToQuadrant();
      //If the blakhole has covered the canvas length n number of times,
      //do something else, like start consuming matter
      if (this.pan >= 1) {
        const consumables = this.hasCollided();
        if (consumables.size > 0) {
          for (const consumable of consumables) {
            if (consumable.constructor.name == 'Player') {
              console.log(consumable);
              consumable.x += 2 * this.max;
              if (consumable.x > Drawing._bounds.maxX - consumable.width) {
                consumable.x = Drawing._bounds.minX + consumable.width;
              }
              consumable.render();
              consumable.tilt();
            } else {
              consumable.width -= (consumable.width / 30) * Time;
              consumable.height -= (consumable.height / 30) * Time;
              const dx = (consumable.width) / Drawing._bounds.maxX;
              const sillyfactor = 4 * Math.round((dx * factorOfTime) * 100) / 100;
              this.distancePerSecond.x += sillyfactor;
            }
          }
        }
      }
      //while all the above is happening, rotate the blackhole
      const angle = Math.PI / 180;
      this.rotate('right', angle, false);
      this.encircle();
    }

  }

  /*
   *Star is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Star extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
    }
    init(avatar, player) {
      super.init();
      this.avatar = avatar;
      //Override the default random dimensions
      this.height = this.bounds.maxEntityHeight * 1.5;
      //make the star symmetrical
      this.width = this.height;
      //place the star at a displacement of its height from the entity space center
      this.y = this.bounds.esMaxY / 2 + this.height;
      this.x = this.bounds.esMaxX / 2;
      //pre calculate max and min for collisions and quadrants
      this.max = Math.max(this.height, this.width);
      this.min = Math.min(this.height, this.width);
      //redefine bounds according to the stars dimensions
      this.bounds.esMinY = this.bounds.esMinY + this.max;
      this.bounds.esMaxY = this.bounds.esMaxY - this.max;
      this.quadrantsBoundTo = this.mapToQuadrant();
      //define a distance to cover per second
      this.defineDPS();

      return this;
    }
    /*
     *@linearProgression overrides the default behaviour from super
     */
    linearProgressions(options) {
      const [time] = options;
      //Hack to deflate the browser's animation frame drops on an inactive tab
      const Time = (time > 0.1 || time <= 0) ? 0.1 : time;
      //The star, is consumed by the blackhole in the game
      //SO, decrement the dimensions, by a factor of time
      this.height -= (this.height <= 2) ? 0 : (this.height / 21) * Time;
      this.width -= (this.height >= 2 || this.width <= 0) ? 0 : (this.width / 30) * Time;
      //Once the star has been consumed, move it off canvas
      if (this.height <= 2 && this.width <= 2) {
        this.x = -Drawing._bounds.maxX;
        this.y = this.x;
      } else {

        const angle = Math.PI / 180;
        this.rotate('left', angle, false);
      }
    }
  }
  /*
   *Planet is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Planet extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
      //Set a predefined ceil and floor limit for planet's dimensions
      //else, a planet could be larger than a star
      this.maxWidth = this.bounds.maxEntityWidth * .75;
      this.minWidth = this.bounds.minEntityWidth * 1.75;
      this.minHeight = false;
      this.maxHeight = false;
    }
    init(avatar, player) {
      super.init(this.maxWidth, this.maxHeight, this.minWidth, this.minHeight);
      //let the planet by symmetrical
      this.height = this.width;
      this.avatar = avatar;
      //pre calculate max,min for collisions and quadrants
      this.max = Math.max(this.height, this.width);
      this.min = Math.min(this.height, this.width);
      //redefine bounds according to the stars dimensions
      this.bounds.esMinY = this.bounds.esMinY + this.max;
      this.bounds.esMaxY = this.bounds.esMaxY - this.max;
      this.quadrantsBoundTo = this.mapToQuadrant();
      this.defineDPS();

      return this;
    }
    linearProgression(options) {
      if (this.width <= 2 && this.height <= 2) {
        this.x = -Drawing._bounds.maxX;
        this.y = this.x;
      } else {
        super.linearProgression(options);
      }
    }
  }
  /*
   *Asteroid is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Asteroid extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
      //Set a predefined ceil and floor limit for asteroid's dimensions
      //else, an asteroid could be larger than a star
      this.maxWidth = this.bounds.maxEntityWidth * .6;
      this.minWidth = this.bounds.minEntityWidth * 1.25;
      this.minHeight = false;
      this.maxHeight = false;
    }
    init(avatar, player) {
      super.init(this.maxWidth, this.maxHeight, this.minWidth, this.minHeight);
      this.height = (9 / 16) * this.width;
      this.avatar = avatar;
      //define a distance to cover per second
      this.defineDPS();
      //precalculate max, min for collisions and quadrants
      this.max = Math.max(this.height, this.width);
      this.min = Math.min(this.height, this.width);
      //redefine bounds according to the stars dimensions
      this.bounds.esMinY = this.bounds.esMinY + this.max;
      this.bounds.esMaxY = this.bounds.esMaxY - this.max;
      this.quadrantsBoundTo = this.mapToQuadrant();
      return this;
    }
    linearProgression(options) {
      if (this.width <= 2 && this.height <= 2) {
        this.x = -Drawing._bounds.maxX;
        this.y = this.x;
      } else {
        super.linearProgression(options);
      }
    }
  }