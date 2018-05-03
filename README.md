Space Odyssey
===============================
## Install
 - Clone this repository
 - `cd` to the clone
 - run `bower install`, Only If you already do not have a `bower-components` directory under the project root.
    > ##### _Note_
    > `Bower`, is a front end dependency and package installer/manager
    > You can see what it does at [Bower][5e57d8c7].
    >
    > _If you do not have bower, you can run `npm install -g bower`_
 - Once you ran `bower install`, you should have a `bower-components` directory under the project root.
 - That is all! play to rescue Udacity at whim!

## About This Project
  > This is a project coded to pass a Udacity course on the front end web development track.
  > It requires a thorough understanding of
  >   - HTML5 Canvas element
  >   - Javascript Promises
  >   - Event Listeners on the DOM
  >   - Animating with the requestAnimationFrame method of a browser window

> Apart from which, It needs to exhibit logical separation of concerns.
> The rubric that needs to be adhered to at the minimum, is found [here][234a61ad]
> This project has been developed, using some of the latest ES syntax, making the code as readable at first glance, as possible.
> The code itself, is documented exhaustively where required.The comments at places, highlight the thought behind a certain approach.

## Reflections
  - ### Separation of concerns
   ##### The cache
   >  - The project, first coneived a *caching* rewrite of what Udacity provided as a starter code.
   >  - The project has a class for caching now, instead of a function.
   >  - Yes, that meant about 10x the lines of code on the udacity starter code
   >  - However, It was an opportunity to ode a promise based cache with idiomatic method names such as `cache.add().then ....` or , `cache.retrieve()` which sounded more readable.

  ##### The Engine
  >  - Udacity provided a prototypal definition of an engine that did almost everything from
  >     - Producing New Entities
  >     - Initializing them
  >     - Rendering them
  >     - Animating them
  >     - Updating them during a span of a frame
  >
  > -  Also Did:
  >
  >   - Producing a Player(s)
  >   - Initializing/Animating/Updating/Rendering the Player(s).
  >
  > - Also Did:
  >
  >    - Collision detection
  >    - Scoring / Resetting / Finishing the game
  > - Also Did:
  >   - Scene construction from a set of image sprites
  >   - Rendering background scene animations

  **That was simply too much for a single class to do.**

  > So, this project has an engine that
  >   - Produces Entities / Player / Imperilled (Read Components)
  >   - Generates Responsive markup on request
  >   - Does simple/complex math on request
  >   - Initializes/Configures a new Game, and issues a run game command
  >
  > Nothing more!

  ##### The Drawing
  > The drawing, is a helper component that draws everything required to be drawn.
  > It has both `Static` as well as `Non static` methods and properties.
  >
  > For example,
  >    - the `layers` or `canvas` elements drawing the background scenary/entity space and its inhabitants / the player, are separate canvases.
  >    - so, the Drawing has a static `layers` property, that is a `Set` of 3 layers as identified above.
  >    - The background scenary is the `Primer`, then the other two, are `Composites`
  >    - Also, The project needs a `spacial division of the canvases` for easier and efficient collision detection
  >    - And so, the Drawing logically divides itself into 4 smaller quadrants which apply to drawable composites.

  >All of these are static because, they Only need to be defined Once, and reset Once, and Read from, multiple times.
  >    - The other methods for Drawing, like
  >       - Paint something somewhere
  >       - Construct a Scene from a set of images
  >       - Project a hologram
  >       - Animate a scene etc..
  >
  > Are non static, extensible / overridable because different entities might render themselves differently

  ##### The Entity
  > The entity defines all the generic behaviour for all sorts of entities
  >    - Interpolated Movements across the composite layers
  >    - Rotations
  >    - Spin
  >    - Rendering themselves via a drawing helper
  >    - Mapping themselves to a spacial quadrant
  >    - Detecting collisions for when they have been superposed on another entity on the drawing.

  > The entity behaviour, is then extended by individual entities like the Blackhole / Asteroid / Planet / Player / Udacity Ship, the Imperilled.
  > Each of these entities, behave like an entity, are generally aware of themselves as an entity is.
  > But then, each of them, Also have their own inndividuality / eccentricities.
  > For example,
  >    - The Blackhole, `FEEDS` whereas others do not.
  >    - The Planet is spherical, but Asteroids are not.
  >    - The Player has controlled movement, but others do not.
  >    - The imperilled udacity ship, can be towed, but others can not.
  >
  > so on, so forth..

  ##### The Game
  >The Game itself, is what creates the play on the screen.

  >   - It essentially `Requests` the `Engine` for `Components` to be produced
  >        at various times post start of play, and before start of play.
  >   - It accepts User inputs, Interacts with the User
  >   - Also Notifies the User of the State of play when necessary.
  >   - It `Animates` the Entities produced by the `Engine`, via the `Drawing`.
  >   - It `Requests` Collision Detection from the Player, on Player movement
  >       between the Player, and the various entities occupying the
  >       shared space across two composite layers.
  >   - On collision, It handles stoppage of play and / or a restart of a level
  >
  >The Game, Maintains a State of an individual level, via a Configurations `global` `WeakMap`. It retrieves a configurations for a compoenent when required, modifies and writes it when required too.
  > Each Level of the Game, has it's **OWN** Objectives, and the level is deemed **WON**, If the player achieves those Objectives.

