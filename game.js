const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1400 }, // Slightly heavier gravity for crisp platforming
            debug: false // Turn to true if you want to see hitbox outlines
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Game Objects
let player;
let cursors;
let keyF;
let platforms;
let enemies;
let powerups;
let swordAttack;

// Player Ability Flags (Metroidvania progression)
let hasWallJump = false;
let hasDash = false;

// Player State Variables
let isDashing = false;
let canDash = true;
let dashDirection = 1;
let isAttacking = false;
let lastFacingDirection = 1; // 1 for Right, -1 for Left

function preload() {
    // --- TEXTURE GENERATION ---
    // Player (White)
    let pG = this.make.graphics({ x: 0, y: 0, add: false });
    pG.fillStyle(0xffffff, 1); pG.fillRect(0, 0, 32, 48);
    pG.generateTexture('playerTex', 32, 48);

    // Sword Hitbox (Translucent Cyan)
    let sG = this.make.graphics({ x: 0, y: 0, add: false });
    sG.fillStyle(0x00f0ff, 0.6); sG.fillRect(0, 0, 50, 32);
    sG.generateTexture('swordTex', 50, 32);

    // Enemy (Red)
    let eG = this.make.graphics({ x: 0, y: 0, add: false });
    eG.fillStyle(0xff3333, 1); eG.fillRect(0, 0, 40, 40);
    eG.generateTexture('enemyTex', 40, 40);

    // Wall Jump Powerup (Blue Triangle-ish/Square)
    let pwG = this.make.graphics({ x: 0, y: 0, add: false });
    pwG.fillStyle(0x3344ff, 1); pwG.fillRect(0, 0, 24, 24);
    pwG.generateTexture('wallJumpTex', 24, 24);

    // Dash Powerup (Gold Square)
    let pdG = this.make.graphics({ x: 0, y: 0, add: false });
    pdG.fillStyle(0xffcc00, 1); pdG.fillRect(0, 0, 24, 24);
    pdG.generateTexture('dashTex', 24, 24);

    // Environment (Green)
    let gG = this.make.graphics({ x: 0, y: 0, add: false });
    gG.fillStyle(0x00ff66, 1); gG.fillRect(0, 0, 1280, 32);
    gG.generateTexture('groundTex', 1280, 32);
}

function create() {
    // 1. Environment Set Up
    platforms = this.physics.add.staticGroup();
    platforms.create(640, 704, 'groundTex'); // Main floor
    
    // Create actual walls on the sides to practice wall-jumping!
    platforms.create(16, 360, 'groundTex').setDisplaySize(32, 720).refreshBody(); // Left Wall
    platforms.create(1264, 360, 'groundTex').setDisplaySize(32, 720).refreshBody(); // Right Wall
    platforms.create(640, 450, 'groundTex').setDisplaySize(300, 32).refreshBody(); // Ledge

    // 2. Player Setup
    player = this.physics.add.sprite(200, 500, 'playerTex');
    player.setCollideWorldBounds(true);

    // 3. Sword Hitbox Setup (Hidden initially)
    swordAttack = this.physics.add.sprite(0, 0, 'swordTex');
    swordAttack.body.setAllowGravity(false);
    swordAttack.setActive(false).setVisible(false);

    // 4. Enemies Group
    enemies = this.physics.add.group();
    let enemy1 = enemies.create(700, 400, 'enemyTex');
    enemy1.setCollideWorldBounds(true);
    enemy1.setVelocityX(100); // Make them pace back and forth

    // 5. Powerups Group
    powerups = this.physics.add.staticGroup();
    let wjItem = powerups.create(150, 350, 'wallJumpTex').setData('type', 'walljump');
    let dashItem = powerups.create(1100, 600, 'dashTex').setData('type', 'dash');

    // 6. Collisions & Interactions
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);
    
    // Player overlapping items
    this.physics.add.overlap(player, powerups, collectPowerup, null, this);
    // Sword hitting enemies
    this.physics.add.overlap(swordAttack, enemies, destroyEnemy, null, this);
    // Enemy hitting player (Resets player position for now)
    this.physics.add.overlap(player, enemies, playerHit, null, this);

    // 7. Inputs
    cursors = this.input.keyboard.createCursorKeys();
    keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    
    // Mouse Left-Click or Spacebar for Sword Swing
    this.input.on('pointerdown', () => { handleAttack(this); });
}

