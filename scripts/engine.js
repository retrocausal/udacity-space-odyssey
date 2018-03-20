/*
 *@Configuration configures a playable game
 */
class Build {
  constructor() {
    this._Game = new Game();
  }
  set _Game(object) {
    //Images that need to be ready before render
    const spaceSprites = ['empty-space.jpg', 'space.jpg'];
    /*
     * Used to draw spacetime. Can be a single canvas wide image
     * Or an illustration of n rows that make up 1 column
     */
    const spaceTimeColumn = ['space.jpg', 'space.jpg'];
    const Scenary = {
      spaceSprites,
      spaceTimeColumn
    };
    //configure a Player in the Game
    const Vehicles = ['spacecraft1.png', 'spacecraft2.png', 'spacecraft3.png'];
    const Player = {
      Vehicles
    };
    //confugre imperilled
    const Imperilled = {
      avatar: 'udacity.png'
    };
    //configure matter
    const Matter = new Set([
      {
        count: 1,
        avatar: 'blackhole.png',
        build: Blackhole
      },
      {
        count: 3,
        avatar: 'rock.png',
        build: Asteroid
      },
      {
        count: 2,
        avatar: 'planet.png',
        build: Planet
      },
      {
        count: 1,
        avatar: 'star.png',
        build: Star
      }
    ]);
    //accumalate / consolidate all the above, into one configurable
    const configuration = {
      Scenary,
      Player,
      Imperilled,
      Matter
    };
    //retain a reference for retrieving configurations
    this.Game = object;
    //set game configurations,skeletal meta
    Configurations.set(this.Game, {
      configuration,
      meta: {}
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
  assembleEntities(Options) {
    const [Matter, throttle] = Options;
    const entities = new Set();
    for (const matter of Matter) {
      let count = matter.count;
      count = count - throttle;
      while (count > 0) {
        const entity = new matter.build(matter.avatar);
        entities.add(entity);
        count--;
      }
    }
    return entities;
  }
  assembleImperilled() {
    return new Udacity();
  }
  assembleLayers() {
    Drawing._layers = Drawing._layers || new WeakMap();
  }
  request(component, options = false) {
    const Component = this[`assemble${component}`] || false;
    return (component && Component) ? Component(options) : false;
  }
  buildResponsiveImage(asset, rasterRoot, sizes = '30vw') {
    const container = $('<div class="responsive-container"></div>');
    const id = asset.name;
    const image = `
          <figure>
            <picture>
              <source media="min-width:759px" sizes="${sizes}" srcset="
              ${rasterRoot}${asset.name}-small.${asset.extension} 360w,
              ${rasterRoot}${asset.name}-medium.${asset.extension} 480w,
              ${rasterRoot}${asset.name}-large.${asset.extension} 640w,
              ${rasterRoot}${asset.name}-x-large.${asset.extension} 960w
              ">
              </source>
              <img class="responsive animate" src=${rasterRoot}${asset.name}-small.${asset.extension} id=${id}>
              </img>
            </picture>
          </figure>
        `;
    container.html(image);
    return container;
  }
  createNote(string) {
    const container = $('<div class="notification-container"></div>');
    const notification = `<article class="alert animate">
                            <section class=notification >
                            <h2 class=notification-header>Hey there!</h2>
                            <div class=notification-msg>
                              <p>${string}</p>
                            </div>
                            <div class=notification-options>
                              <button class=notification-button id=restart-game>Replay</button>
                            </div>
                            </section>
                          </article>`;
    container.html(notification);
    return container;
  }
  getPresentableTime(ms) {
    let readableTime = new Date(ms)
      .toISOString()
      .slice(11, -5);
    return readableTime;
  }
  spinUpStatistics(message, levelOfPlay) {
    const container = $('<div class="notification-container"></div>');
    const lives = (3 - levelOfPlay.lives) ? (3 - levelOfPlay.lives) : 'none';
    const statCard = `<div class="meta-scorecard">
                        <h2 class="meta-header">How you fared</h2>
                        <ul class="meta-list">
                          <li class="meta-list-item">Time:</li>
                          <li class="meta-list-item" id="stats-time">${this.getPresentableTime(levelOfPlay.time)}</li>
                          <li class="meta-list-item">Lives expended:</li>
                          <li class="meta-list-item">${lives}</li>
                          <li class="meta-list-item">Moves made:</li>
                          <li class="meta-list-item">${levelOfPlay.moves}</li>
                        </ul>
                      </div>`;
    const notification = `<article class="alert animate">
                            <section class=notification >
                            <h2 class=notification-header>Hey there Udacity says Thanks!</h2>
                            <div class=notification-msg>
                              <p>${message}</p>
                            </div>
                            ${statCard}
                            <div class=notification-options>
                              <button class=notification-button id=restart-game>Replay Game</button>
                            </div>
                            </section>
                          </article>`;
    container.html(notification);
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