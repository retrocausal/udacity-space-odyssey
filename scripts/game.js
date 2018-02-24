const Game = function (configurations) {
  const {
    spaceSprites,
    spaceTimeColumn
  } = configurations;
  this.staticAssetsRoot = "./assets/rasters/";
  this.cache = new Cache(this.staticAssetsRoot);
  this.spaceSprites = spaceSprites;
  this.spaceTimeColumn = spaceTimeColumn;
};


Game.prototype.build = function () {
  this.spaceTimeContinuum = this.generateSpace();
};


Game.prototype.generateSpace = function () {
  const spaceTimeContinuum = new SpaceTimeContinuum()
    .init()
    .selfAttach();
  this.cache.add(this.spaceSprites)
    .then(cache_keys => {
      const assets = this.spaceTimeColumn.map(rowOfColumn => {
        const key = this.staticAssetsRoot + rowOfColumn;
        return this.cache.retrieve(key)
          .value;
      });
      return spaceTimeContinuum.constructScene(assets);
    })
    .then(filmOfReel => {
      spaceTimeContinuum.identify("space");
      const animation = spaceTimeContinuum.initScrollableSpace(filmOfReel);
      return this.animate(spaceTimeContinuum, animation);
    });
  return spaceTimeContinuum.getContext();
};


Game.prototype.animate = function (helperObject, animation) {
  //Time when animation begins
  let then;
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
    animation.dt = (now - then) / 1000;
    return helperObject.requestAnimationFrame(animation);
  };
  //start animation
  window.requestAnimationFrame(animate);
};