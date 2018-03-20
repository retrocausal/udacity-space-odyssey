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
  //Imperilled
  this.imperilled = Engine.request('Imperilled');
  this.cache.add(Configuration.Imperilled.avatar)
    .then(cache_keys => {
      const key = cache_keys[Symbol.iterator]()
        .next()
        .value;
      const asset = this.cache.retrieve(key);
      this.imperilled.init(asset);
      //Build complete, render and play
      //Render Scene
      this.renderScene();
      this.play();
    })
    .catch(exception => {
      console.warn(exception);
    });
  return this;
};
/*
 *@restart restarts the game
 */
Game.prototype.restart = function (options = {
  hardReload: false,
  preserveMoves: true
}) {
  let {
    hardReload,
    preserveMoves
  } = options;
  if (hardReload) {
    return window.location.reload(true);
  }
  Drawing.clearQEMs();
  //reset game start time - this needs to be set by the initialized level of play
  this.epoch = false;
  //reset all entities;
  this.entities = this.requestEntities();
  //reset player
  this.player.reset(preserveMoves);
  this.imperilled.reset();
  //play
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
        this.player.rescue = this.imperilled;
        this.initLevel();
      }, isStalled => {
        //If the game hasn't begun, reload
        window.location.reload(true);
      })
      .catch(exception => {
        console.warn(exception);
      });
  };
  const Restart = () => {
    this.player.manifest();
    this.awaitMove(this.player.moves)
      .then(hasBegun => {
        this.player.rescue = this.imperilled;
        this.initLevel(Configurations.get(this)
          .meta.level);
      }, isStalled => {
        //If the game hasn't begun, reload
        window.location.reload(true);
      })
      .catch(exception => {
        console.warn(exception);
      });
  };
  return (restart) ? Restart() : freshGame();
};
/*
 *@initLevel initates a level of play, and begins animations
 */
