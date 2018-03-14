/*
 *@Game is the constructor for an engine behind all that has to work, for the game to progress
 *It defines the various canvasses used, creates game entities, and maintains
 *their states at all times.
 *It constructs a game object, that defines critical helpers at the very minimum
 */
const Game = function () {
  //define a place to look for all the images to be used at various times.
  /*NOTE This also serves, as a prefix for the cache key to be generated per asset cached*/
  this.staticAssetsRoot = "./assets/rasters/";
};
/*
 *@init initializes the game, initializes individual components
 */
Game.prototype.init = function () {
  Engine.request('Layers');
  //gather configurables
  const Configuration = Configurations.get(this)
    .configuration;
  //define a cache, to cache media
  this.cache = new Cache(this.staticAssetsRoot);
  //Initializing Canvas
  this.spaceSprites = Configuration.Scenary.spaceSprites;
  this.spaceTimeColumn = Configuration.Scenary.spaceTimeColumn;
  //build spacetime
  this.spaceTimeContinuum = new SpaceTimeContinuum()
    .init();
  //Initializing Components
  //Player
  this.player = Engine.request('Player');
  this.playerVehicleOptions = Configuration.Player.Vehicles;
  //Entities
  this.matter = Configuration.Matter;
  this.entities = this.requestEntities();
  //Build complete, render and play
  //Render Scene
  this.renderScene();
  this.play();
  return this;
};
/*
 *@restart restarts the game
 */
Game.prototype.restart = function () {
  //reset player
  this.player.reset();
  //reset entities
  this.epoch = false;
  this.entities = this.requestEntities();
  this.play(true);
  return this;

};
/*
 *@play initiates the fist ever game on reload, or, a replay initiated by happenings and / or user feedback
 */
Game.prototype.play = function (restart = false) {
  const freshGame = () => {
    //ask feedback if this is the first game
    this.presentPlayerOptions()
      .then(hasBegun => {
        this.initLevel(1);
      }, isStalled => {
        //If the game hasn't begun, reload
        window.location.reload(true);
      })
      .catch(exception => {
        console.warn(exception);
      });
  };
  const Restart = () => {
    this.awaitMove()
      .then(hasBegun => {
        this.initLevel(Configurations.get(this)
          .meta.level);
      }, isStalled => {
        //If the game hasn't begun after three minutes, reload
        //Since this is a restart, the game essentially resets hard
        //And the user will need to begin all over again
        window.location.reload(true);
      })
      .catch(exception => {
        console.warn(exception);
      });
  };
  return (restart) ? Restart() : freshGame();
}
/*
 *
 */
Game.prototype.initLevel = function (level = 1) {
  let throttle;
  let requestNewEntities;
  let lastRequested;
  let additionalEntityRequests = 0;
  let then;
  let acceleration;
  const orientation = (Drawing._bounds.maxX > Drawing._bounds.maxY) ? "landscape" : "portrait";
  const timedRequest = (now) => {
    requestNewEntities = window.requestAnimationFrame(timedRequest);
    //time keeping stuff. If this is the first time post epoch new entities are requested,
    //time lag is the difference between game epoch, and now
    //else, time lag is the difference between now and the last time new entities were requested
    const time = (!lastRequested) ? (Date.now() - this.epoch) : (now - lastRequested);
    //nine seconds post game epoch, create new throttled number of entites
    if (!lastRequested && time >= 3600) {
      this.requestEntities(throttle);
      lastRequested = now;
    }
    //fifteen seconds into the game, create the last batch of new entities
    if (lastRequested && time > 12000) {
      this.requestEntities(throttle);
      if (additionalEntityRequests > 0) {
        for (let i = 0; i < additionalEntityRequests; i++) {
          this.requestEntities(++throttle);
        }
      }
      window.cancelAnimationFrame(requestNewEntities);
    }
  };
  const animation = (now) => {
    const loop = window.requestAnimationFrame(animation);
    Drawing.openFrame();
    then = then || now;
    const tsLastEntityMotion = 0.001 * (now - then); //in seconds
    for (const entity of this.entities) {
      if (entity.hasBeenRenderedOnCreation) {
        entity.skipClearOnTilt = true;
        entity.requestAnimationFrame('linearProgression', [tsLastEntityMotion, acceleration, orientation]);
      }
    }
    then = now;
    Drawing.closeFrame();
  };
  //level One
  const One = () => {
    Configurations.get(this)
      .meta.level = 1;
    //set an epoch for timed behaviours
    this.epoch = Date.now();
    //define a throttle to throttle number of entities created post epoch
    throttle = (Drawing._bounds.maxX > Drawing._bounds.maxY) ? 1 : 2;
    additionalEntityRequests = 1;
    acceleration = 1.5;
    window.requestAnimationFrame(timedRequest);
    window.requestAnimationFrame(animation);
  };
  One();
  return this;
};
/*
 *@requestEntities requests the game engine, to build, assemble individual non player
 *Entities
 */
