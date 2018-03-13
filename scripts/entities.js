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
      this.bounds = this.renderer.getBounds();
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
    adapt(orientation) {
      let queryY, queryX;
      queryY = this.y + this.height;
      queryX = this.x;
      const max = Math.max(this.height, this.width);
      const min = Math.min(this.height, this.width);
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
        const ceil = this.bounds.esMaxY - max - min / 2;
        const floor = this.bounds.esMinY + min;
        this.y = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
      }
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
     *@isSuperposedOn checks for collisions
     */
    isSuperposedOn(object) {
      const objectMaxHorizontalSpan = object.x + object.width;
      const objectMinHorizontalSpan = object.x - object.width / 2;
      const objectMaxVerticalSpan = object.y + object.height;
      const objectMinVerticalSpan = object.y - object.height / 2;
      const selfMaxHorizontalSpan = this.x + this.width;
      const selfMinHorizontalSpan = this.x - this.width / 2;
      const selfMaxVerticalSpan = this.y + this.height;
      const selfMinVerticalSpan = this.y - this.height / 2;

      const selfMinXInObjectSpan = (objectMinHorizontalSpan < selfMinHorizontalSpan && selfMinHorizontalSpan < objectMaxHorizontalSpan);
      const selfMaxXInObjectSpan = (objectMinHorizontalSpan < selfMaxHorizontalSpan && selfMaxHorizontalSpan < objectMaxHorizontalSpan);

      const selfMinYInObjectSpan = (objectMinVerticalSpan < selfMinVerticalSpan && selfMinVerticalSpan < objectMaxVerticalSpan);
      const selfMaxYInObjectSpan = (objectMinVerticalSpan < selfMaxVerticalSpan && selfMaxVerticalSpan < objectMaxVerticalSpan);

      const selfXInObjectSpan = (objectMinHorizontalSpan < this.x && this.x < objectMaxHorizontalSpan);
      const selfYInObjectSpan = (objectMinVerticalSpan < this.y && this.y < objectMaxVerticalSpan);

      return (selfXInObjectSpan || selfYInObjectSpan || selfMinXInObjectSpan || selfMinYInObjectSpan || selfMaxXInObjectSpan || selfMaxYInObjectSpan);
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
      let dx, dy;
      if (!swap) {
        dx = (orientation == 'landscape') ? this.distancePerSecond.x : 0;
        dy = (orientation == 'portrait') ? this.distancePerSecond.y : 0;
      } else {
        dx = (orientation == 'landscape') ? 0 : this.distancePerSecond.x;
        dy = (orientation == 'portrait') ? 0 : this.distancePerSecond.y;
      }
      //define distance this frame
      const Dx = Math.round((dx * time * acceleration) * 100) / 100;
      const Dy = Math.round((dy * time * acceleration) * 100) / 100;
      this.x = this.x + Dx;
      this.y = this.y + Dy;
      this.adapt(orientation);
      const angle = Math.PI / 180;
      this.rotate('left', angle, false);
      this.quadrantsBoundTo = this.mapToQuadrant();
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
        const animate = () => {
          //Only move down, if the player's current vertical position is yet to cross the threshold
          //And, if the threshold itself, is not beyond the canvas
          if (this.y > threshold && threshold >= (Drawing._bounds.minY)) {
            window.requestAnimationFrame(animate);
            this.interpolatedMotion(dx, dy);
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
        const animate = () => {
          //Only move down, if the player's current vertical position is yet to cross the threshold
          //And, if the threshold itself, is not beyond the canvas
          if (this.y < threshold && threshold <= (Drawing._bounds.maxY - this.height)) {
            window.requestAnimationFrame(animate);
            this.interpolatedMotion(dx, dy);
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
      cpanelUp.addEventListener('click', arrowUpHandler);
      cpanelDown.addEventListener('click', arrowDownHandler);
      cpanelLeft.addEventListener('click', arrowLeftHandler);
      cpanelRight.addEventListener('click', arrowRightHandler);
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
      this.y = this.bounds.esMaxY / 2;
      this.x = this.bounds.esMaxX / 2;
      this.defineDPS();
      this.gobbleThreshold = this.bounds.maxEntityHeight * 1.5;
      this.gain = 0;
      this.oscillation = 0;
      this.oscillationThreshold = (this.bounds.esMaxY / 2 - this.bounds.esMinY);
      return this;
    }
    linearProgression(options) {
      const [time, acceleration, orientation] = options;
      //blackholes need to grow in size
      this.composite.twoDimContext.globalAlpha = 1;
      this.gain += (this.gain <= (2 * this.gobbleThreshold)) ? (this.gobbleThreshold / 50) * time : 0;
      this.width += (this.gain <= (2 * this.gobbleThreshold)) ? (this.gobbleThreshold / 50) * time : 0;
      this.height = this.width;
      const oscillation = (this.oscillationThreshold / 50) * time;
      if (this.gain >= (2 * this.gobbleThreshold)) {
        this.width = (this.bounds.esMaxY - this.bounds.esMinY) / 2;
        this.height = this.width;
        if (this.oscillation < this.oscillationThreshold) {
          this.y -= oscillation;
          this.oscillation += oscillation;
        } else {
          this.y += oscillation;
          if (this.y >= this.bounds.esMaxY / 2)
            this.oscillation = 0;
        }
      }
      const angle = Math.PI / 180;
      this.quadrantsBoundTo = this.mapToQuadrant();
      this.rotate('right', angle, false);
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
      this.height = this.bounds.maxEntityHeight * 1.5;
      this.width = this.height;
      this.defineDPS();
      return this;
    }
    linearProgression(options) {
      const [time] = options;
      this.composite.twoDimContext.globalAlpha = 1;
      this.x = this.bounds.esMaxX / 2;
      this.y = this.bounds.esMaxY / 2 + this.height;
      const angle = Math.PI / 180;
      this.rotate('left', angle, false);
      this.quadrantsBoundTo = this.mapToQuadrant();
      this.height -= (this.height > 0) ? (this.height / 100) * time : 0;
      this.width -= (this.height > 0) ? 0 : (this.width / 100) * time;
    }
  }
  /*
   *Planet is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Planet extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
      this.maxWidth = this.bounds.maxEntityWidth * .75;
      this.minWidth = this.bounds.minEntityWidth * 1.75;
      this.minHeight = false;
      this.maxHeight = false;
    }
    init(avatar, player) {
      super.init(this.maxWidth, this.maxHeight, this.minWidth, this.minHeight);
      this.height = this.width;
      this.avatar = avatar;
      this.defineDPS();
      return this;
    }
  }
  /*
   *Asteroid is an Entity. It has a generic entity behaviour, and some of its own
   */
  class Asteroid extends Entity {
    constructor(avatar_id) {
      super();
      this.avatar_id = avatar_id;
      this.maxWidth = this.bounds.maxEntityWidth * .6;
      this.minWidth = this.bounds.minEntityWidth * 1.25;
      this.minHeight = false;
      this.maxHeight = false;
    }
    init(avatar, player) {
      super.init(this.maxWidth, this.maxHeight, this.minWidth, this.minHeight);
      this.height = (9 / 16) * this.width;
      this.avatar = avatar;
      this.defineDPS();
      return this;
    }
  }