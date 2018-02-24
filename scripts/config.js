const spaceSprites = [
      'empty-space.jpg',
      'space.jpg',
      'more-space.jpg'
];
const spaceTimeColumn = [
    //'empty-space.jpg', // Top row is space illustration
    'more-space.jpg'
];

const config = {
  spaceSprites,
  spaceTimeColumn
}
$(() => {
  new Game(config)
    .build();
});