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
            gravity: { y: 1400 },
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

// Game Objects
let player;
let cursors;
let keyC;
let keyX;
let platforms;
let enemies;
let powerups;
let swordAttack;

// UI Text Elements
let healthText;

// Player Attributes & Metroidvania Progression
let playerHp = 5;
let isInvincible = false;
let hasWallJump = false;
let hasDash = false;

// Player State Variables
let isDashing = false;
let canDash = true;
let dashDirection = 1;
let isAttacking = false;
let lastFacingDirection = 1;

function preload() {
    // --- TEXTURES ---
    let pG = this.make.graphics({ x: 0, y: 0, add: false });
    pG.fillStyle(0xffffff, 1); pG.fillRect(0, 0, 32, 48);
    pG.generateTexture('playerTex', 32, 48);


    let sG = this.make.graphics({ x: 0, y: 0, add: false });
    sG.fillStyle(0x00f0ff, 0.6); 
    sG.fillRect(0, 0, 110, 32); 
    sG.generateTexture('swordTex', 110, 32);

    // Hazard/Enemy Textures (Red things that deal damage)
    let eG = this.make.graphics({ x: 0, y: 0, add: false });
    eG.fillStyle(0xff3333, 1); eG.fillRect(0, 0, 40, 40);
    eG.generateTexture('enemyTex', 40, 40);

    let spikeG = this.make.graphics({ x: 0, y: 0, add: false });
    spikeG.fillStyle(0xff3333, 1); 
    spikeG.fillTriangle(0, 32, 16, 0, 32, 32); // Creates a red danger spike
    spikeG.generateTexture('spikeTex', 32, 32);

    // Powerups
    let pwG = this.make.graphics({ x: 0, y: 0, add: false });
    pwG.fillStyle(0x3344ff, 1); pwG.fillRect(0, 0, 24, 24);
    pwG.generateTexture('wallJumpTex', 24, 24);

    let pdG = this.make.graphics({ x: 0, y: 0, add: false });
    pdG.fillStyle(0xffcc00, 1); pdG.fillRect(0, 0, 24, 24);
    pdG.generateTexture('dashTex', 24, 24);

    // Long floor block
    let gG = this.make.graphics({ x: 0, y: 0, add: false });
    gG.fillStyle(0x00ff66, 1); gG.fillRect(0, 0, 4000, 32);
    gG.generateTexture('groundTex', 4000, 32);
}

function create() {
    // 1. EXTEND WORLD BOUNDS (3200 pixels wide!)
    this.physics.world.setBounds(0, 0, 3200, 720);

    // 2. Map Layout Layout
    platforms = this.physics.add.staticGroup();
    
    // Bottom ground stretching across our new 3200px world limit
    platforms.create(1600, 704, 'groundTex');

    // Scatter walls and ledges deep out into the world zone
    platforms.create(16, 360, 'groundTex').setDisplaySize(32, 720).refreshBody(); // Left boundary wall
    platforms.create(800, 500, 'groundTex').setDisplaySize(300, 32).refreshBody();
    platforms.create(1200, 350, 'groundTex').setDisplaySize(32, 500).refreshBody(); // High vertical wall block
    platforms.create(1600, 450, 'groundTex').setDisplaySize(400, 32).refreshBody();
    platforms.create(2300, 300, 'groundTex').setDisplaySize(500, 32).refreshBody();
    platforms.create(3184, 360, 'groundTex').setDisplaySize(32, 720).refreshBody(); // Right boundary wall

    // 3. Spikes & Hazards Group
    let spikes = this.physics.add.staticGroup();
    spikes.create(750, 672, 'spikeTex');
    spikes.create(782, 672, 'spikeTex');
    spikes.create(2200, 268, 'spikeTex');

    // 4. Player Setup
    player = this.physics.add.sprite(200, 500, 'playerTex');
    player.setCollideWorldBounds(true); // Locks player inside our 3200px setup

    // 5. Sword Setup
    swordAttack = this.physics.add.sprite(0, 0, 'swordTex');
    swordAttack.body.setAllowGravity(false);
    swordAttack.setActive(false).setVisible(false);

    // 6. Enemies
    enemies = this.physics.add.group();
    setupPatrollingEnemy(900, 450, 100);
    setupPatrollingEnemy(1700, 400, 120);
    setupPatrollingEnemy(2400, 250, 150);

    // 7. Powerups
    powerups = this.physics.add.staticGroup();
    powerups.create(1250, 200, 'wallJumpTex').setData('type', 'walljump');
    powerups.create(2000, 650, 'dashTex').setData('type', 'dash');

    // 8. Collisions & Hazards Engine
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);
    
    this.physics.add.overlap(player, powerups, collectPowerup, null, this);
    this.physics.add.overlap(swordAttack, enemies, destroyEnemy, null, this);
    
    // Damage overlaps (Touching spikes or enemies cuts 1 HP)
    this.physics.add.overlap(player, enemies, takeDamage, null, this);
    this.physics.add.overlap(player, spikes, takeDamage, null, this);

    // 9. Input Hooks
    cursors = this.input.keyboard.createCursorKeys();
    keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
   keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // 10. ADVANCED CAMERA CONFIGURATION
    this.cameras.main.setBounds(0, 0, 3200, 720); // Extends camera movement viewport
    this.cameras.main.startFollow(player, true, 0.1, 0.1); // Camera tracks player with smooth lerp movement

    // 11. SCROLL-LOCKED HEALTH HUD TEXT
    healthText = this.add.text(20, 20, 'HP: ❤️❤️❤️❤️❤️', { font: '28px Arial', fill: '#ff3333' });
    healthText.setScrollFactor(0); // This completely pins the UI text to screen view coordinates so it doesn't float away
}