Game.prototype.requestEntities = function (throttle = 0) {
  const epoch = this.epoch || false;
  //Entity requests procedure if the call to requestEntities is made after play began
  const addPostEpochEntities = () => {
    //create entities
    const entities = Engine.request('Entities', [this.matter, throttle]);
    //add them to the game tracking meta
    for (const entity of entities) {
      Configurations.get(this)
        .meta.entities.add(entity);
    }
    this.initEntities(entities);
    //copy them over locally for rendering later
    return this.entities = Configurations.get(this)
      .meta.entities;
  };
  //Entity requests procedure if the call to requestEntities is made prior to play - usually at game init
  const addPreEpochEntities = () => {
    //create new entities
    const entities = Engine.request('Entities', [this.matter, throttle]);
    //dump them into the game tracking meta for renders later
    Configurations.get(this)
      .meta.entities = entities;
    this.initEntities(entities);
    return entities;
  };
  return (epoch) ? addPostEpochEntities() : addPreEpochEntities();
};
/*
 *@initEntities caches avatars of each entity in this.entites, if not already cached earlier
 *then initializes each entity, making them render ready
 */
Game.prototype.initEntities = function (entities) {
  //collect avatars of individual matter types, to cache before render
  const collectCacheables = () => {
    const matter = [...this.matter];
    const reducer = (accumalate, matter) => {
      accumalate.unshift(matter.avatar);
      return accumalate;
    };
    return matter.reduce(reducer, []);
  };
  //If avatars have been collected before, use the collection, and do not go collecting
  this.entityAvatars = this.entityAvatars || collectCacheables();
  return this.cache.add(this.entityAvatars)
    .then(cache_keys => {
      //Initialize Entities
      for (const entity of entities) {
        const id = entity.avatar_id;
        const cache_key = `${this.staticAssetsRoot}${id}`;
        const avatar = this.cache.retrieve(cache_key);
        if (!avatar) throw (`The avatar for ${entity.constructor.name} is not cached`);
        entity.init(avatar.value, this.player);
        if (this.epoch) {
          entity.x = entity.bounds.esMinX;
          const ceil = entity.bounds.esMinY + entity.bounds.maxEntityWidth;
          const floor = entity.bounds.esMinY;
          entity.y = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
        }
        //render the entity and skipClear on render
        entity.render(entity.x, entity.y, false, true);
        //set a meta property for identifying entities ready for animation
        entity.hasBeenRenderedOnCreation = true;
      }
    })
    .catch(exception => {
      console.warn(exception);
    });
};
/*
 *@renderScene asynchronously builds and renders space
 */
Game.prototype.renderScene = function () {
  //add sprite building images to cache
  return this.cache.add(this.spaceSprites)
    .then(cache_keys => {
      //retrieve required column forming images from cache
      const assets = this.spaceTimeColumn.map(rowOfColumn => {
        const key = this.staticAssetsRoot + rowOfColumn;
        if (!this.cache.retrieve(key)) {
          throw (`No asset found at ${key}`);
        }
        return this.cache.retrieve(key)
          .value;
      });
      //construct a sprite from retrieved images
      return this.spaceTimeContinuum.constructScene(assets);
    }, error => {
      throw (error);
    })
    .then(scene => {
      //build a hologram of the constructed sprite
      if (!scene.tagName || scene.tagName.toLowerCase() !== 'canvas') {
        throw ('Scenary has to be a canvas element');
      }
      const animation = this.spaceTimeContinuum.initScrollableHologram(scene);
      //scroll the hologram
      return this.animate(this.spaceTimeContinuum, animation);
    }, error => {
      throw (error)
    })
    .catch(exception => {
      console.warn(exception);
    });
};

