/*
 *Blackhole is an Entity. It has a generic entity behaviour, and some of its own
 */
class Blackhole extends Entity {
  constructor( avatar_id ) {
    super();
    this.avatar_id = avatar_id;
  }
  /*
   *@init sets an avatar, position, size and gobbliness of a blackhole
   */
  init( avatar ) {
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
    this.gainThreshold = ( this.bounds.esMaxY - this.bounds.esMinY ) / 2;
    this.quadrantsBoundTo = this.mapToQuadrant();
    //There is a core, and then an event horizon
    //Define the width of the core to be the current initial width
    //plus a fraction of space
    this.core = {
      width: this.width + 10,
      height: this.height + 10
    };
    return this;
  }
  /*
   *@encircle creates gobbly illusions and an aura of a feeding blackhole
   */
  encircle( color = '#ffffff', width = 2 ) {
    this.composite.twoDimContext.lineWidth = width;
    this.composite.twoDimContext.strokeStyle = color;
    this.composite.twoDimContext.beginPath();
    this.composite.twoDimContext.arc( this.x + this.width / 2, this.y + this.height / 2, this.height / 2, this.currentTilt, Math.PI, false );
    this.composite.twoDimContext.stroke();
    this.composite.twoDimContext.closePath();
    this.composite.twoDimContext.lineWidth = 1;
    this.composite.twoDimContext.strokeStyle = '#d0d0d0';
    this.composite.twoDimContext.beginPath();
    this.composite.twoDimContext.arc( this.x + this.width / 2, this.y + this.height / 2, this.core.height / 2, this.currentTilt, Math.PI * 2, false );
    this.composite.twoDimContext.stroke();
    this.composite.twoDimContext.closePath();
    if ( this.eventHorizon ) {
      this.composite.twoDimContext.lineWidth = 1;
      this.composite.twoDimContext.strokeStyle = '#eee';
      this.composite.twoDimContext.beginPath();
      this.composite.twoDimContext.arc( this.x + this.width / 2, this.y + this.height / 2, this.eventHorizon.height / 2, this.currentTilt, Math.PI * -2, false );
      this.composite.twoDimContext.stroke();
      this.composite.twoDimContext.closePath();
    }
  }
  /*
   *@linearProgression overrides the default animation on an entity by super.
   *Blackholes need to grow in size, and oscillate
   */
  linearProgression( options ) {
    const [ time, acceleration, orientation ] = options;
    //Hack(s) to deflate the browser's animation frame drops on an inactive tab
    const Time = ( time > 0.1 || time <= 0 ) ? 0.1 : time;
    const factorOfTime = Time * acceleration;
    //If the width gain hasn't passed a pre defined threshold, increment it by a factor of time
    this.width += ( this.width >= this.gainThreshold ) ? 0 : ( this.gobbleThreshold * Time );
    //let the blackhole be symmetrical
    this.height = this.width;
    //if the width gained is equal or more than the threshold, oscillate
    if ( this.width >= this.gainThreshold ) {
      //the blackhole is now at it's largest possible size
      //define an event horizon
      this.max = this.max || Math.max( this.height, this.width );
      this.min = this.min || Math.min( this.height, this.width );
      this.eventHorizon = {
        width: this.width + this.width / 10,
        height: this.height + this.height / 10
      };
      /*define a threshold for oscillation. The blackhole should only oscillate between the *center of the entity space, and the minimum y of the entity space
       */
      this.oscillationThreshold = this.oscillationThreshold || ( this.bounds.esMaxY / 2 - this.max / 2 );
      //define an oscillation frequency
      //the blackhole should oscillate, by a factor of time
      const oscillation = this.oscillationThreshold * Time * this.lerpFactor;
      //If the blackhole has not swung to the threshold yet, continue swinging
      //increment counter towards the threshold
      //swing by decrementing y
      if ( this.oscillation < this.oscillationThreshold ) {
        this.y -= oscillation;
        this.oscillation += oscillation;
      }
      //If the blackhole has swung to a threshold, reset the threshold
      //swing back by increment of y
      else {
        this.y += oscillation;
        if ( this.y >= ( this.bounds.esMaxY / 2 ) ) {
          this.oscillation = 0;
        }
      }
      //While oscillation happens, the blackhole should move horizontally too
      //decrement x per frame by a factor of time
      this.x -= ( this.distancePerSecond.x ) * factorOfTime;
      //If out of canvas, drag back to bounds
      if ( this.x <= -this.width ) {
        this.x = this.bounds.esMaxX;
        //If the blackhole has oscillated the length of the canvas,
        //everytime it does so, increment the speed by a factor of time
        const dx = Drawing._bounds.maxX / ( this.width + this.height );
        this.distancePerSecond.x += Math.round( ( dx * factorOfTime ) * 100 ) / 100;
        //canvas span covered times ++
        this.pan++;
      }
    } else {
      //Until the blackhole feeds on the star, visually correlate the effect
      this.encircle( 'orange', 10 );
    }
    //map to quadrants of the Drawing
    this.quadrantsBoundTo = this.mapToQuadrant();
    //If the blakhole has covered the canvas length n number of times,
    //do something else, like start consuming matter
    if ( this.pan >= 1 ) {
      //collect all consumable entities
      const consumables = this.hasCollided();
      if ( consumables.size > 0 ) {
        for ( const consumable of consumables ) {
          //DO not consume a player, they are intelligent enough to avoid suction
          if ( consumable.constructor.name == 'Player' ) {
            //instead, show them who is the boss, by randomly shuffling their coordinates
            consumable.x += 2 * this.max;
            consumable.y = consumable.y - consumable.height / 2;
            if ( consumable.x > Drawing._bounds.maxX - consumable.width ) {
              consumable.x = Drawing._bounds.minX + 1;
            }
            consumable.render();
            consumable.tilt();
            consumable.quadrantsBoundTo = consumable.mapToQuadrant();
            consumable.affectedByBlackhole++;
          } else {
            //Yay! we can feed on these rocks
            consumable.width -= ( consumable.width / 100 ) * Time;
            consumable.height -= ( consumable.height / 100 ) * Time;
            //do not just feed, also throw them across space
            //like a slingshot, and invert their rotations
            consumable.x += this.max;
            consumable.adapt();
            consumable.rotate( 'right', this.currentTilt, false );
            //Why stop there? Also tamper their speeds
            const dx = ( consumable.width ) / Drawing._bounds.maxX;
            const sillyfactor = 4 * Math.round( ( dx * factorOfTime ) * 100 ) / 100;
            this.distancePerSecond.x += sillyfactor;
          }
        }
      }
    }
    //while all the above is happening, keep rotating
    const angle = Math.PI / 180;
    this.rotate( 'right', angle, false );
    //Create an impression of constant feeding
    this.encircle();
  }

}

