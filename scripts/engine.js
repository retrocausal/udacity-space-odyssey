/*
 *@Configuration configures a playable game
 */
class Build {
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
        'space.jpg', // Top row is space illustration
        'space.jpg'
    ];
		//initiate an empty object for state maintanence
		const meta = {

		};
		//configure a Player in the Game
		const vehicles = [
      'spacecraft1.png', 'spacecraft2.png', 'spacecraft3.png'
    ];
		const playerConfiguration = {
			vehicles,
			meta
		};
		//accumalate / consolidate all the above, into one configurable
		const configuration = {
			scenary: {
				spaceSprites,
				spaceTimeColumn
			},
			player: playerConfiguration
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
	assemblePlayer() {
		return new Player();
	}
	request(component) {
		const Component = this[`assemble${component}`] || false;
		if (component) {
			return Component();
		}
	}
	buildResponsiveImage(asset, rasterRoot) {
		const id = asset.name;
		const image = `
              <figure>
                  <picture>
                    <source media="min-width:761px" sizes="30vw" srcset="
                      ${rasterRoot}${asset.name}-small.${asset.extension} 360w,
                      ${rasterRoot}${asset.name}-medium.${asset.extension} 480w,
                      ${rasterRoot}${asset.name}-large.${asset.extension} 640w
                    ">
                    </source>
                    <source media="min-width:1024px" sizes="30vw" srcset="
                      ${rasterRoot}${asset.name}-medium.${asset.extension} 360w,
                      ${rasterRoot}${asset.name}-large.${asset.extension} 480w,
                      ${rasterRoot}${asset.name}-x-large.${asset.extension} 640w
                    ">
                    </source>
                  <img class="responsive animate" src=${rasterRoot}${asset.name}-small.${asset.extension} id=${id}>
                  </img>
                  </picture>
              </figure>
`;
		const container = $('<div class="responsive-container"></div>');
		container.html(image);
		return container;
	}

}
//One thing, to BIND them all
const Configurations = new WeakMap();
//start build
const Engine = new Build();
$(() => {
	Engine.run();
});