function update() {
    // 1. Enemy AI Patrol Logic
    enemies.children.iterate((enemy) => {
        if (enemy && enemy.body.blocked.left) {
            enemy.setVelocityX(150);
        } else if (enemy && enemy.body.blocked.right) {
            enemy.setVelocityX(-150);
        }
    });

    // 2. Freeze movement processing if currently dashing
    if (isDashing) return;

    // 3. Keep track of facing direction for combat orientation
    if (cursors.left.isDown) {
        lastFacingDirection = -1;
    } else if (cursors.right.isDown) {
        lastFacingDirection = 1;
    }

    // 4. Horizontal Run Logic
    if (cursors.left.isDown) {
        player.setVelocityX(-380);
    } else if (cursors.right.isDown) {
        player.setVelocityX(380);
    } else {
        player.setVelocityX(0);
    }

    // 5. Jump & Wall Jump Logic
    if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
        if (player.body.touching.down) {
            // Normal Ground Jump
            player.setVelocityY(-620);
        } 
        // Wall Jump Check: Must have the powerup AND be pressing against a side wall while airborne
        else if (hasWallJump && (player.body.blocked.left || player.body.blocked.right)) {
            let jumpDir = player.body.blocked.left ? 1 : -1;
            player.setVelocityX(jumpDir * 400); // Push off the wall horizontally
            player.setVelocityY(-580);          // Leap upwards vertically
        }
    }

    // 6. Dash Mechanic (Triggered via F Key)
    if (Phaser.Input.Keyboard.JustDown(keyF) && hasDash && canDash) {
        triggerDash(this);
    }

    // Reset dash capability when hitting solid ground
    if (player.body.touching.down) {
        canDash = true;
    }

    // 7. Synchronize Sword Position if an attack sequence is active
    if (isAttacking) {
        if (lastFacingDirection === 1) {
            swordAttack.setPosition(player.x + 35, player.y);
        } else {
            swordAttack.setPosition(player.x - 35, player.y);
        }
    }
}

// --- MECHANICS FUNCTIONS ---

function triggerDash(scene) {
    isDashing = true;
    canDash = false;
    
    // Maintain vertical stasis during dash execution
    player.body.setAllowGravity(false);
    player.setVelocityY(0);
    
    // Thrust player forward hard based on current input/facing
    dashDirection = lastFacingDirection;
    player.setVelocityX(dashDirection * 900);

    // End dash burst after 180 milliseconds
    scene.time.delayedCall(180, () => {
        isDashing = false;
        player.body.setAllowGravity(true);
        player.setVelocityX(0);
    });
}

function handleAttack(scene) {
    if (isAttacking) return; // Prevent spamming inside the animation frame window

    isAttacking = true;
    swordAttack.setActive(true).setVisible(true);

    // Flash the sword instance out of existence after 150ms
    scene.time.delayedCall(150, () => {
        isAttacking = false;
        swordAttack.setActive(false).setVisible(false);
        // Move away safely so it doesn't accidentally trigger floating overlaps
        swordAttack.setPosition(0, 0); 
    });
}

function collectPowerup(player, powerup) {
    let type = powerup.getData('type');
    
    if (type === 'walljump') {
        hasWallJump = true;
        alert("UNLOCKED: Wall Jumping! (Press Jump against green side walls)");
    } else if (type === 'dash') {
        hasDash = true;
        alert("UNLOCKED: Air Dash! (Press 'F' while moving to surge forward)");
    }
    
    powerup.destroy(); // Remove item from map
}

function destroyEnemy(sword, enemy) {
    if (!isAttacking) return;
    enemy.destroy();
}

function playerHit(player, enemy) {
    // Classic retro penalty: Return to starting line if punctured
    player.setPosition(200, 400);
    player.setVelocity(0,0);
}