## TO-DO
  - [ ] **Refactor For Redundancies**
  >  _There are some functions, that do the same stuff. Like animating linear motion for the player. Needs to be a single module, with different options as params_

  - [ ] **New Levels of Play**
  - [ ] **Separate Math from the Main Animation**
  - [ ] **Improve Math**

 >  The Math used, is despicable at the moment.
 > For example, the rate at which the blackhole grows, or, the rate at which the star shrinks, are some silly random whimsical calculation at the moment.

- [ ] **Make the game playable on extra small screens**


## Playing the game

#### The Premise (Saga)

The game opens to a scene where, An imperilled space shuttle *Marked* **U** for *Udacity*, is on the top right corner of the canvas.
This shuttle, has lost it's guidance systems, and hence can not make it back to safety.
##### The Space to traverse
Meanwhile, the space between the Imperilled Udacity ship, and safety, is playing out a scene where, a blackhole is consuming a star and it's planetary system.

*Note*
> The blackhole will finish consuming the star, and begin oscillating, while traversing the space right to left.

#### The Objective
 - Do not collide with matter occupying the space between the two safe zones.
 - Traverse the space, vertically, while avoiding collisions.
 - On Reaching the top most zone of space, the player **will be guided to dock** with the imperilled space shuttle.

 >**_Note on the guided docking mechanism in place_**
 > - **The player** **_Needs_** to `ROTATE` right, to an angle between 90 and 100 degrees. i.e, after reaching the top most zone of space.
 > - **The Player on such** `ROTATION`, will **GLIDE TOWARDS THE IMPERILLED SHUTTLE** without having to **move right / left**
 >  - Once `Superposed`, the Imperilled shuttle follows the player.
 - Tow the imperilled space shuttle back to safety on the lower most safe zone.

#### Collisions
 - Colliding with the blackhole, **WOULD NOT RESET** play.
 - Colliding with any other entity, **WILL RESET** play.

 #### The Blackhole
 >  - The blackhole, after consuming the star, **will oscillate and move right to left.**
 >
 > - Once the blackhole completes **ONE LENGTH OF SPACE** , It begins **Consuming other entities** Albeit, very SLOWLY.
 >
 > - During such consumptions, The blackhole, **WILL INCREASE THE LINEAR SPEED OF THE ENTITY IT COLLIDES WITH**
 >  - Also, The entity colliding with the blackhole, will see **UNCONTROLLABLE** **MOTION** along the **X AXIS ALONE**

#### Controls
 - Moving UP **Use Arrow UP**
 - Moving DOWN **Use Arrow DOWN**
 - Moving RIGHT **Use Arrow RIGHT**
 - Moving LEFT **Use Arrow LEFT**
 - ROTATIONS **Use ALT + ARROW RIGHT / LEFT**


  [5e57d8c7]: https://bower.io "Package management for the front end web"
  [234a61ad]: https://review.udacity.com/#!/projects/2696458597/rubric "project rubric"
