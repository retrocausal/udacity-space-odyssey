const Game = function (...configurations) {
  const [list_of_space_sprites] = configurations;
  this.cache = new Cache();
  this.spaceSprites = list_of_space_sprites;
};
Game.prototype.build = function () {
  this.spaceTimeContinuum = new Drawing()
    .setDimensions();
  this.space = this.spaceTimeContinuum.getContext();
  this.cache.add(this.spaceSprites)
    .then(onCache => {
      console.log(onCache);
    }, onError => {
      console.log(onError);
    });
};
Game.prototype.waitUntil = function (resolver) {
  return new Promise(resolver);
};