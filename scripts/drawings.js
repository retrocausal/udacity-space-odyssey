class Drawing {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.twoDimContext = this.canvas.getContext('2D');
  }
  setDimensions(selector = 'main') {
    const Container = $(selector);
    const Width = Container.width();
    const Height = Container.height();
    this.canvas.width = Width;
    this.canvas.height = Height;
    console.log(Width, Height);
    return this;
  }
  getContext() {
    return this.twoDimContext;
  }
}