/*
 *Star is an Entity. It has a generic entity behaviour, and some of its own
 */
class Star extends Entity {
  constructor( avatar_id ) {
    super();
    this.avatar_id = avatar_id;
  }
  init( avatar, player ) {
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
    this.max = Math.max( this.height, this.width );
    this.min = Math.min( this.height, this.width );
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
  linearProgression( options ) {
    const [ time ] = options;
    //Hack to deflate the browser's animation frame drops on an inactive tab
    const Time = ( time > 0.1 || time <= 0 ) ? 0.1 : time;
    //The star, is consumed by the blackhole in the game
    //SO, decrement the dimensions, by a factor of time
    this.height -= ( this.height <= 2 ) ? 0 : ( this.height ) * Time;
    this.width -= ( this.height >= 2 || this.width <= 0 ) ? 0 : ( this.width / 2 ) * Time;
    //Once the star has been consumed, move it off canvas
    if ( this.height <= 10 && this.width <= 10 ) {
      this.x = -Drawing._bounds.maxX;
      this.y = this.x;
      this.quadrantsBoundTo = this.mapToQuadrant();
    } else {

      const angle = Math.PI / 180;
      this.rotate( 'left', angle, false );
    }
  }
}
/*
 *Planet is an Entity. It has a generic entity behaviour, and some of its own
 */
class Planet extends Entity {
  constructor( avatar_id ) {
    super();
    this.avatar_id = avatar_id;
    //Set a predefined ceil and floor limit for planet's dimensions
    //else, a planet could be larger than a star
    this.maxWidth = this.bounds.maxEntityWidth * 0.75;
    this.minWidth = this.bounds.minEntityWidth * 1.75;
    this.minHeight = false;
    this.maxHeight = false;
  }
  init( avatar, player ) {
    super.init( this.maxWidth, this.maxHeight, this.minWidth, this.minHeight );
    //let the planet by symmetrical
    this.height = this.width;
    this.avatar = avatar;
    //pre calculate max,min for collisions and quadrants
    this.max = Math.max( this.height, this.width );
    this.min = Math.min( this.height, this.width );
    //redefine bounds according to the stars dimensions
    this.bounds.esMinY = this.bounds.esMinY + this.max;
    this.bounds.esMaxY = this.bounds.esMaxY - this.max;
    this.quadrantsBoundTo = this.mapToQuadrant();
    this.defineDPS();

    return this;
  }
  linearProgression( options ) {
    if ( this.width <= 2 && this.height <= 2 ) {
      this.x = -Drawing._bounds.maxX;
      this.y = this.x;
      this.quadrantsBoundTo = this.mapToQuadrant();
    } else {
      super.linearProgression( options );
    }
  }
}
/*
 *Asteroid is an Entity. It has a generic entity behaviour, and some of its own
 */
class Asteroid extends Entity {
  constructor( avatar_id ) {
    super();
    this.avatar_id = avatar_id;
    //Set a predefined ceil and floor limit for asteroid's dimensions
    //else, an asteroid could be larger than a star
    this.maxWidth = this.bounds.maxEntityWidth * 0.6;
    this.minWidth = this.bounds.minEntityWidth * 1.25;
    this.minHeight = false;
    this.maxHeight = false;
  }
  init( avatar, player ) {
    super.init( this.maxWidth, this.maxHeight, this.minWidth, this.minHeight );
    this.height = ( 9 / 16 ) * this.width;
    this.avatar = avatar;
    //define a distance to cover per second
    this.defineDPS();
    //precalculate max, min for collisions and quadrants
    this.max = Math.max( this.height, this.width );
    this.min = Math.min( this.height, this.width );
    //redefine bounds according to the stars dimensions
    this.bounds.esMinY = this.bounds.esMinY + this.max;
    this.bounds.esMaxY = this.bounds.esMaxY - this.max;
    this.quadrantsBoundTo = this.mapToQuadrant();
    return this;
  }
  linearProgression( options ) {
    if ( this.width <= 2 && this.height <= 2 ) {
      this.x = -Drawing._bounds.maxX;
      this.y = this.x;
      this.quadrantsBoundTo = this.mapToQuadrant();
    } else {
      super.linearProgression( options );
    }
  }
}

class Udacity extends Entity {
  constructor() {
    super();
  }
  init( avatar ) {
    super.init();
    this.width = this.bounds.maxEntityWidth * 1.1;
    this.height = this.bounds.maxEntityHeight * 0.99;
    //set an avatar
    this.avatar = avatar.value;
    //define a distance to cover per second
    this.defineDPS();
    //precalculate max, min for collisions and quadrants
    this.max = Math.max( this.height, this.width );
    this.min = Math.min( this.height, this.width );
    //redefine bounds according to the stars dimensions
    this.bounds.esMinY = this.bounds.esMinY + this.max;
    this.bounds.esMaxY = this.bounds.esMaxY - this.max;
    this.reset();
    this.render();
    return this;
  }
  reset() {
    this.x = Drawing._bounds.maxX - 2 * this.width;
    this.y = Drawing._bounds.minY;
    this.hasBeenFetched = false;
  }
  render() {
    if ( !this.hasBeenFetched ) {
      this.reset();
    } else {
      this.x = this.tow.x - this.width / 4;
      this.y = this.tow.y;
    }
    super.render( this.x, this.y, this.composite, true );
  }
}