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
/*
 *@init initializes the game, initializes individual components
 */
Game.prototype.init = function () {
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
	//Player stuff
	this.player = Engine.request('Player');
	this.playerVehicleOptions = Configuration.Player.Vehicles;
	//Entities
	this.matter = Configuration.Matter;
	this.entities = this.requestEntities();
	//Build complete, render and play
	this.play();
	return this;
};
/*
 *@play renders the scene,presents player options, and waits for a player to move
 *before activating timed behavious
 */
Game.prototype.play = function () {
	//Render Scene
	this.renderScene();
	//ask feedback
	this.presentPlayerOptions()
		.then(hasBegun => {
			//If the game has begun,
			//set an epoch for timed behaviours
			this.epoch = Date.now();
			let requestNewEntities;
			let lastRequested;
			//define a throttle to throttle number of entities created post epoch
			const throttle = (Drawing._bounds.maxX > Drawing._bounds.maxY) ? 1 : 2;
			const timedRequest = (now) => {
				requestNewEntities = window.requestAnimationFrame(timedRequest);
				//time keeping stuff. If this is the first time post epoch new entities are requested,
				//time lag is the difference between game epoch, and now
				//else, time lag is the difference between now and the last time new entities were requested
				const time = (!lastRequested) ? (Date.now() - this.epoch) : (now - lastRequested);
				//fourteen seconds post game epoch, create new throttled number of entites
				if (!lastRequested && time >= 14000) {
					this.requestEntities(throttle);
					lastRequested = now;
				}
				//eight three seconds into the game, create the last batch of new entities
				if (lastRequested && time > 69000) {
					this.requestEntities(throttle);
					this.requestEntities(throttle + 1);
					window.cancelAnimationFrame(requestNewEntities);
				}
			};
			window.requestAnimationFrame(timedRequest);
		}, reload => {
			//If the game hasn't begun, reload
			window.location.reload(true);
		});
}
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
		this.initEntities();
		return entities;
	};
	return (epoch) ? addPostEpochEntities() : addPreEpochEntities();
};
/*
 *@initEntities caches avatars of each entity in this.entites
 *then initializes them
 */
Game.prototype.initEntities = function () {
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
				return this.cache.retrieve(key)
					.value;
			});
			//construct a sprite from retrieved images
			return this.spaceTimeContinuum.constructScene(assets);
		})
		.then(scene => {
			//build a hologram of the constructed sprite
			const animation = this.spaceTimeContinuum.initScrollableHologram(scene);
			//scroll the hologram
			return this.animate(this.spaceTimeContinuum, animation);
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
			$('.option-header')
				.html("Select A Vehicle");
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
						hasBegun(this.player.moves);
						window.cancelAnimationFrame(animation);
					}
				};
				window.requestAnimationFrame(wait);
			});
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