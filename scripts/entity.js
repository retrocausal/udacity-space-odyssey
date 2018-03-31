/*
 *@Entity defines generic behaviours of any game entity
 *These behaviours need to be extended by individual entites, defining their individuality!
 */
class Entity {
  /*
   * Constructor plugs in a renderer for this entity
   * Requests movable space bounds
   * defines the composite layer to draw on
   */
  constructor() {
    this.renderer = new Matter()
      .init();
    const bounds = this.renderer.getBounds();
    this.bounds = Object.create( bounds );
    this.composite = this.renderer.composite;
  }
  /*
   *@Init receives options to randomly size this entity
   * Sizes this entity, and defines this entity's angle of rotation
   * Finally, assigns a random X,Y coordinate as this entity's position
   */
  init( ...options ) {
    let [ maxW, maxH, minW, minH ] = options;
    //Define a preset fraction to move per frame of total movement
    this.lerpFactor = 0.25;
    [ this.width, this.height ] = this.size( maxW, maxH, minW, minH );
    //Define an angle of rotation per frame
    this.radians = 15 * ( Math.PI / 180 );
    //initialize a current tilt angle
    //rotation per rotation call will be the sum total of this.radians and this.currentTilt
    this.currentTilt = 0;
    //randomly position this entity
    [ this.x, this.y ] = this.position();
    return this;
  }
  /*
   *@defineDPS defines an entities speed per second
   */
  defineDPS() {
    //Set A Maximum Distance To Cover Per move
    this.distancePerSecond = {
      x: Math.ceil( ( this.bounds.esMaxX ) / ( this.width ) ),
      y: Math.ceil( ( this.bounds.esMaxY ) / ( this.height ) )
    };
  }
  /*
   *@size defines a random dimension for this entity
   */
  size( ...options ) {
    let [ ceilWidth, ceilHeight, floorWidth, floorHeight ] = options;
    const ceilW = ceilWidth || this.bounds.maxEntityWidth;
    const ceilH = ceilHeight || this.bounds.maxEntityHeight;
    const floorW = floorWidth || this.bounds.minEntityWidth;
    const floorH = floorHeight || this.bounds.minEntityHeight;
    const randomW = Math.floor( Math.random() * ( ceilW - floorW + 1 ) ) + floorW;
    const randomH = Math.floor( Math.random() * ( ceilH - floorH + 1 ) ) + floorH;
    return [ randomW, randomH ];
  }
  /*
   *@render renders this entity on a predefined/specified position on the composite/specified layer
   */
  render( ...options ) {
    let [ x = false, y = false, layer = false, skipClear = false ] = options;
    const X = ( x !== false ) ? x : this.x;
    const Y = ( y !== false ) ? y : this.y;
    const composite = layer || this.composite;
    return this.renderer.paint( this.avatar, X, Y, this.width, this.height, composite, skipClear );
  }
  /*
   *@position randomly generates an initial position for this entity on the composite layer
   */
  position() {
    const randomX = Math.floor( Math.random() * ( ( this.bounds.esMaxX - this.bounds.maxEntityWidth ) - this.bounds.esMinX + 1 ) ) + this.bounds.esMinX;
    const randomY = Math.floor( Math.random() * ( ( this.bounds.esMaxY - this.bounds.maxEntityHeight ) - this.bounds.esMinY + 1 ) ) + this.bounds.esMinY;
    return [ randomX, randomY ];
  }
  /*
   *Adaptive positioning of this entity, per context on a frame
   */
  adapt( orientation = 'landscape' ) {
    let queryY, queryX;
    queryY = this.y + this.height;
    queryX = this.x;
    const max = this.max || Math.max( this.height, this.width );
    const min = this.min || Math.min( this.height, this.width );
    const exceedsesMaxY = ( queryY >= this.bounds.esMaxY );
    const exceedsesMaxX = ( queryX >= this.bounds.esMaxX );
    if ( exceedsesMaxY && orientation == 'portrait' ) {
      this.y = this.bounds.esMinY;
      const ceil = this.bounds.esMaxX - max;
      const floor = this.bounds.esMinX;
      this.x = Math.floor( Math.random() * ( ceil - floor + 1 ) ) + floor;
    }
    if ( exceedsesMaxX && orientation == 'landscape' ) {
      this.x = this.bounds.esMinX - this.width;
      const ceil = this.bounds.esMaxY;
      const floor = this.bounds.esMinY;
      this.y = Math.floor( Math.random() * ( ceil - floor + 1 ) ) + floor;
    }
  }
  /*
   *@mapToQuadrant maps this entity on to a predefined quadrant on the composite layer
   */
  mapToQuadrant() {
    //gather pre defined quadrants
    const quadrants = Drawing._bounds.quadrants;
    const max = this.max || Math.max( this.height, this.width );
    const threshold = this.height / 2;
    //identify quadrants this entity is bound by, depending on its current position
    const reducer = ( accumalate, quadrant ) => {
      //define max and min binding canvas quadrant positions
      let quadrantMaxHorizontalSpan = quadrant.maxX;
      let quadrantMinHorizontalSpan = quadrant.minX;
      let quadrantMaxVerticalSpan = quadrant.maxY;
      let quadrantMinVerticalSpan = quadrant.minY;
      //If we are looking at quadrant bounds that involve canvas bounds,
      //we need to extend the range by the width of this entity
      //because, an entity is not off canvas, until, the entire entity has moved off canvas
      if ( quadrant.id === 0 || quadrant.id == 3 ) {
        quadrantMinHorizontalSpan -= max;
      } else {
        quadrantMaxHorizontalSpan += max;
      }
      //This entitiy is quadrant bounds along the x axis if, either of the three points
      //entity.x / entity.x -height/2 / entity.x +height/2 exist within the bounds of the quadrant
      const quadrantXBound = ( quadrantMinHorizontalSpan <= ( this.x ) && ( this.x ) <= quadrantMaxHorizontalSpan ) || ( quadrantMinHorizontalSpan <= ( this.x - threshold ) && ( this.x - threshold ) <= quadrantMaxHorizontalSpan ) || ( quadrantMinHorizontalSpan <= ( this.x + threshold ) && ( this.x + threshold ) <= quadrantMaxHorizontalSpan );
      //similar to the considerations above, for entity.y
      const quadrantYBound = ( quadrantMinVerticalSpan <= ( this.y ) && ( this.y ) <= quadrantMaxVerticalSpan ) || ( quadrantMinVerticalSpan <= ( this.y - threshold ) && ( this.y - threshold ) <= quadrantMaxVerticalSpan ) || ( quadrantMinVerticalSpan <= ( this.y + threshold ) && ( this.y + threshold ) <= quadrantMaxVerticalSpan );
      //Do not bind an entity that is off canvas
      const investigate = ( ( Drawing._bounds.minX - max ) <= this.x && this.x <= ( Drawing._bounds.maxX + max ) ) && ( ( Drawing._bounds.minY ) <= this.y && this.y <= ( Drawing._bounds.maxY ) );
      //If this entity is bound by the current quadrant being investigated, add it to the set of entities
      //mapped by the current quadrant
      if ( investigate && ( quadrantXBound && quadrantYBound ) ) {
        Drawing._QEM.get( quadrant )
          .add( this );
        accumalate.add( quadrant );
      } //else, delete this entity from the set of entities mapped by the current quadrant
      else {
        Drawing._QEM.get( quadrant )
          .delete( this );
      }
      return accumalate;
    };
    //return a list of quadrants this entity occupies at the moment
    const qbt = quadrants.reduce( reducer, new Set() );
    return ( qbt.size > 0 ) ? qbt : new Set();
  }
  /*
   *@isSuperposedOn checks if this entity, is superposed on another entity
   */
  isSuperposedOn( entity ) {
    const oRadius = entity.height / 2;
    const Radius = this.height / 2;
    const deltaX = Math.abs( ( this.x + this.width / 2 ) - ( entity.x + entity.width / 2 ) );
    const deltaY = Math.abs( ( this.y + this.height / 2 ) - ( entity.y + entity.height / 2 ) );
    const hypotenuse = Math.sqrt( deltaX * deltaX + deltaY * deltaY );
    const threshold = oRadius + Radius;
    const altRadius = this.width / 2;
    const altoRadius = entity.width / 2;
    const altThreshold = altRadius + altoRadius;
    //Do not collide with an entity that is off canvas
    const collidableEntity = ( ( Drawing._bounds.minX - entity.max / 2 ) <= entity.x && entity.x <= ( Drawing._bounds.maxX + entity.max / 2 ) ) && ( ( entity.bounds.esMinY ) <= entity.y && entity.y <= ( entity.bounds.esMaxY ) );
    return collidableEntity && hypotenuse < threshold;
  }
  /*
   *@increment increments the number of an entity on the drawing
   */
  increment() {
    const name = this.constructor.name;
    Entity[ name ] = Entity[ name ] || 0;
    return ++Entity[ name ];
  }
  /*
   *@lerp linear interpolates the transition between coordinates
   */
  lerp( dx, dy ) {
    this.x = this.x + ( dx ) * this.lerpFactor;
    this.y = this.y + ( dy ) * this.lerpFactor;
  }
  /*
   *@rotate defines one rotation along the center of this entity by an angle specified / by 15 degrees
   */
  rotate( direction = 'left', angle = false, animate = true ) {
    let radians = 0;
    let rotation;
    const Angle = angle || this.radians;
    const tilt = Angle / 10;
    //Is there a current level of tilt?
    //If not, Is the direction right / left?
    //Set the tilt before animation, based on the above
    this.currentTilt = this.currentTilt || ( ( direction === 'right' ) ? tilt : -1 * tilt );
    /*
     *@Animate animates a rotation. Uses a concept similar to lerp
     * Smooth rotations
     */
    const Animate = () => {
      //Decide whther to rotate this entity
      if ( radians < Angle ) {
        rotation = window.requestAnimationFrame( Animate );
      } else {
        window.cancelAnimationFrame( rotation );
      }
      this.tilt();
      //increment radians by a tenth of 15 degrees
      radians += tilt;
      //increment current tilt on entity by the same measure of the Angle too, as reference to next call to rotation,
      //as well as next frame in this animation call
      this.currentTilt += ( direction === 'right' ) ? tilt : ( -1 ) * tilt;
    };
    /*
     *Rotate sans animation - to be used for when smooth rotations aren't required
     */
    const sansAnimation = () => {
      this.currentTilt = this.currentTilt || 0;
      this.currentTilt += ( direction === 'right' ) ? angle : -1 * angle;
      this.tilt();
    };
    if ( animate )
      window.requestAnimationFrame( Animate );
    else
      sansAnimation();
    return this;
  }
  /*
   *@tilt tilts this entity by the current angle of tilt.
   *Use this to tilt this entity before linear motion
   */
  tilt() {
    if ( this.currentTilt ) {
      //Check if the entity has rotated a full circle.
      //Either clockwise / anitclockwise. In case the entity has completed a single
      //rotation, reset angles.
      //Done so that, the angle of tilt stays between -360 to +360
      if ( this.currentTilt >= ( 360 * Math.PI / 180 ) ) {
        this.currentTilt = this.currentTilt - ( 360 * Math.PI / 180 );
      } else if ( this.currentTilt < ( -360 * Math.PI / 180 ) ) {
        this.currentTilt = this.currentTilt + ( 360 * Math.PI / 180 );
      }
      //clear canvas
      if ( !this.skipClearOnTilt ) this.renderer.clear( this.composite.canvas );
      //save context
      this.composite.twoDimContext.save();
      //translate to the center of this entity
      this.composite.twoDimContext.translate( ( this.x + this.width / 2 ), ( this.y + this.height / 2 ) );
      //rotate by currentTilt
      this.composite.twoDimContext.rotate( this.currentTilt );
      //draw this entity's avatar on new coordinates because of tilt
      //do not clear canvas, because we already have done it above
      this.render( -this.width / 2, -this.height / 2, this.composite, true );
      //restore context
      this.composite.twoDimContext.restore();
    }
  }
  /*
   *@spin animates rotation on this entity
   */
  spin() {
    const spin = ( now ) => {
      window.requestAnimationFrame( spin );
      this.rotate( 'right', 1 * ( Math.PI / 180 ) );
    };
    return window.requestAnimationFrame( spin );
  }
  /*
   *@interpolatedMotion moves this entity via LERP
   *@params dx,dy are Mandatory, and specify the distances to cover per axis
   */
  interpolatedMotion( dx, dy ) {
    this.lerp( dx, dy );
    const render = /*render this player without tilt, if there is no angle of tilt*/
      ( !this.currentTilt ) ? this.render() :
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
  requestAnimationFrame( animation, options ) {
    return this[ animation ]( options );
  }
  /*
   *@linearProgression defines motion of this entity along X or along Y
   *It has options to swap the axis of movement
   *It moves the entity by a factor of frame interval
   */
  linearProgression( options ) {
    const [ time, acceleration, orientation, swap ] = options;
    //hack to deflate the browser's animation frame throttle on inactive tabs
    const Time = ( time > 0.1 || time <= 0 ) ? 0.1 : time;
    let dx, dy;
    //if a request for swapping orientation is made, swap distances to move
    if ( !swap ) {
      dx = ( orientation == 'landscape' ) ? this.distancePerSecond.x : 0;
      dy = ( orientation == 'portrait' ) ? this.distancePerSecond.y : 0;
    } else {
      dx = ( orientation == 'landscape' ) ? 0 : this.distancePerSecond.x;
      dy = ( orientation == 'portrait' ) ? 0 : this.distancePerSecond.y;
    }
    //define distance this frame
    const Dx = Math.round( ( dx * Time * acceleration ) * 100 ) / 100;
    const Dy = Math.round( ( dy * Time * acceleration ) * 100 ) / 100;
    //total distance is the distance for this frame plus the current position
    this.x = this.x + Dx;
    this.y = this.y + Dy;
    //pull off canvas entities back on to canvas
    this.adapt( orientation );
    //map this entity to binding quadrants
    this.quadrantsBoundTo = this.mapToQuadrant();
    //finally, rotate this entity
    const angle = Math.PI / 180;
    this.rotate( 'left', angle, false );
    //The entity's speed need not be a constant
    this.distancePerSecond.x += time / ( 2 * acceleration );
  }
  /*
   *@hasCollided first accumalates entities in the same spacial grid as this entity
   *Then, loops through the identified set of entities individually, to check for superpositions
   *of this entity and the entity in loop
   *Returns a set of colliding entities, or, en empty set
   */
  hasCollided() {
    //Loop through entities mapped to the quadrant this entity is on
    const getSuperposedEntities = ( entities ) => {
      let superposedEntities = new Set();
      for ( const entity of entities ) {
        //If this entity is superposed on the entity in this loop
        //add the entity in this loop to a cllecting set
        if ( this.isSuperposedOn( entity ) ) {
          superposedEntities.add( entity );
        }
      }
      return superposedEntities;
    };
    //Used to reduce entities to a set of entities within the quadrant(s) this entity is mapped to
    const reducer = ( accumalate, entitiesMappedToQuadrant ) => {
      const entitiesInQuadrant = Drawing._QEM.get( entitiesMappedToQuadrant );
      const doThisReduction = ( entitiesInQuadrant.size > 0 );
      if ( doThisReduction ) {
        for ( const entity of entitiesInQuadrant ) {
          if ( entity !== this ) {
            accumalate.add( entity );
          }
        }
      }
      return accumalate;
    };
    //identify collidables
    const entitiesInMySpacialDiv = [ ...this.quadrantsBoundTo ].reduce( reducer, new Set() );
    //check and return superposed set of entities
    return ( entitiesInMySpacialDiv.size > 0 ) ? getSuperposedEntities( entitiesInMySpacialDiv ) : new Set();
  }
  /*
   *@encricle creates line strokes on rotation around this entity
   */
  encircle( color = '#ffffff', width = 2 ) {
    this.composite.twoDimContext.lineWidth = width;
    this.composite.twoDimContext.strokeStyle = color;
    this.composite.twoDimContext.beginPath();
    this.composite.twoDimContext.arc( this.x + this.width / 2, this.y + this.height / 2, this.height / 2, 0, Math.PI * 2, true );
    this.composite.twoDimContext.stroke();
  }
}