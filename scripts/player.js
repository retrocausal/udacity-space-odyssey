/*
 *@Player extends an Entity and defines a Player
 */
class Player extends Entity {
  /*
   * Constructor defines a custom composite layer for a Player
   */
  constructor() {
    super();
    const id = `player-composite-${this.increment()}`;
    const composite = this.renderer.setCustomComposite( id );
    this.composite = Drawing._layers.get( composite.canvas );
  }
  /*
   *@init identifies a rendering context, overrides the pre initialized random x,y positions
   *Renders and registers event listeners for this player on the compositing canvas
   */
  init( avatar ) {
    super.init();
    //set an avatar
    this.avatar = avatar.value;
    this.reset();
    //register appropriate event listeners for depicting motion on the compositing canvas
    this.interrupts = this.registerInterruptHandlers();
    this.manifest();
    return this;
  }
  /*
   *@reset resets a player to it's initial position
   *resets a Player's size, speed, tilt
   *And clears all met objectives
   */
  reset( preserveMoves ) {
    this.moves = ( preserveMoves ) ? this.moves : 0;
    //set/reset dimensions
    this.width = this.bounds.maxEntityWidth;
    this.height = this.bounds.maxEntityHeight;
    this.max = Math.max( this.height, this.width );
    //Set A Distance To Cover Per Trigger
    this.distancePerTrigger = {
      x: Math.ceil( ( Drawing._bounds.maxX ) / ( this.width ) ),
      y: Math.ceil( ( Drawing._bounds.maxY ) / ( this.height ) )
    };
    //override pre defined initial positions, and place this player, bang at the center of the bottom most layer
    this.x = ( Drawing._bounds.maxX ) / 2;
    this.y = Drawing._bounds.maxY - this.bounds.maxEntityHeight;
    //Reset current propogation states
    //This player is yet to move
    [ this.movingUp, this.movingDown, this.movingLeft, this.movingRight ] = [ false, false, false, false ];
    //Reset a Player's objectives to win
    this.toBeRescued = false;
    this.hasFetchedImperilled = false;
    this.hasBeganDocking = true;
    this.hasReturned = false;
    this.isReturning = false;
    //reset tilt
    this.currentTilt = 0;
  }
  /*
   *@manifest renders and activates the player
   */
  manifest() {
    //map to quadrants spacially
    this.quadrantsBoundTo = this.mapToQuadrant();
    //render this player
    this.render();
    //activate key stroke / click based movement
    this.interrupts.listen();
  }
  /*
   *@hasCollided extends the super's hasCollided behaviour, with some exceptions
   */
  hasCollided() {
    const outOfCollidableSpace = ( this.y >= this.bounds.esMaxY );
    const entitiesCollidedWith = super.hasCollided();
    const noCollision = ( entitiesCollidedWith.size < 1 );
    const blackholeCollision = ( entitiesCollidedWith.size == 1 ) && ( entitiesCollidedWith[ Symbol.iterator ]()
      .next()
      .value.constructor.name == 'Blackhole' );
    if ( outOfCollidableSpace || noCollision || blackholeCollision ) {
      return false;
    }
    //If the logic has reached this point to investigate,
    //The player has collided - Be deaf to movement interrupts
    this.interrupts.deafen();
    return true;
  }
  /*
   *@hasStoppedPropogations checks if all interpolated motions have stopped
   */
  hasStoppedPropogations() {
    return ( this.movingUp === false && this.movingDown === false && this.movingLeft === false && this.movingRight === false );
  }
  /*
   *@isReadyToRescue checks if this Player is ready to rescue the imperilled
   */
  isReadyToRescue() {
    return ( this.y < this.bounds.esMinY && ( 1.41 <= this.currentTilt && this.currentTilt <= 1.92 ) );
  }
  /*
   *@beginRescue DOCKS this Player with the imperilled
   * and readies the imperilled to be towed back
   */
  beginRescue() {
    const X = this.toBeRescued.x;
    //The player needs to move the below distance
    let threshold = Math.abs( X - this.x );
    //The Player needs to move by this distance per frame
    const dx = ( X > this.x ) ? this.distancePerTrigger.x : this.distancePerTrigger.x * -1;
    const dy = 0;
    let animation;
    /*
     *@animate moves the player to the imperilled
     * in smooth transitions
     */
    const animate = () => {
      animation = window.requestAnimationFrame( animate );
      //If the player has occupied a fourth of the imperilled's width
      //after superposing, stop the docking mechanism
      if ( threshold <= this.toBeRescued.width / 4 ) {
        window.cancelAnimationFrame( animation );
        //And set all docking switches off
        this.hasFetchedImperilled = true;
        this.toBeRescued.hasBeenFetched = true;
        //Finally, let the imperilled know, they need to follow this Player
        this.toBeRescued.tow = Object.create( this );
      } else {
        //PLayer is yet to dock, keep moving towards the imperilled
        this.interpolatedMotion( dx, dy );
        threshold = Math.abs( X - this.x );
      }
    };
    //As soon as the rescue begins, the context needs to know,
    // a repeat docking should not be attempted
    this.hasBeganDocking = false;
    window.requestAnimationFrame( animate );
  }
  /*
   *@finishRescue finishes the touchdown on safe earth, with the imperilled in tow.
   */
  finishRescue() {
    const X = Drawing._bounds.maxX / 2;
    //The Player needs to move by this distance,
    //below, to be at home coordinates
    let threshold = Math.abs( X - this.x );
    //And has to move by this distance per frame
    const dx = ( X > this.x ) ? this.distancePerTrigger.x : this.distancePerTrigger.x * -1;
    const dy = 0;
    let animation;
    /*
     *@animate animates the final auto landing feature
     */
    const animate = () => {
      animation = window.requestAnimationFrame( animate );
      if ( threshold <= this.distancePerTrigger.x ) {
        window.cancelAnimationFrame( animation );
        this.hasReturned = true;
      } else {
        this.interpolatedMotion( dx, dy );
        threshold = Math.abs( X - this.x );
      }
    };
    //As soon as the landing begins, the rescue is done
    //Flip all mayday switches off
    //sit tight for re entry
    this.isReturning = true;
    this.interrupts.deafen();
    //reach home
    this.y = Drawing.bounds.maxY - this.height;
    this.render();
    window.requestAnimationFrame( animate );
  }
  /*
   *@registerInterruptHandlers registers a set of acceptable motion triggers
   *And Also, activates them.
   */
  registerInterruptHandlers() {
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
        animation = window.requestAnimationFrame( animate );
        //Only move up, if the player's current vertical position is yet to cross the threshold
        //And, if the threshold itself, is not beyond the canvas
        if ( this.y <= threshold || threshold < ( Drawing._bounds.minY ) ) {
          window.cancelAnimationFrame( animation );
          this.movingUp = false;
        } else {
          this.interpolatedMotion( dx, dy );
          this.movingUp = true;
        }
      };
      if ( !this.movingUp ) {
        if ( this.y >= Drawing._bounds.minY + this.bounds.maxEntityHeight ) this.moves++;
        if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
          this.beginRescue();
        } else if ( this.hasFetchedImperilled && !this.isReturning && this.y >= this.bounds.esMaxY - this.distancePerTrigger.y ) {
          this.finishRescue();
        } else
          window.requestAnimationFrame( animate );
      }
      return false;
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
        animation = window.requestAnimationFrame( animate );
        //Only move down, if the player's current vertical position is yet to cross the threshold
        //And, if the threshold itself, is not beyond the canvas
        if ( this.y >= threshold || threshold > ( Drawing._bounds.maxY - this.height ) ) {
          window.cancelAnimationFrame( animation );
          this.movingDown = false;
        } else {
          this.interpolatedMotion( dx, dy );
          this.movingDown = true;
        }
      };
      if ( !this.movingDown ) {
        if ( this.moves > 0 && this.y < Drawing._bounds.maxY - this.bounds.maxEntityHeight ) this.moves++;
        if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
          this.beginRescue();
        } else if ( this.hasFetchedImperilled && !this.isReturning && this.y >= this.bounds.esMaxY - this.distancePerTrigger.y ) {
          this.finishRescue();
        } else
          window.requestAnimationFrame( animate );
      }
      return false;
    };
    const arrowRightHandler = () => {
      //player will not move vertically
      const dy = 0;
      //player has to move a certain predefined distance per trigger
      let dx = this.distancePerTrigger.x;
      //threshold is, the current horizontal postion of the player, plus the distance per trigger to cover
      let threshold = this.x + dx;
      //if the threshold to move to, is beyond the canvas, reset the player's horizontal position to a minimum
      if ( threshold > ( Drawing._bounds.maxX - this.width / 2 ) ) {
        this.x = Drawing._bounds.minX - this.width / 2;
        //reset threshold
        threshold = this.x + this.width / 2;
      }
      let animation;
      const animate = () => {
        animation = window.requestAnimationFrame( animate );
        //Only move, if the threshold, is greater than the current horizontal position of the plaayer
        if ( this.x < threshold ) {
          this.movingRight = true;
          this.interpolatedMotion( dx, dy );
        } else {
          window.cancelAnimationFrame( animation );
          this.movingRight = false;
        }
      };
      if ( !this.movingRight ) {
        this.moves++;
        if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
          this.beginRescue();
        } else
          window.requestAnimationFrame( animate );
      }
      return false;
    };
    const arrowLeftHandler = () => {
      //player will not move vertically
      const dy = 0;
      //player has to move a certain predefined distance per trigger
      let dx = this.distancePerTrigger.x * -1;
      //threshold is, the current horizontal postion of the player, plus the distance per trigger to cover
      let threshold = this.x + dx;
      //if the threshold to move to, is beyond the canvas, reset the player's horizontal position to a minimum
      if ( threshold < ( Drawing._bounds.minX - this.width / 2 ) ) {
        this.x = Drawing._bounds.maxX;
        //reset threshold
        threshold = this.x - this.width / 2;
      }
      let animation;
      const animate = () => {
        animation = window.requestAnimationFrame( animate );
        //Only move, if the threshold, is greater than the current horizontal position of the plaayer
        if ( this.x > threshold ) {
          this.movingLeft = true;
          this.interpolatedMotion( dx, dy );
        } else {
          window.cancelAnimationFrame( animation );
          this.movingLeft = false;
        }
      };
      if ( !this.movingLeft ) {
        this.moves++;
        if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
          this.beginRescue();
        } else
          window.requestAnimationFrame( animate );
      }
      return false;
    };
    const arrowRightAltHandler = () => {
      if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
        this.beginRescue();
      } else
        this.rotate( 'right' );
    };
    const arrowLeftAltHandler = () => {
      if ( this.isReadyToRescue() && this.hasBeganDocking && !this.hasFetchedImperilled ) {
        this.beginRescue();
      } else
        this.rotate();
    };
    //define a map of acceptable keyboard triggers to action on that trigger
    //This helps to define a particular player motion on the compositing canvas
    const actionableTriggers = new Map();
    const unactionables = new Set( [ 'Control', 'Tab', 'Shift', 'Alt' ] );
    actionableTriggers.set( 'ArrowUp', arrowUpHandler );
    actionableTriggers.set( 'ArrowDown', arrowDownHandler );
    actionableTriggers.set( 'ArrowLeft', arrowLeftHandler );
    actionableTriggers.set( 'ArrowRight', arrowRightHandler );
    actionableTriggers.set( 'altArrowLeft', arrowLeftAltHandler );
    actionableTriggers.set( 'altArrowRight', arrowRightAltHandler );
    //A trigger, has two states. On, or Off. initialize it to off.
    //On is when, an acceptable key is pressed
    //Off is when, the  previously pressed key is released
    let kbdTrigger = false;
    let MatchableAlternateTrigger = false;
    //define an event chain to handle
    //A handler for key up events
    /*
     *@keyUp is to be used, only after a keyDown, and not separately
     *Or, to put it another way, this should not individually be triggered, and is explicitly
     *called by a keyDown handler when a keydown event occurs
     */
    const keyUp = ( keyUpEvent ) => {
      let AlternateTrigger = false;
      const key = keyUpEvent.key;
      //rerecord alt
      const alt = keyUpEvent.altKey;
      if ( alt ) {
        keyUpEvent.preventDefault();
        AlternateTrigger = `alt${key}`;
      }
      //If the user used a plain keyboard action (one of the arrow keys)
      //Recognize the trigger, and set it off
      const normalTrigger = !unactionables.has( key ) && key === kbdTrigger && !AlternateTrigger;
      if ( normalTrigger ) {
        const triggerAction = actionableTriggers.get( kbdTrigger ) || false;
        if ( triggerAction ) {
          triggerAction();
        }
        //release pressed trigger
        kbdTrigger = false;
      }
      //If the user pressed 'ALT' + 'KBD ARROW KEY'
      //recognize the alternate trigger and set it off
      const altTrigger = AlternateTrigger && MatchableAlternateTrigger && ( AlternateTrigger === MatchableAlternateTrigger );
      if ( altTrigger ) {
        const triggerAltAction = actionableTriggers.get( AlternateTrigger ) || false;
        if ( triggerAltAction ) {
          triggerAltAction();
        }
        //release AlternateTrigger
        MatchableAlternateTrigger = false;
        AlternateTrigger = false;
      }
      return false;
    };
    const addkeyUpListener = () => {
      document.addEventListener( 'keyup', keyUp, false );
    };
    const removekeyUpListener = () => {
      document.removeEventListener( 'keyup', keyUp, false );
    };
    //A keyDown handler
    const keyDown = ( keyDownEvent ) => {
      //which key?
      const key = keyDownEvent.key;
      //was alt pressed too?
      const alt = keyDownEvent.altKey;
      //if yes, prevent default action for alt key
      if ( alt ) {
        keyDownEvent.preventDefault();
        MatchableAlternateTrigger = `alt${key}`;
      }
      if ( key == 'ArrowDown' || key == 'ArrowUp' ) {
        keyDownEvent.preventDefault();
      }
      //Only When a new key is pressed, record events
      //If the user holds down a particular key, for example, do not
      //record that event
      //Also, do not process unactionables alone, unless they are pressed with an option
      if ( actionableTriggers.has( key ) && ( key !== kbdTrigger ) && !unactionables.has( key ) ) {
        //record action on keyboard, identify task
        kbdTrigger = key;
        addkeyUpListener();
      }
      return false;
    };
    const addKeyDownListener = () => {
      document.addEventListener( 'keydown', keyDown, false );
    };
    const removeKeyDownListener = () => {
      removekeyUpListener();
      document.removeEventListener( 'keydown', keyDown, false );
    };
    //Activate Panel
    const cpanelUp = document.querySelector( '#ctrl-up' );
    const cpanelDown = document.querySelector( '#ctrl-down' );
    const cpanelRight = document.querySelector( '#ctrl-right' );
    const cpanelLeft = document.querySelector( '#ctrl-left' );
    const listen = () => {
      addKeyDownListener();
      cpanelUp.addEventListener( 'click', arrowUpHandler, false );
      cpanelDown.addEventListener( 'click', arrowDownHandler, false );
      cpanelLeft.addEventListener( 'click', arrowLeftHandler, false );
      cpanelRight.addEventListener( 'click', arrowRightHandler, false );
    };
    const deafen = () => {
      removeKeyDownListener();
      cpanelUp.removeEventListener( 'click', arrowUpHandler, false );
      cpanelDown.removeEventListener( 'click', arrowDownHandler, false );
      cpanelLeft.removeEventListener( 'click', arrowLeftHandler, false );
      cpanelRight.removeEventListener( 'click', arrowRightHandler, false );
    };

    return {
      listen: listen,
      deafen: deafen
    };
  }
}