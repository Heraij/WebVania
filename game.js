// Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    // 1. SCALE CONFIGURATION: This forces the canvas to fill the browser window
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 }, // Bumped up gravity for a heavier, snappier feel
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
    // Dynamic placeholder textures
    let playerGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphic.fillStyle(0xffffff, 1);
    playerGraphic.fillRect(0, 0, 32, 48);
    playerGraphic.generateTexture('playerTexture', 32, 48);

    let groundGraphic = this.make.graphics({ x: 0, y: 0, add: false });
    groundGraphic.fillStyle(0x00ff66, 1);
    groundGraphic.fillRect(0, 0, 800, 32); // Made wider for the larger screen
    groundGraphic.generateTexture('groundTexture', 800, 32);
}

function create() {
    platforms = this.physics.add.staticGroup();

    // Create a floor that stays at the very bottom of the dynamically sized screen
    let gameWidth = this.sys.game.config.width;
    let gameHeight = this.sys.game.config.height;

    // Place the floor right at the bottom
    platforms.create(gameWidth / 2, gameHeight - 16, 'groundTexture').setDisplaySize(gameWidth, 32).refreshBody();
    
    // Add some random test floating ledges
    platforms.create(gameWidth * 0.75, gameHeight * 0.6, 'groundTexture').setDisplaySize(300, 32).refreshBody();
    platforms.create(gameWidth * 0.25, gameHeight * 0.4, 'groundTexture').setDisplaySize(300, 32).refreshBody();

    player = this.physics.add.sprite(100, gameHeight - 100, 'playerTexture');
    player.setCollideWorldBounds(true); 

    this.physics.add.collider(player, platforms);

    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    // --- 1. HORIZONTAL MOVEMENT ---
    if (cursors.left.isDown) {
        player.setVelocityX(-350); // Slightly faster speeds for fullscreen
    } else if (cursors.right.isDown) {
        player.setVelocityX(350);
    } else {
        player.setVelocityX(0); 
    }

    // --- 2. JUMPING (Independent of horizontal movement) ---
    // This allows jumping while actively running left or right
    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-550); 
    }
}
