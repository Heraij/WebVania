const config = {
    type: Phaser.AUTO,
    width: 1280,   // A modern widescreen internal resolution
    height: 720,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT, // Safely stretches the game to fill the screen
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 }, // Snappy, heavy platformer gravity
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let player;
let cursors;
let platforms;

function preload() {
    // Generate placeholder textures cleanly
    let playerGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphic.fillStyle(0xffffff, 1);
    playerGraphic.fillRect(0, 0, 32, 48);
    playerGraphic.generateTexture('playerTexture', 32, 48);

    let groundGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    groundGraphic.fillStyle(0x00ff66, 1);
    groundGraphic.fillRect(0, 0, 1280, 32); // Matches our new width
    groundGraphic.generateTexture('groundTexture', 1280, 32);
}

function create() {
    platforms = this.physics.add.staticGroup();

    // Floor at the bottom of our 1280x720 canvas
    platforms.create(640, 704, 'groundTexture');
    
    // Test platforms
    platforms.create(900, 500, 'groundTexture').setDisplaySize(400, 32).refreshBody();
    platforms.create(300, 350, 'groundTexture').setDisplaySize(400, 32).refreshBody();

    // Spawn player safely above the floor
    player = this.physics.add.sprite(200, 400, 'playerTexture');
    player.setCollideWorldBounds(true); 

    this.physics.add.collider(player, platforms);

    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    // Left/Right Movement
    if (cursors.left.isDown) {
        player.setVelocityX(-400);
    } else if (cursors.right.isDown) {
        player.setVelocityX(400);
    } else {
        player.setVelocityX(0); 
    }

    // Independent Jumping (Fixes jumping while running!)
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-650); 
    }
}
