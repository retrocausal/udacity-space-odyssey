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
  Drawing._layers = new WeakMap();
};
Game.prototype.init = function () {
  //gather configurables
  const Configuration = Configurations.get(this)
    .configuration;
  //define a cache, to cache media
  this.cache = new Cache(this.staticAssetsRoot);
  //Initializing Canvas
  this.spaceSprites = Configuration.scenary.spaceSprites;
  this.spaceTimeColumn = Configuration.scenary.spaceTimeColumn;
  //build spacetime
  this.spaceTimeContinuum = new SpaceTimeContinuum()
    .init();
  //Initializing Components
  this.player = Engine.request('Player');
  this.playerVehicleOptions = Configuration.player.vehicles;
  //set an epoch for timed behaviours
  this.epoch = Date.now();
  this.play();
  return this;
};
Game.prototype.play = function () {
  //Render Scene
  this.renderScene();
  //ask feedback
  this.presentPlayerOptions();
}
/*
 *@renderScene asynchronously builds and renders space
 */
Game.prototype.renderScene = function () {
  this.cache.add(this.spaceSprites)
    .then(cache_keys => {
      const assets = this.spaceTimeColumn.map(rowOfColumn => {
        const key = this.staticAssetsRoot + rowOfColumn;
        return this.cache.retrieve(key)
          .value;
      });
      return this.spaceTimeContinuum.constructScene(assets);
    })
    .then(scene => {
      const animation = this.spaceTimeContinuum.initScrollableHologram(scene);
      return this.animate(this.spaceTimeContinuum, animation);
    });
};

/*
 *@presentPlayerOptions caches available vehicles, accepts user input
 *initiates a player to be rendered on canvas
 */
Game.prototype.presentPlayerOptions = function () {
  this.cache.add(this.playerVehicleOptions)
    .then(cache_keys => {
      const keys = [...cache_keys];
      const assets = keys.map(vehicle => {
        //retrieve asset from cache
        const asset = this.cache.retrieve(vehicle);
        //build a responsive markup since these are images
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
        return asset;
      });
      return $('.option-header')
        .html("Select A Vehicle");
    });
};
/*
 *@presentOption presents a single option for the user to choose from
 *It then on an event on the pre specified target, initiates a read of user input
 */
Game.prototype.presentOption = function (markup, callBack) {
  //Function to call back - generic
  const Cb = () => {
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