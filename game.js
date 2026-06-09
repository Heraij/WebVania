
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 }, 
            debug: false         
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Initialize the game
const game = new Phaser.Game(config);
let player;
let cursors;
let platforms;

function preload() {
    let playerGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphic.fillStyle(0xffffff, 1);
    playerGraphic.fillRect(0, 0, 32, 48);
    playerGraphic.generateTexture('playerTexture', 32, 48);

    let groundGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    groundGraphic.fillStyle(0x00ff66, 1);
    groundGraphic.fillRect(0, 0, 400, 32);
    groundGraphic.generateTexture('groundTexture', 400, 32);
}

function create() {
    
    platforms = this.physics.add.staticGroup();

    platforms.create(400, 568, 'groundTexture').setScale(2).refreshBody();
    platforms.create(600, 400, 'groundTexture');
    platforms.create(150, 250, 'groundTexture');

   
    player = this.physics.add.sprite(100, 450, 'playerTexture');
    player.setCollideWorldBounds(true); 

    
    this.physics.add.collider(player, platforms);

   
    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  
    if (cursors.left.isDown) {
        player.setVelocityX(-250);
    } else if (cursors.right.isDown) {
        player.setVelocityX(250);
    } else {
        player.setVelocityX(0); 

  
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-450);
    }
}
}