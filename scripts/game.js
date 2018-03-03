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
    .init()
    .attach();
  //Render Scene
  this.renderScene();
  //Initialize Matter drawings
  this.matter = new Matter()
    .init()
    .attach();
  //Initializing Components
  this.player = Engine.request('Player');
  this.playerVehicleOptions = Configuration.player.vehicles;
  //this.renderPlayer();
  return this;
};
/*
 *@renderScene asynchronously builds and renders space
 */
Game.prototype.renderScene = function () {
  this.spaceTimeContinuum.identify("space");
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