Game.prototype.initLevel = function (level) {
  //state holders for new batched infusion of entitites
  let needNewEntities, then, requestNewEntities;
  //current level of play
  let currentLevel;
  const orientation = (Drawing._bounds.maxX > Drawing._bounds.maxY) ? "landscape" : "portrait";
  const timedRequest = (now) => {
    if (!currentLevel)
      return false;
    requestNewEntities = window.requestAnimationFrame(timedRequest);
    currentLevel.animations.add(requestNewEntities);
    //time keeping stuff. If this is the first time post epoch new entities are requested,
    //time lag is the difference between game epoch, and now
    //else, time lag is the difference between now and the last time new entities were requested
    const time = (!needNewEntities) ? (Date.now() - this.epoch) : (now - needNewEntities);
    //three point 6 seconds post game epoch, create new throttled number of entites
    if (!needNewEntities && time >= 3600) {
      this.requestEntities(currentLevel.throttle);
      needNewEntities = now;
    }
    //ten seconds into the game, create the last batch of new entities
    if (needNewEntities && time > 6000) {
      this.requestEntities(currentLevel.throttle);
      if (currentLevel.additionalEntityRequests > 0) {
        for (let i = 0; i < currentLevel.additionalEntityRequests; i++) {
          this.requestEntities(currentLevel.throttle + 1);
        }
      }
      window.cancelAnimationFrame(requestNewEntities);
    }
  };
  const animation = (now) => {
    //If key parameters for motion have not been set, do not begin
    if (!currentLevel.acceleration || !orientation)
      return false;
    //else, start
    let loop;
    loop = window.requestAnimationFrame(animation);
    currentLevel.animations.add(loop);
    // initialize / update time interval between frames
    then = then || now;
    const frameInterval = 0.001 * (now - then); //in seconds
    //Book keeping check for all possible restart scenarios
    const moment = Date.now();
    const gameTime = moment - this.epoch;
    this.updateClock(gameTime);
    currentLevel.time = gameTime;
    let message;
    //has player won?
    const playerHasAchievedObjectives = currentLevel.objectiveAchievedBy(this.player);
    //If the player conquered space on this level, show stats
    if (playerHasAchievedObjectives) {
      currentLevel.cancelPlay();
      message = "You have successfully guided the Udacity ship back home";
      //show stats//identify a target DOM element within the markup on which, an event occurs
      const callBackTarget = `#restart-game`;
      const options = {
        hardReload: true,
        preserveMoves: false
      };
      //Construct a helper object for when user provides input
      const callBackOptions = {
        //params define the context to work on after a call back on the event is triggered
        //Also defines, any inputs to have handy in that context
        params: {
          context: {
            task: 'restart'
          },
          input: options
        },
        //the target DOM child of the above markup generated, on which an event occurs
        target: callBackTarget,
        //event to listen to, on the above target
        listenTo: 'click'
      };
      //present options
      return this.interact(
        Engine.spinUpStatistics(message, currentLevel), callBackOptions);
    }
    //else, consider all restart scenarios, but first, update meta
    if (!currentLevel.moves) {
      currentLevel.moves = this.player.moves;
    }
    //Scenario #1 , if the level hasn't been conquered by the level's specific maxtime
    const timeout = (gameTime > currentLevel.maxTime && !playerHasAchievedObjectives);
    message = (timeout) ? "You failed to win in under three minutes" : message;
    //Scenario #2, If the player has not made a move beyond a minute
    let hasNotMovedForAMinute;
    if (currentLevel.moves > 0) {
      const deltaMoves = this.player.moves - currentLevel.moves;
      const deltaTS = moment - currentLevel.lastMoveCheckTS;
      currentLevel.lastMoveCheckTS = (deltaMoves) ? moment : currentLevel.lastMoveCheckTS;
      currentLevel.moves = this.player.moves;
      hasNotMovedForAMinute = (deltaMoves < 1 && deltaTS > 60000);
      message = (hasNotMovedForAMinute) ? "You did not make a move in under a minute" : message;
    }
    //Scenario #3, the player has used up all available lives
    let noLivesLeft = (currentLevel.lives < 1);
    message = (noLivesLeft) ? "You have exhausted the number of lives available" : message;
    //If restart scenarios are true, do not draw the frame, instead
    //Cancel the animation and issue a notification with a callback to a game restart
    if (timeout || hasNotMovedForAMinute || noLivesLeft) {
      currentLevel.cancelPlay();
      //compose a message note
      const notification = Engine.createNote(message);
      //identify a target DOM element within the markup on which, an event occurs
      const callBackTarget = `#restart-game`;
      const options = {
        hardReload: (!noLivesLeft) ? false : true,
        preserveMoves: (hasNotMovedForAMinute) ? true : false
      };
      //Construct a helper object for when user provides input
      const callBackOptions = {
        //params define the context to work on after a call back on the event is triggered
        //Also defines, any inputs to have handy in that context
        params: {
          context: {
            task: 'restart'
          },
          input: options
        },
        //the target DOM child of the above markup generated, on which an event occurs
        target: callBackTarget,
        //event to listen to, on the above target
        listenTo: 'click'
      };
      //present options
      return this.interact(notification, callBackOptions);
    } else {
      //Do check for collisions
      if (this.player.hasCollided()) {
        currentLevel.cancelPlay();
        return this.awaitPlayerHalt()
          .then(hasHalted => {
            this.removeMetaLife();
            currentLevel.lives--;
            return this.restart();
          })
          .catch(hasNotHalted => {
            console.warn(hasNotHalted);
          });
      } else {
        //open a drawing frame
        Drawing.openFrame();
        //render udacity ship
        this.imperilled.render();
        //animate all entities
        for (const entity of this.entities) {
          if (entity.hasBeenRenderedOnCreation) {
            entity.skipClearOnTilt = true;
            entity.requestAnimationFrame('linearProgression', [frameInterval, currentLevel.acceleration, orientation]);
          }
        }
        //close the  previously opened frame of drawing
        Drawing.closeFrame();
      }
    }
    //reset time
    then = now;
    return false;
  };
  //level One
  const One = (preservedLevel) => {
    //set an epoch for timed behaviours
    const epoch = Date.now();
    const freshLevel = {
      number: 1,
      //define a throttle to throttle number of entities created post epoch
      throttle: (Drawing._bounds.maxX > Drawing._bounds.maxY) ? 1 : 2,
      //define an acceleration rate for entity movements and set the number of additional entity requests
      additionalEntityRequests: 1,
      acceleration: 1.5,
      objectiveAchievedBy: function (player) {
        return player.hasFetchedImperilled && player.hasReturned;
      },
      moves: 0,
      lives: 3,
      maxTime: 180000,
      time: false,
      cancelPlay: function () {
        for (const animation of this.animations) {
          window.cancelAnimationFrame(animation);
        }
        return false;
      },
      reset: function () {
        this.lastMoveCheckTS = epoch;
        this.animations = new Set();
      }
    };
    //init level for animation reference
    currentLevel = preservedLevel || freshLevel;
    //reset level's timestamps and animation pointers
    currentLevel.reset();
    //assert level of play - required in restart scenarios because of collisions
    Configurations.get(this)
      .meta.level = currentLevel;
    //init time
    this.epoch = epoch;
    //reset animation time references
    needNewEntities = false;
    then = false;
  };
  //choose a level - fixed at one for now
  const onLevel = (level) ? level.number : 1;
  switch (onLevel) {
  case 1:
    One(level);
    break;
  default:
    break;

  }
  //begin the game only if a level has been initialized
  if (Configurations.get(this)
    .meta.level && currentLevel && this.epoch) {
    //schedule new batch of entities to be infused onto the composite
    window.requestAnimationFrame(timedRequest);
    //animate game entities,check game states
    window.requestAnimationFrame(animation);
  }
  return this;
};

