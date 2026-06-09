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
let keyC; // Dashing key
let keyX; // Attack key
let platforms;
let enemies;
let powerups;
let swordAttack;

// UI Text Elements
let healthText;

// Player Attributes & Metroidvania Progression
let playerHp = 5;
let isInvincible = false;
let hasWallJump = true; 
let hasDash = true;     

// Player State Variables
let isDashing = false;
let canDash = true;
let canAttack = true; 
let dashDirection = 1;
let isAttacking = false;
let lastFacingDirection = 1;

function preload() {
    // --- TEXTURES ---
    let pG = this.make.graphics({ x: 0, y: 0, add: false });
    pG.fillStyle(0xffffff, 1); pG.fillRect(0, 0, 32, 48);
    pG.generateTexture('playerTex', 32, 48);

    // Sword Hitbox (Massive Reach)
    let sG = this.make.graphics({ x: 0, y: 0, add: false });
    sG.fillStyle(0x00f0ff, 0.6); sG.fillRect(0, 0, 110, 32);
    sG.generateTexture('swordTex', 110, 32);

    // Enemy (Red Square)
    let eG = this.make.graphics({ x: 0, y: 0, add: false });
    eG.fillStyle(0xff3333, 1); eG.fillRect(0, 0, 40, 40);
    eG.generateTexture('enemyTex', 40, 40);

    // Hazard Spike (Red Triangle)
    let spikeG = this.make.graphics({ x: 0, y: 0, add: false });
    spikeG.fillStyle(0xff3333, 1); 
    spikeG.fillTriangle(0, 32, 16, 0, 32, 32); 
    spikeG.generateTexture('spikeTex', 32, 32);

    // Environment Platform Block (Green Square matching our 32x32 editor grid)
    let gG = this.make.graphics({ x: 0, y: 0, add: false });
    gG.fillStyle(0x00ff66, 1); gG.fillRect(0, 0, 32, 32);
    gG.generateTexture('groundTex', 32, 32);
}

function create() {
    // 1. EXTEND WORLD BOUNDS to match the size of our editor layout (40 columns * 32px = 1280px wide)
    this.physics.world.setBounds(0, 0, 1280, 720);

    // Initialize groups cleanly
    enemies = this.physics.add.group(); 
    platforms = this.physics.add.staticGroup();
    let spikes = this.physics.add.staticGroup();

    // 2. READ MAP DATA MATRIX FROM EDITOR MEMORY
    let savedMapRaw = localStorage.getItem('customMetroidvaniaMap');
    
    if (savedMapRaw) {
        let gridMap = JSON.parse(savedMapRaw);
        
        // Loop through the rows and columns of your custom painted map
        for (let r = 0; r < gridMap.length; r++) {
            for (let c = 0; c < gridMap[r].length; c++) {
                let blockType = gridMap[r][c];
                
                // Convert grid indices to screen pixel locations
                let spawnX = (c * 32) + 16;
                let spawnY = (r * 32) + 16;

                if (blockType === 1) {
                    platforms.create(spawnX, spawnY, 'groundTex');
                } else if (blockType === 2) {
                    spikes.create(spawnX, spawnY, 'spikeTex');
                } else if (blockType === 3) {
                    // Spawns a patrolling enemy right where you painted them!
                    setupPatrollingEnemy(spawnX, spawnY - 4, 100); 
                }
            }
        }
    } else {
        // Fallback default floor line so your player has ground if you haven't drawn in the editor yet
        let fallbackFloor = this.make.graphics({ x: 0, y: 0, add: false });
        fallbackFloor.fillStyle(0x00ff66, 1); fallbackFloor.fillRect(0, 0, 1280, 32);
        fallbackFloor.generateTexture('fallbackFloorTex', 1280, 32);
        platforms.create(640, 704, 'fallbackFloorTex');
    }

    // 3. Player Setup
    player = this.physics.add.sprite(200, 400, 'playerTex');
    player.setCollideWorldBounds(true); 

    // 4. Sword Setup
    swordAttack = this.physics.add.sprite(0, 0, 'swordTex');
    swordAttack.body.setAllowGravity(false);
    swordAttack.setActive(false).setVisible(false);

    // 5. Collisions & Hazards Configurations
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemies, platforms);
    
    this.physics.add.overlap(swordAttack, enemies, destroyEnemy, null, this);
    this.physics.add.overlap(player, enemies, takeDamage, null, this);
    this.physics.add.overlap(player, spikes, takeDamage, null, this);

    // 6. Input Hooks
    cursors = this.input.keyboard.createCursorKeys();
    keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

    // 7. Camera Constraints
    this.cameras.main.setBounds(0, 0, 1280, 720); 
    this.cameras.main.startFollow(player, true, 0.1, 0.1); 

    // 8. Health UI HUD
    healthText = this.add.text(20, 20, 'HP: ❤️❤️❤️❤️❤️', { font: '28px Arial', fill: '#ff3333' });
    healthText.setScrollFactor(0); 
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

    // Left/Right Controls
    if (cursors.left.isDown) {
        player.setVelocityX(-380);
    } else if (cursors.right.isDown) {
        player.setVelocityX(380);
    } else {
        player.setVelocityX(0);
    }

    // Jumping Mechanics (With Wall Jumps)
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

    // Dash Trigger (C Key)
    if (Phaser.Input.Keyboard.JustDown(keyC) && hasDash && canDash) {
        triggerDash(this);
    }

    if (player.body.touching.down) {
        canDash = true;
    }

    // Attack Trigger (X Key)
    if (Phaser.Input.Keyboard.JustDown(keyX)) {
        handleAttack(this);
    }

    // Sync Attack Position
    if (isAttacking) {
        let offset = lastFacingDirection === 1 ? 65 : -65;
        swordAttack.setPosition(player.x + offset, player.y);
    }
}

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
    if (isAttacking || !canAttack) return; 

    isAttacking = true;
    canAttack = false; 
    
    swordAttack.setActive(true).setVisible(true);
    player.setTint(0x00f0ff); 

    scene.time.delayedCall(150, () => {
        isAttacking = false;
        swordAttack.setActive(false).setVisible(false);
        swordAttack.setPosition(0, 0); 
        if (!isInvincible) player.clearTint();
    });

    scene.time.delayedCall(700, () => {
        canAttack = true;
    });
}

function takeDamage(player, hazard) {
    if (isInvincible || playerHp <= 0) return;

    playerHp--;
    isInvincible = true;

    let hearts = '';
    for(let i = 0; i < 5; i++) {
        hearts += i < playerHp ? '❤️' : '🖤';
    }
    healthText.setText('HP: ' + hearts);

    if (playerHp <= 0) {
        alert("GAME OVER! Resetting map...");
        location.reload();
        return;
    }

    let forceDirection = player.x < hazard.x ? -300 : 300;
    player.setVelocityX(forceDirection);
    player.setVelocityY(-350);
    player.setTint(0xff3333); 

    this.time.delayedCall(1000, () => {
        isInvincible = false;
        player.clearTint(); 
    });
}

function destroyEnemy(sword, enemy) {
    if (!isAttacking) return;
    enemy.destroy();
}
