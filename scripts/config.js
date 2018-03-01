//One thing, to BIND them all
const Configurations = new WeakMap();

/*
 *@Configuration configures a playable game
 */
class Configuration {
  constructor() {
    this._Game = new Game();
  }
  set _Game(object) {
    //Images that need to be ready before render
    const spaceSprites = [
          'empty-space.jpg',
          'space.jpg',
    ];
    /*
     * Used to draw spacetime. Can be a single canvas wide image
     * Or an illustration of n rows that make up 1 column
     */
    const spaceTimeColumn = [
        //'empty-space.jpg', // Top row is space illustration
        'space.jpg'
    ];
    //initiate an empty object for state maintanence
    const meta = {

    };
    //accumalate / consolidate all the above, into one configurable
    const configuration = {
      scenary: {
        spaceSprites,
        spaceTimeColumn
      }
    };
    //retain a reference for retrieving configurations
    this.Game = object;
    //set game configurations,skeletal meta
    Configurations.set(this.Game, {
      configuration,
      meta
    });
    return object;
  }
  get _Game() {
    return false;
  }
  run() {
    return this.Game.init();
  }
}
const Engine = new Configuration();
Engine.run();