/*
 *
 */
Game.prototype.awaitPlayerHalt = function () {
  return new Promise((resolve, reject) => {
    let willNotMove;
    const poll = () => {
      willNotMove = this.player.hasStoppedPropogations();
      if (willNotMove) {
        window.clearInterval(polly);
        resolve();
      }
    };
    const polly = window.setInterval(poll, 3);
  });
};
/*
 *@updateClock updates the on screen time
 */
Game.prototype.updateClock = function (time) {
  const readableStatsTime = Engine.getPresentableTime(time);
  $('#time')
    .empty()
    .html(readableStatsTime);
};
Game.prototype.removeMetaLife = function () {
  const life = $('#lives')
    .find('.animated-life:first-child');
  life.find('.icon')
    .toggle('puff', 'slow', () => {
      return life.empty()
        .remove();
    });
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
          let ceil = entity.bounds.esMinY + entity.bounds.maxEntityWidth;
          let floor = entity.bounds.esMinY;
          entity.y = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
          ceil = entity.bounds.esMaxX + entity.bounds.maxEntityWidth;
          floor = entity.bounds.esMaxX;
          entity.x = Math.floor(Math.random() * (ceil - floor + 1)) + floor;
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
      throw (error);
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
              bookKeeping: {
                task: 'updateMetaAvatar'
              },
              input: asset
            },
            //the target DOM child of the above markup generated, on which an event occurs
            target: callBackTarget,
            //event to listen to, on the above target
            listenTo: 'click'
          };
          //present options
          this.interact(responsiveMarkup, callBackOptions);
          $('.option-header')
            .html('Select A Vehicle');
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
Game.prototype.awaitMove = function (moves) {
  return new Promise((hasBegun, reload) => {
    let animation;
    let then = 0;
    const wait = (now) => {
      animation = window.requestAnimationFrame(wait);
      then = then || now;
      let dt = now - then;
      //If the user has not begun the game yet, wait for a maximum of three minutes and this is a fresh level
      const hasNotMoved = (!moves && (!this.player.moves || this.player.moves <= 0));
      //If the user has not moved on a restart
      const hasNotMovedAfterRestart = (moves && (!this.player.moves || (this.player.moves - moves < 1)));
      if (hasNotMoved || hasNotMovedAfterRestart) {
        //If the game has not been begun by three minutes, reload the page
        if (dt > 180000) {
          reload();
        }
      } else {
        window.cancelAnimationFrame(animation);
        //If the uaser has begun the game, resolve this promise
        hasBegun(true);
      }
    };
    window.requestAnimationFrame(wait);
  });
};
/*
 *@interact presents a single option for the user to choose from
 *It then on an event on the pre specified target, initiates a read of user input
 */
Game.prototype.interact = function (markup, callBack) {
  //Function to call back - generic
  const Cb = () => {
    //Once feedback is received, remove available options
    $('.options')
      .find(callBack.target.animateOnCallback || '.animate')
      .toggle('slide', 'fast')
      .remove();
    $('.option-header')
      .empty()
      .html('');
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
    .show(1000)
    //assign a click event listener
    .find(callBack.target)
    .css({
      cursor: 'pointer'
    })
    //call back on event
    .on(callBack.listenTo, Cb);
};
Game.prototype.updateMetaAvatar = function (avatar) {
  for (let i = 0; i < 3; i++) {
    const img = new Image();
    img.classList.add('icon');
    img.setAttribute('src', avatar.url);
    const animator = $('<div class="animated-life"></div>');
    animator.append(img);
    $('#lives')
      .append(animator);
  }
};
/*
 *@acceptUserInput, reads from user feedback, and initiates an appropriate Action/Task
 *@param resolve is Mandatory, and should be an object of context and input to that context
 *NOTE If the context property of the resolve object does not specify a specific component of the game,
 *the game takes over the task mentioned, making the task property of a context, MANDATORY
 */
Game.prototype.acceptUserInput = function (resolve) {
  const component = resolve.context.component || this;
  const bookKeeping = resolve.bookKeeping || false;
  const task = resolve.context.task;
  if (bookKeeping) this[bookKeeping.task](resolve.input);
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