function update() {
    // Enemy patrolling routine
    enemies.children.iterate((enemy) => {
        if (enemy && (enemy.body.blocked.left || enemy.body.touching.left)) {
            enemy.setVelocityX(120);
        } else if (enemy && (enemy.body.blocked.right || enemy.body.touching.right)) {
            enemy.setVelocityX(-120);
        }
    });

    if (isDashing) return;

    if (cursors.left.isDown) { lastFacingDirection = -1; }
    else if (cursors.right.isDown) { lastFacingDirection = 1; }

    // Run inputs
    if (cursors.left.isDown) {
        player.setVelocityX(-380);
    } else if (cursors.right.isDown) {
        player.setVelocityX(380);
    } else {
        player.setVelocityX(0);
    }

    // Jumping Mechanics
    if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
        if (player.body.touching.down) {
            player.setVelocityY(-620);
        } 
        else if (hasWallJump && (player.body.blocked.left || player.body.blocked.right)) {
            let jumpDir = player.body.blocked.left ? 1 : -1;
            player.setVelocityX(jumpDir * 420);
            player.setVelocityY(-580);
        }
    }

    // Dash Action
    if (Phaser.Input.Keyboard.JustDown(keyC) && hasDash && canDash) {
        triggerDash(this);
    }

    if (player.body.touching.down) {
        canDash = true;
    }

    // Match Attack Hitbox to orientation
    if (Phaser.Input.Keyboard.JustDown(keyX)) {
        handleAttack(this);
    }
    if (isAttacking) {
        let offset = lastFacingDirection === 1 ? 40 : -40;
        swordAttack.setPosition(player.x + offset, player.y);
    }
}

// --- HELPER CONFIGURATIONS ---

function setupPatrollingEnemy(x, y, speed) {
    let enemy = enemies.create(x, y, 'enemyTex');
    enemy.setCollideWorldBounds(true);
    enemy.setVelocityX(speed);
}

function triggerDash(scene) {
    isDashing = true;
    canDash = false;
    player.body.setAllowGravity(false);
    player.setVelocityY(0);
    player.setVelocityX(lastFacingDirection * 950);

    scene.time.delayedCall(180, () => {
        isDashing = false;
        player.body.setAllowGravity(true);
        player.setVelocityX(0);
    });
}

function handleAttack(scene) {
    if (isAttacking) return;
    isAttacking = true;
    swordAttack.setActive(true).setVisible(true);

    scene.time.delayedCall(150, () => {
        isAttacking = false;
        swordAttack.setActive(false).setVisible(false);
        swordAttack.setPosition(0, 0);
    });
}

function collectPowerup(player, powerup) {
    let type = powerup.getData('type');
    if (type === 'walljump') hasWallJump = true;
    if (type === 'dash') hasDash = true;
    powerup.destroy();
}

// --- HEALTH & INJURY SYSTEM ---

function takeDamage(player, hazard) {
    // Skip if currently immune due to tracking i-frames
    if (isInvincible || playerHp <= 0) return;

    playerHp--;
    isInvincible = true;

    // Update Hearts Display
    let hearts = '';
    for(let i = 0; i < 5; i++) {
        hearts += i < playerHp ? '❤️' : '🖤';
    }
    healthText.setText('HP: ' + hearts);

    if (playerHp <= 0) {
        alert("GAME OVER! Resetting map...");
        location.reload(); // Simple refresh to restart the scene configuration
        return;
    }

    // Knockback: Pop player up and away from damage source
    let forceDirection = player.x < hazard.x ? -300 : 300;
    player.setVelocityX(forceDirection);
    player.setVelocityY(-350);
    player.setTint(0xff3333); // Flash red immediately

    // Provide 1 second of invincibility frame protection
    this.time.delayedCall(1000, () => {
        isInvincible = false;
        player.clearTint(); // Revert back to original white sprite color
    });
}

function destroyEnemy(sword, enemy) {
    if (!isAttacking) return;
    enemy.destroy();
}
