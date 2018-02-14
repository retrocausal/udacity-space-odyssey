const spaceSprites = [
      'space2.png',
      'space.png',
      'space1.png'
];

$(() => {
  new Game(spaceSprites)
    .build();
});