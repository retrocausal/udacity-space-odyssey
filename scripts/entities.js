/*
 *@Entity defines generic behaviours of any game entity
 *These behaviours need to be extended by individual entites, defining their individuality!
 */
class Entity {
  constructor() {
    this.renderer = new Matter()
      .init();
    this.bounds = this.renderer.getBounds();
    [this.x, this.y] = this.randomXY();

  }
  init() {}
  render(w = false, h = false) {
    const width = w || this.bounds.maxEntityWidth;
    const height = h || this.bounds.maxEntityHeight;
    return this.renderer.paint(this.avatar, this.x, this.y, width, height);
  }
  randomXY() {
    const randomX = Math.floor(Math.random() * (this.bounds.esMaxX - this.bounds.esMinX + 1)) + this.bounds.esMinX;
    const randomY = Math.floor(Math.random() * (this.bounds.esMaxY - this.bounds.esMinY + 1)) + this.bounds.esMinY;
    return [randomX, randomY];
  }
  updateQuadrantMaps() {
    const quadrants = Drawing._bounds.quadrants;
    const reducer = (accumalate, quadrant) => {
      const xBound = ((this.x + this.bounds.maxEntityWidth / 2) >= quadrant.minX && (this.x + this.bounds.maxEntityWidth / 2) <= quadrant.maxX) ||
        ((this.x - this.bounds.maxEntityWidth / 2) >= quadrant.minX && (this.x - this.bounds.maxEntityWidth / 2) <= quadrant.maxX);
      const yBound = ((this.y + this.bounds.maxEntityHeight / 2) >= quadrant.minY && (this.y + this.bounds.maxEntityHeight / 2) <= quadrant.maxY) ||
        ((this.y) >= quadrant.minY && (this.y) <= quadrant.maxY);
      if (xBound && yBound) {
        accumalate.add(quadrant);
        Drawing._QEM.get(quadrant)
          .add(this);
      } else {
        Drawing._QEM.get(quadrant)
          .delete(this);
      }
      return accumalate;
    };
    return quadrants.reduce(reducer, new Set());
  }
  preAnimate() {
    this.bindingQuadrants = this.updateQuadrantMaps();
    console.log(Drawing._QEM);
  }

}
/*
 *@Player extends an Entity and defines a Player
 */
class Player extends Entity {
  constructor() {
    super();
  }
  init(avatar) {
    super.init();
    this.avatar = avatar.value;
    this.x = (Drawing._bounds.maxX) / 2;
    this.y = Drawing._bounds.maxY - this.bounds.maxEntityHeight;
    this.render();
    this.registerEventHandlers();
  }
  registerEventHandlers() {}
}