/*
 *@presentPlayerOptions caches available vehicles, accepts user input
 *initiates a player to be rendered on canvas
 */
Game.prototype.presentPlayerOptions = function () {
  return this.cache.add(this.playerVehicleOptions)
    .then(cache_keys => {
      const keys = [...cache_keys];
      const assets = keys.map(vehicle => {
        //retrieve asset from cache
        const asset = this.cache.retrieve(vehicle);
        if (!asset) throw (`vehicle ${vehicle} not available yet`);
        const proceed = () => { //build a responsive markup since these are images
          const responsiveMarkup = Engine.buildResponsiveImage(asset, './bundle/responsive-assets/rasters/');
          //identify a target DOM element within the markup on which, an event occurs
          const callBackTarget = `#${asset.name}`;
          //Construct a helper object for when user provides input
          const callBackOptions = {
            //params define the context to work on after a call back on the event is triggered
            //Also defines, any inputs to have handy in that context
            params: {
              context: {
                component: 'player',
                task: 'init'
              },
              input: asset
            },
            //the target DOM child of the above markup generated, on which an event occurs
            target: callBackTarget,
            //event to listen to, on the above target
            listenTo: 'click'
          };
          //present options
          this.presentOption(responsiveMarkup, callBackOptions);
        };
        if (asset) proceed();
        return asset;
      });
      return this.awaitMove();
    }, error => {
      throw (error);
    });
};
/*
 *@awaitMove awaits the user to use a desired trigger on the keyboard, to move the player onto the action scene
 */
Game.prototype.awaitMove = function () {
  return new Promise((hasBegun, reload) => {
    let animation;
    let then = 0;
    const wait = (now) => {
      //If the user has not begun the game yet, wait for a maximum of three minutes
      if (!this.player.moves || this.player.moves <= 0) {
        animation = window.requestAnimationFrame(wait);
        then = then || now;
        let dt = now - then;
        //If the game has not been begun by three minutes, reload the page
        if (dt > 180000) {
          reload();
        }
      } else {
        //If the uaser has begun the game, resolve this promise
        hasBegun(true);
        window.cancelAnimationFrame(animation);
      }
    };
    window.requestAnimationFrame(wait);
  });
};
/*
 *@presentOption presents a single option for the user to choose from
 *It then on an event on the pre specified target, initiates a read of user input
 */
Game.prototype.presentOption = function (markup, callBack) {
  //Function to call back - generic
  const Cb = () => {
    //Once feedback is received, remove available options
    $('.options')
      .find(callBack.target.animateOnCallback || '.animate')
      .toggle('slide', 'fast')
      .remove();
    $('.options')
      .hide(1000)
      .empty();
    //on presentating any option(s), we need to accept feedback
    return this.acceptUserInput(callBack.params);
  };
  //begin laying out options
  return $('.options')
    .css({
      background: '#d3d4de',
      opacity: 0.75,
      'z-index': 3
    })
    //finish laying out options
    .append(markup)
    //assign a click event listener
    .find(callBack.target)
    .css({
      cursor: 'pointer'
    })
    //call back on event
    .on(callBack.listenTo, Cb);
};
/*
 *@acceptUserInput, reads from user feedback, and initiates an appropriate Action/Task
 *@param resolve is Mandatory, and should be an object of context and input to that context
 *NOTE If the context property of the resolve object does not specify a specific component of the game,
 *the game takes over the task mentioned, making the task property of a context, MANDATORY
 */
Game.prototype.acceptUserInput = function (resolve) {
  const component = resolve.context.component || this;
  const task = resolve.context.task;
  return (component !== this) ? this[component][task](resolve.input) : this[task](resolve.input);
};
Game.prototype.animate = function (helperObject, animation) {
  //Time when animation begins
  let then, time = 0;
  //Time stamp on the last frame
  let timeLastFrame = 0;
  /*
   *@animate requests the animation frame.Then adds to the pre configured
   *animation parameters, the time since animation began
   *@param now is the current High res time stamp passed into @animate
   *by the current window's requestAnimationFrame method
   */
  const animate = (now) => {
    window.requestAnimationFrame(animate);
    then = then || now;
    time = (now - then) / 1000;
    return helperObject.requestAnimationFrame(animation, time);
  };
  //start animation
  window.requestAnimationFrame(animate);
};