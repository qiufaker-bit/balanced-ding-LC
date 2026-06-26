(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BalanceDing = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LOGICAL_WIDTH = 960;
  const LOGICAL_HEIGHT = 540;
  const VEHICLE_X = 332;
  const BASELINE_Y = 410;
  const CAR_SCALE = 0.25;
  const WHEEL_LOCAL_X = 176;
  const WHEEL_LOCAL_Y = 168;
  const WHEEL_RADIUS = 48;
  const WHEEL_SCREEN_RADIUS = WHEEL_RADIUS * CAR_SCALE;
  const WHEEL_BASE = WHEEL_LOCAL_X * 2 * CAR_SCALE;
  const GRAVITY = 620;
  const TAKEOFF_SPEED = 126;
  const DRIVE_FORCE = 250;
  const LOW_SPEED_TORQUE = 360;
  const HILL_CLIMB_BOOST = 260;
  const MIN_CLIMB_SPEED = 36;
  const REVERSE_FORCE = 320;
  const MAX_REVERSE_SPEED = 72;
  const EXAM_RAGE_GAS_TIME = 0.6;
  const EXAM_RAGE_STUCK_TIME = 1.0;
  const STUNT_PERIOD = 4200;
  const TERRAIN_CYCLE = 980;
  const TOOTH_PERIOD = TERRAIN_CYCLE * 4;
  const SKILL_PERIOD = TERRAIN_CYCLE * 8;
  const BOMB_PERIOD = TERRAIN_CYCLE * 3;
  const BOMB_DRAW_SCALE = 0.5;
  const DASH_DURATION = 2.8;
  const DASH_SPEED = 1880;
  const DASH_LIFT = 210;
  const BOMB_LAUNCH_VY = -2550;
  const SPACE_CAMERA_MIN = -5400;
  const METEOR_BASE_INTERVAL = 4.6;
  const METEOR_MIN_INTERVAL = 1.8;
  const METEOR_DAMAGE = 12;
  const SUSPENSION_STIFFNESS = 42;
  const SUSPENSION_DAMPING = 11.5;
  const CAR_COMEDY_DAMAGE_MAX = 100;
  const CHASSIS_CLEAR_TIME = 0.08;
  const CHASSIS_CONTACT_COOLDOWN = 0.34;
  const CHASSIS_PROBES = [
    { x: -236, y: 112 },
    { x: -126, y: 116 },
    { x: 0, y: 118 },
    { x: 126, y: 116 },
    { x: 226, y: 82 }
  ];
  const MAX_PITCH = 0.78;
  const MAX_ROLL = 0.82;
  const MAX_SLIP = 1.15;
  const MAX_CHAIR_TILT = 0.56;
  const MAX_RIDER_TILT = 0.72;
  const MAX_LIVES = 3;
  const CABIN_FLOOR_Y = 72;
  const RIDER_BASE_X = -44;
  const RIDER_BASE_Y = -68;

  function createBalanceDingGame(options) {
    return new MountainRvBalanceGame(options);
  }

  class MountainRvBalanceGame {
    constructor(options) {
      this.canvas = options.canvas;
      this.platform = options.platform || 'web';
      this.wx = options.wx || null;
      this.ctx = this.canvas.getContext('2d');
      this.characterSrc = options.characterSrc || null;
      this.bombSrc = options.bombSrc || null;
      this.characterImage = null;
      this.characterReady = false;
      this.bombImage = null;
      this.bombReady = false;
      this.dpr = 1;
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.running = false;
      this.lastTime = 0;
      this.pointer = null;
      this.buttons = {};
      this.shareTitle = '我在山地平衡房车里守住了蹲姿，你敢来吗？';
      this.best = this.loadBest();
      this.tiltInput = 0;
      this.touchLean = 0;
      this.sensorLean = 0;
      this.gasPressed = false;
      this.brakePressed = false;
      this.message = '';
      this.messageTimer = 0;
      this.soundEnabled = true;
      this.audio = null;
      this.lastSfxAt = {};
      this.loadCharacterImage();
      this.loadBombImage();
      this.resetGame();
      this.bindEvents();
    }

    start() {
      this.resize();
      this.running = true;
      this.lastTime = now();
      requestFrame(this.loop.bind(this));
    }

    getShareTitle() {
      return this.shareTitle;
    }

    resetGame() {
      this.state = 'start';
      this.distance = 0;
      this.velocity = 0;
      this.pitch = 0;
      this.pitchVelocity = 0;
      this.roll = 0;
      this.rollVelocity = 0;
      this.riderLongSlip = 0;
      this.riderSideSlip = 0;
      this.riderVelocityX = 0;
      this.riderVelocityY = 0;
      this.chairTilt = 0;
      this.chairTiltVelocity = 0;
      this.riderTilt = 0;
      this.riderTiltVelocity = 0;
      this.fallMeter = 0;
      this.bodyDanger = 0;
      this.bodyFloorContact = 0;
      this.lives = MAX_LIVES;
      this.lifeGraceTimer = 0;
      this.riderFallDrop = 0;
      this.vehicleScreenX = VEHICLE_X;
      this.vehicleCenterY = 0;
      this.cameraY = 0;
      this.vehicleVy = 0;
      this.suspensionVelocity = 0;
      this.airborne = false;
      this.takeoffCooldown = 0;
      this.landingGripTimer = 0;
      this.groundPitch = 0;
      this.chassisDamage = 0;
      this.chassisHitCount = 0;
      this.damageCooldown = 0;
      this.chassisContactCooldown = 0;
      this.chassisClearTimer = CHASSIS_CLEAR_TIME;
      this.chassisSeparated = true;
      this.chassisHitFlash = 0;
      this.roofJunkBounce = 0;
      this.runSeed = this.runSeed || 1001;
      this.bombProtectionTimer = 0;
      this.bombLaunchTimer = 0;
      this.airborneNoDeathTimer = 0;
      this.bombAirborneProtected = false;
      this.failAnimationTimer = 0;
      this.pendingFailReason = '';
      this.sparks = [];
      this.meteors = [];
      this.meteorTimer = 2.2;
      this.meteorHitCooldown = 0;
      this.oilDrops = [];
      this.fireParticles = [];
      this.leakTimer = 0;
      this.fireTimer = 0;
      this.bridgePulse = 0;
      this.coinCount = 0;
      this.coins = [];
      this.teeth = [];
      this.skills = [];
      this.skyRewards = [];
      this.bombs = [];
      this.shockwaves = [];
      this.dashTimer = 0;
      this.dashWorldStart = 0;
      this.toothHealAmount = 1;
      this.lastToothHealAmount = 0;
      this.gasPressed = false;
      this.brakePressed = false;
      this.gasHoldTimer = 0;
      this.stuckClimbTimer = 0;
      this.examRageTimer = 0;
      this.examRageCooldown = 0;
      this.rearWeight = 0;
      this.weightTarget = 0;
      this.coffeeTimer = 0;
      this.coffeeCooldown = 0;
      this.wheelSpin = 0;
      this.gustTimer = 0;
      this.gustPower = 0;
      this.eventName = '山路自习';
      this.failReason = '';
      this.message = '横屏开始：稳住房车，守住蹲姿';
      this.messageTimer = 3;
    }

    startRun() {
      this.state = 'playing';
      this.distance = 0;
      this.velocity = 0;
      this.pitch = 0.03;
      this.pitchVelocity = 0;
      this.roll = 0;
      this.rollVelocity = 0;
      this.riderLongSlip = 0;
      this.riderSideSlip = 0;
      this.riderVelocityX = 0;
      this.riderVelocityY = 0;
      this.chairTilt = 0;
      this.chairTiltVelocity = 0;
      this.riderTilt = 0;
      this.riderTiltVelocity = 0;
      this.fallMeter = 0;
      this.bodyDanger = 0;
      this.bodyFloorContact = 0;
      this.lives = MAX_LIVES;
      this.lifeGraceTimer = 0;
      this.riderFallDrop = 0;
      this.vehicleScreenX = VEHICLE_X;
      this.vehicleCenterY = 0;
      this.cameraY = 0;
      this.vehicleVy = 0;
      this.suspensionVelocity = 0;
      this.airborne = false;
      this.takeoffCooldown = 0;
      this.landingGripTimer = 0;
      this.groundPitch = 0;
      this.chassisDamage = 0;
      this.chassisHitCount = 0;
      this.damageCooldown = 0;
      this.chassisContactCooldown = 0;
      this.chassisClearTimer = CHASSIS_CLEAR_TIME;
      this.chassisSeparated = true;
      this.chassisHitFlash = 0;
      this.roofJunkBounce = 0;
      this.runSeed = Math.floor(Math.random() * 0x7fffffff) + 1;
      this.bombProtectionTimer = 0;
      this.bombLaunchTimer = 0;
      this.airborneNoDeathTimer = 0;
      this.bombAirborneProtected = false;
      this.failAnimationTimer = 0;
      this.pendingFailReason = '';
      this.sparks = [];
      this.meteors = [];
      this.meteorTimer = 2.2;
      this.meteorHitCooldown = 0;
      this.oilDrops = [];
      this.fireParticles = [];
      this.leakTimer = 0;
      this.fireTimer = 0;
      this.bridgePulse = 0;
      this.coinCount = 0;
      this.coins = [];
      this.teeth = [];
      this.skills = [];
      this.skyRewards = [];
      this.bombs = [];
      this.shockwaves = [];
      this.dashTimer = 0;
      this.dashWorldStart = 0;
      this.toothHealAmount = 1;
      this.lastToothHealAmount = 0;
      this.gasPressed = false;
      this.brakePressed = false;
      this.gasHoldTimer = 0;
      this.stuckClimbTimer = 0;
      this.examRageTimer = 0;
      this.examRageCooldown = 0;
      this.rearWeight = 0;
      this.weightTarget = 0;
      this.coffeeTimer = 0;
      this.coffeeCooldown = 0;
      this.wheelSpin = 0;
      this.gustTimer = 0;
      this.gustPower = 0;
      this.eventName = '碎石热身';
      this.failReason = '';
      this.showMessage('慢一点，稳一点，别让舍友从椅子上滑走', 2.4);
    }

    loop(timestamp) {
      const dt = Math.min(0.033, Math.max(0.001, (timestamp - this.lastTime) / 1000));
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      if (this.running) {
        requestFrame(this.loop.bind(this));
      }
    }

    update(dt) {
      this.updateAudio(dt);
      if (this.state === 'paused') {
        return;
      }
      if (this.messageTimer > 0) {
        this.messageTimer -= dt;
      }
      this.tiltInput = clamp(this.touchLean + this.sensorLean, -1, 1);

      if (this.state === 'failAnimation') {
        this.updateFailAnimation(dt);
        return;
      }

      if (this.state !== 'playing') {
        return;
      }

      const previousDistance = this.distance;
      this.gasHoldTimer = this.gasPressed ? this.gasHoldTimer + dt : 0;
      this.examRageCooldown = Math.max(0, this.examRageCooldown - dt);
      this.examRageTimer = Math.max(0, this.examRageTimer - dt);
      this.lifeGraceTimer = Math.max(0, this.lifeGraceTimer - dt);
      this.bombProtectionTimer = Math.max(0, this.bombProtectionTimer - dt);
      this.bombLaunchTimer = Math.max(0, this.bombLaunchTimer - dt);
      this.airborneNoDeathTimer = Math.max(0, this.airborneNoDeathTimer - dt);
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      const uphillAmount = this.airborne ? 0 : Math.max(0, -Math.sin(this.groundPitch || this.pitch));
      const ragePower = this.examRageTimer > 0 ? 1 : 0;
      const forwardSpeed = Math.max(0, this.velocity);
      const torqueCurve = this.gasPressed ? LOW_SPEED_TORQUE * (1 - clamp(forwardSpeed / 105, 0, 1)) : 0;
      const hillClimbBoost = this.gasPressed && uphillAmount > 0.04 ? HILL_CLIMB_BOOST * uphillAmount * (1 - clamp(forwardSpeed / 140, 0, 0.72)) : 0;
      const crawlAssist = this.gasPressed && uphillAmount > 0.1 && forwardSpeed < 28 ? 128 + uphillAmount * 160 : 0;
      const rocketBoost = this.gasPressed && ragePower ? 520 + uphillAmount * 420 : 0;
      const drive = this.gasPressed ? DRIVE_FORCE + torqueCurve + hillClimbBoost + crawlAssist + rocketBoost : 0;
      const reverseDrive = this.brakePressed ? REVERSE_FORCE * (1 - clamp(Math.abs(Math.min(0, this.velocity)) / MAX_REVERSE_SPEED, 0, 0.72)) : 0;
      const slopeForce = this.airborne ? 0 : Math.sin(this.groundPitch || this.pitch) * (this.gasPressed ? 38 : this.brakePressed ? 56 : 94);
      const idleDrag = this.gasPressed || this.brakePressed ? 0.997 : 0.86;
      this.velocity += (drive - reverseDrive + slopeForce) * dt;
      this.velocity *= Math.pow(idleDrag, dt * 8);
      if (this.gasPressed && uphillAmount > 0.14 && this.gasHoldTimer > 0.32 && forwardSpeed < MIN_CLIMB_SPEED) {
        this.velocity += (MIN_CLIMB_SPEED - this.velocity) * Math.min(1, dt * 4.5);
      }
      this.velocity = clamp(this.velocity, -MAX_REVERSE_SPEED, this.examRageTimer > 0 ? 230 : 188);
      if (this.dashTimer > 0) {
        this.velocity = Math.max(this.velocity, DASH_SPEED);
      }
      if (!this.gasPressed && !this.brakePressed && Math.abs(this.velocity) < 1.2) {
        this.velocity = 0;
      }

      this.distance += this.velocity * dt;
      this.wheelSpin += this.velocity * dt / WHEEL_SCREEN_RADIUS;
      this.rearWeight += (this.weightTarget - this.rearWeight) * Math.min(1, dt * 7.5);
      this.coffeeTimer = Math.max(0, this.coffeeTimer - dt);
      this.coffeeCooldown = Math.max(0, this.coffeeCooldown - dt);
      this.takeoffCooldown = Math.max(0, this.takeoffCooldown - dt);
      this.landingGripTimer = Math.max(0, this.landingGripTimer - dt);
      this.damageCooldown = Math.max(0, this.damageCooldown - dt);
      this.chassisContactCooldown = Math.max(0, this.chassisContactCooldown - dt);
      this.vehicleScreenX = VEHICLE_X + clamp(this.velocity * 0.18 - 10, -18, 22) + Math.sin(this.distance * 0.045) * Math.min(5, this.velocity * 0.035);

      const rearX = this.distance - WHEEL_BASE * 0.5;
      const frontX = this.distance + WHEEL_BASE * 0.5;
      const rearY = this.roadY(rearX);
      const frontY = this.roadY(frontX);
      const roadPitch = Math.atan2(frontY - rearY, WHEEL_BASE);
      this.groundPitch = roadPitch;
      const frameProgress = this.distance - previousDistance;
      const steepUphill = roadPitch < -0.32 || uphillAmount > 0.3;
      if (this.gasPressed && this.gasHoldTimer > EXAM_RAGE_GAS_TIME && steepUphill && (this.velocity < 18 || frameProgress < 0.18)) {
        this.stuckClimbTimer += dt;
      } else {
        this.stuckClimbTimer = Math.max(0, this.stuckClimbTimer - dt * 2.5);
      }
      if (this.gasPressed && steepUphill && this.gasHoldTimer > EXAM_RAGE_GAS_TIME && this.velocity < MIN_CLIMB_SPEED) {
        this.velocity = Math.max(this.velocity, MIN_CLIMB_SPEED);
      }
      if (this.stuckClimbTimer >= EXAM_RAGE_STUCK_TIME && this.examRageCooldown <= 0) {
        this.triggerExamRageClimb(roadPitch, rearY, frontY);
      }
      const difficulty = this.difficulty();
      const rough = this.roughness(this.distance) * difficulty;
      const bump = Math.sin(this.distance * 0.11) * rough + Math.sin(this.distance * 0.047 + 1.7) * rough * 0.7 + Math.sin(this.distance * 0.19) * rough * 0.36;
      const sideSlope = this.sideSlope(this.distance) * difficulty;
      const bridge = this.bridgeFactor(this.distance);
      const groundCenterY = (rearY + frontY) * 0.5 - WHEEL_SCREEN_RADIUS - CAR_SCALE * WHEEL_LOCAL_Y * Math.cos(roadPitch);
      if (this.dashTimer > 0) {
        const dashProgress = 1 - this.dashTimer / DASH_DURATION;
        const dashLift = DASH_LIFT + Math.sin(dashProgress * Math.PI) * 54 + Math.sin(dashProgress * Math.PI * 4) * 10;
        const targetDashY = groundCenterY - dashLift;
        this.airborne = true;
        this.vehicleVy = (targetDashY - (this.vehicleCenterY || targetDashY)) * 7.5;
        this.vehicleCenterY = (this.vehicleCenterY || targetDashY) + (targetDashY - (this.vehicleCenterY || targetDashY)) * Math.min(1, dt * 7);
        this.pitchVelocity += (-0.04 - this.pitchVelocity) * dt * 1.8;
        this.chairTiltVelocity *= Math.pow(0.45, dt);
        this.riderTiltVelocity *= Math.pow(0.45, dt);
      }
      const roadDropAhead = this.roadY(frontX + 84) - frontY;
      const longDropAhead = this.roadY(frontX + 170) - frontY;
      const slopeAhead = Math.atan2(this.roadY(frontX + 100) - frontY, 100);
      const slopeFarAhead = Math.atan2(this.roadY(frontX + 190) - frontY, 190);
      const crestCurve = slopeAhead - roadPitch;
      const launchSpeed = this.velocity > TAKEOFF_SPEED;
      const hasClearDrop = roadDropAhead > 24 || longDropAhead > 58;
      const launchReady = launchSpeed && this.takeoffCooldown <= 0 && this.landingGripTimer <= 0;
      const stunt = Math.max(this.stuntFactor(this.distance), this.stuntFactor(frontX));
      const rampWindow = stunt > 0.25 || (roadPitch < -0.18 && crestCurve > 0.1 && longDropAhead > 34);
      const crestLaunch = launchReady && roadPitch < -0.22 && crestCurve > 0.3 && hasClearDrop;
      const rampLaunch = this.takeoffCooldown <= 0 && this.landingGripTimer <= 0 && rampWindow && this.velocity > 88 && longDropAhead > 30;
      const stuntLaunch = this.takeoffCooldown <= 0 && this.landingGripTimer <= 0 && stunt > 0.35 && this.velocity > 68;
      const bridgeLaunch = launchReady && bridge > 0.86 && this.velocity > TAKEOFF_SPEED + 18 && roadDropAhead > 34;
      const cliffLaunch = launchReady && this.velocity > TAKEOFF_SPEED + 14 && longDropAhead > 86 && slopeFarAhead > 0.16;
      if (this.airborne && this.dashTimer <= 0) {
        this.vehicleVy += GRAVITY * dt;
        this.vehicleCenterY += this.vehicleVy * dt;
        this.pitchVelocity += (this.rearWeight * 0.12 - this.pitchVelocity * 0.08) * dt;
        this.tryLandVehicle(groundCenterY, rearY, frontY);
      } else if (this.dashTimer <= 0) {
        if (!this.vehicleCenterY) {
          this.vehicleCenterY = groundCenterY;
        }
        const springForce = (groundCenterY - this.vehicleCenterY) * SUSPENSION_STIFFNESS - this.suspensionVelocity * SUSPENSION_DAMPING;
        this.suspensionVelocity += springForce * dt;
        this.suspensionVelocity = clamp(this.suspensionVelocity, -260, 260);
        this.vehicleCenterY += this.suspensionVelocity * dt;
        const maxTravel = 18 + Math.min(18, this.velocity * 0.08);
        this.vehicleCenterY = clamp(this.vehicleCenterY, groundCenterY - maxTravel, groundCenterY + maxTravel);
        this.vehicleVy = this.suspensionVelocity;
        if (crestLaunch || rampLaunch || stuntLaunch || bridgeLaunch || cliffLaunch) {
          this.airborne = true;
          this.takeoffCooldown = 0.9;
          const tangentVy = Math.sin(roadPitch) * this.velocity;
          const crestLift = Math.max(0, crestCurve - 0.1) * 138 + Math.max(0, longDropAhead - 24) * 0.52 + bridge * 30 + stunt * 110;
          this.vehicleVy = clamp(tangentVy - crestLift, stuntLaunch ? -470 : -400, -82);
          this.pitchVelocity += clamp(-roadPitch + crestCurve * 0.32 + stunt * 0.18, -0.28, 0.72) * 1.65;
          this.chairTiltVelocity += 0.18;
          this.riderTiltVelocity += 0.16;
          this.showMessage(stuntLaunch ? '口腔医学起飞！' : '顺着坡飞起来了！稳住落地', 1.1);
        }
      }
      this.bridgePulse = bridge;

      this.ensureCoins();
      this.collectCoins();
      this.ensureTeeth();
      this.collectTeeth();
      this.ensureSkills();
      this.collectSkills();
      this.ensureBombs();
      this.collectBombs();
      this.updateSkyRewards();
      this.collectSkyRewards();
      this.updateCamera(dt);

      this.updateEvent(dt, rough, sideSlope);

      const targetPitch = this.airborne ? this.pitch + this.pitchVelocity * dt : roadPitch - this.rearWeight * 0.26 + bump * 0.058 + bridge * Math.sin(this.distance * 0.3) * 0.22;
      const pitchTorque = (targetPitch - this.pitch) * 11.2 - this.pitchVelocity * 1.82;
      this.pitchVelocity += pitchTorque * dt;
      this.pitch += this.pitchVelocity * dt;
      this.handleChassisCollision(dt);
      this.updateSparks(dt);
      this.updateShockwaves(dt);
      this.updateMeteors(dt);
      this.updateLeakEffects(dt);

      const playerCounter = this.tiltInput * 0.38;
      const targetRoll = sideSlope + this.gustPower - playerCounter + Math.sin(this.distance * 0.071) * rough * 0.05 + bridge * Math.cos(this.distance * 0.34) * 0.14;
      const rollTorque = (targetRoll - this.roll) * 9.2 - this.rollVelocity * 1.62;
      this.rollVelocity += rollTorque * dt;
      this.roll += this.rollVelocity * dt;

      const friction = this.coffeeTimer > 0 ? 0.58 : 0.16;
      const longForce = this.pitch * 2.2 + this.pitchVelocity * 0.58 - this.rearWeight * 0.42 + bump * 0.08 + bridge * Math.sin(this.distance * 0.25) * 0.16;
      const sideForce = this.roll * 2.4 + this.rollVelocity * 0.42 - this.tiltInput * 0.28 + this.gustPower * 1.04 + bridge * Math.cos(this.distance * 0.41) * 0.14;
      this.riderVelocityX += longForce * dt;
      this.riderVelocityY += sideForce * dt;
      this.riderVelocityX *= Math.pow(friction, dt);
      this.riderVelocityY *= Math.pow(friction, dt);
      this.riderLongSlip += this.riderVelocityX * dt;
      this.riderSideSlip += this.riderVelocityY * dt;
      this.riderLongSlip = clamp(this.riderLongSlip * 0.994, -1, 1);
      this.riderSideSlip = clamp(this.riderSideSlip * 0.994, -0.92, 0.92);

      const chairPush = this.pitch * 1.28 + this.pitchVelocity * 0.62 + this.roll * 0.52 + this.rollVelocity * 0.28 + bump * 0.08 + bridge * 0.38 - this.rearWeight * 0.38 - this.tiltInput * 0.18;
      const chairTorque = chairPush - this.chairTilt * (2.15 - difficulty * 0.3) - this.chairTiltVelocity * (1.0 - difficulty * 0.06);
      this.chairTiltVelocity += chairTorque * dt;
      this.chairTiltVelocity *= Math.pow(this.coffeeTimer > 0 ? 0.48 : 0.8, dt);
      this.chairTilt += this.chairTiltVelocity * dt;
      this.chairTilt = clamp(this.chairTilt, -1.4, 1.4);

      const riderPush = this.chairTilt * 1.65 + this.chairTiltVelocity * 1.02 + this.pitch * 0.55 + this.riderLongSlip * 0.34 + this.riderSideSlip * 0.26 + bridge * 0.22;
      const riderControl = this.rearWeight * 0.12 + this.tiltInput * 0.06;
      const tiltTorque = riderPush - riderControl - this.riderTilt * (1.48 - difficulty * 0.18) - this.riderTiltVelocity * (0.7 - difficulty * 0.03);
      this.riderTiltVelocity += tiltTorque * dt;
      this.riderTiltVelocity *= Math.pow(this.coffeeTimer > 0 ? 0.34 : 0.68, dt);
      this.riderTilt += this.riderTiltVelocity * dt;
      this.riderTilt = clamp(this.riderTilt, -1.9, 1.9);

      const riderDanger = Math.abs(this.riderTilt) / MAX_RIDER_TILT;
      const bodyDanger = clamp(
        Math.max(
          riderDanger,
          Math.max(0, Math.abs(this.riderLongSlip) - 0.12) * 0.9,
          Math.max(0, Math.abs(this.riderSideSlip) - 0.1) * 1.05
        ),
        0,
        1.6
      );
      this.bodyDanger = bodyDanger;
      const targetDrop = Math.max(0, bodyDanger - 0.72) * 96;
      this.riderFallDrop += (targetDrop - this.riderFallDrop) * Math.min(1, dt * 7);
      const floorContact = this.computeBodyFloorContact();
      this.bodyFloorContact = floorContact;
      const noDeathProtection = this.lifeGraceTimer > 0 || this.bombProtectionTimer > 0 || this.airborneNoDeathTimer > 0 || this.bombAirborneProtected;
      if (floorContact > 0 && !noDeathProtection) {
        this.fallMeter += (0.75 + floorContact * 1.4) * dt;
      } else {
        this.fallMeter = Math.max(0, this.fallMeter - dt * (noDeathProtection ? 3.8 : 0.7));
      }

      const stability = 1 - Math.min(1, Math.max(this.fallMeter, bodyDanger * 0.86));
      const stabilityCap = (this.examRageTimer > 0 || this.dashTimer > 0 ? 72 : 24) + stability * (this.examRageTimer > 0 || this.dashTimer > 0 ? 170 : 112);
      if (this.velocity > stabilityCap) {
        this.velocity -= (this.velocity - stabilityCap) * dt * (this.examRageTimer > 0 || this.dashTimer > 0 ? 0.4 : 2.1);
      }

      if (this.fallMeter >= 1 && !noDeathProtection) {
        this.handleRiderFall(this.riderTilt > 0 ? '舍友前倾摔到车厢地板' : '舍友后仰摔到车厢地板');
      }
    }

    updateEvent(dt, rough, sideSlope) {
      if (this.stuntFactor(this.distance) > 0.35) {
        this.eventName = '口腔医学起飞段';
        this.gustPower *= Math.pow(0.18, dt);
        return;
      }
      const zone = Math.floor(this.distance / 520) % 5;
      const names = ['碎石颠簸路', '侧风山脊', '绳索桥', '断桥弹跳', '悬空栈道'];
      this.eventName = names[zone];
      const bridge = this.bridgeFactor(this.distance);
      if (bridge > 0) {
        this.bridgePulse = bridge;
        this.pitchVelocity += Math.sin(this.distance * 0.23) * bridge * 0.28;
        this.rollVelocity += Math.cos(this.distance * 0.31) * bridge * 0.22;
        this.chairTiltVelocity += Math.sin(this.distance * 0.41) * bridge * 0.22;
        this.riderTiltVelocity += Math.cos(this.distance * 0.46) * bridge * 0.16;
      } else if (zone === 1 || zone === 4) {
        this.gustTimer -= dt;
        if (this.gustTimer <= 0) {
          this.gustTimer = 1.1 + Math.random() * 1.4;
          this.gustPower = (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.abs(sideSlope) * 0.45);
          this.showMessage('侧风！反向压重心', 1.1);
        } else {
          this.gustPower *= Math.pow(0.26, dt);
        }
      } else if (zone === 3 && rough > 0.5 && Math.sin(this.distance * 0.055) > 0.96) {
        this.pitchVelocity += 0.24;
        this.rollVelocity += Math.sin(this.distance) * 0.18;
        this.chairTiltVelocity += 0.14;
        this.riderTiltVelocity += 0.1;
        this.showMessage('断桥弹跳！别追速度', 1);
      } else {
        this.gustPower *= Math.pow(0.12, dt);
      }
    }

    ensureCoins() {
      const start = Math.floor((this.distance + 180) / 140) * 140;
      const end = this.distance + 1500;
      for (let x = start; x < end; x += 140) {
        const key = Math.floor(x / 140);
        if (this.coins.some((coin) => coin.key === key)) {
          continue;
        }
        const bridge = this.bridgeFactor(x);
        const bonus = this.seeded(key * 13 + 5) > 0.82;
        const lane = key % 4;
        const lift = (bridge > 0 ? 78 + lane * 10 : 52 + lane * 12) + this.seeded(key * 17 + 9) * 34 + (bonus ? 42 : 0);
        const coinX = x + (this.seeded(key * 29 + 1) - 0.5) * 44;
        this.coins.push({
          key,
          x: coinX,
          y: this.roadY(coinX) - lift,
          r: bridge > 0 ? 13 : 11,
          collected: false
        });
      }
      this.coins = this.coins.filter((coin) => !coin.collected && coin.x > this.distance - 260 && coin.x < this.distance + 1700);
    }

    collectCoins() {
      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 60);
      for (const coin of this.coins) {
        if (coin.collected) continue;
        const sx = this.screenXForWorld(coin.x);
        const dx = sx - (this.vehicleScreenX || VEHICLE_X);
        const dy = coin.y - carY;
        if (Math.abs(dx) < 92 && Math.abs(dy) < 118) {
          coin.collected = true;
          this.coinCount += 1;
          this.playSfx('coin');
        }
      }
    }

    ensureTeeth() {
      const startCycle = Math.floor((this.distance - 260) / TOOTH_PERIOD);
      const endCycle = Math.ceil((this.distance + 1800) / TOOTH_PERIOD);
      for (let cycle = startCycle; cycle <= endCycle; cycle += 1) {
        const key = cycle;
        if (this.teeth.some((tooth) => tooth.key === key)) {
          continue;
        }
        const x = cycle * TOOTH_PERIOD + 1180 + (this.seeded(cycle * 31 + 4) - 0.5) * 520;
        const bridge = this.bridgeFactor(x);
        const stunt = this.stuntFactor(x);
        this.teeth.push({
          key,
          x,
          y: this.roadY(x) - (stunt > 0 ? 118 : bridge > 0 ? 104 : 86),
          r: 18,
          collected: false
        });
      }
      this.teeth = this.teeth.filter((tooth) => !tooth.collected && tooth.x > this.distance - 320 && tooth.x < this.distance + 1900);
    }

    collectTeeth() {
      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 60);
      for (const tooth of this.teeth) {
        if (tooth.collected) continue;
        const sx = this.screenXForWorld(tooth.x);
        const dx = sx - (this.vehicleScreenX || VEHICLE_X);
        const dy = tooth.y - carY;
        if (Math.abs(dx) < 98 && Math.abs(dy) < 124) {
          tooth.collected = true;
          if (!this.healOneLifeFromTooth(1.25)) {
            this.coinCount += 3;
            this.showMessage('牙齿满血！金币 +3', 1.05);
          }
          this.roofJunkBounce = Math.min(1, this.roofJunkBounce + 0.45);
          this.emitSparks(tooth.x, tooth.y, 28);
          this.playSfx('tooth');
        }
      }
    }

    ensureSkills() {
      const start = Math.floor((this.distance - 360) / SKILL_PERIOD);
      const end = Math.ceil((this.distance + 1900) / SKILL_PERIOD);
      for (let key = start; key <= end; key += 1) {
        if (this.skills.some((skill) => skill.key === key)) continue;
        const x = key * SKILL_PERIOD + 1480 + (this.seeded(key * 41 + 8) - 0.5) * 760;
        this.skills.push({
          key,
          x,
          y: this.roadY(x) - 120,
          collected: false
        });
      }
      this.skills = this.skills.filter((skill) => !skill.collected && skill.x > this.distance - 340 && skill.x < this.distance + 2000);
    }

    collectSkills() {
      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 60);
      for (const skill of this.skills) {
        if (skill.collected) continue;
        const sx = this.screenXForWorld(skill.x);
        const dx = sx - (this.vehicleScreenX || VEHICLE_X);
        const dy = skill.y - carY;
        if (Math.abs(dx) < 108 && Math.abs(dy) < 132) {
          skill.collected = true;
          this.triggerDashSkill(skill.x);
        }
      }
    }

    ensureBombs() {
      const start = Math.floor((this.distance - 420) / BOMB_PERIOD);
      const end = Math.ceil((this.distance + 2100) / BOMB_PERIOD);
      for (let key = start; key <= end; key += 1) {
        const row = this.seeded(key * 53 + 6) > 0.78;
        const count = row ? 5 + Math.floor(this.seeded(key * 53 + 9) * 4) : 1;
        for (let i = 0; i < count; i += 1) {
          const bombKey = key * 10 + i;
          if (this.bombs.some((bomb) => bomb.key === bombKey)) continue;
          const spread = row ? (i - (count - 1) / 2) * (92 + this.seeded(key * 61 + i) * 34) : 0;
          const x = key * BOMB_PERIOD + 1720 + (this.seeded(key * 47 + 2) - 0.5) * 680 + spread;
          const bridge = this.bridgeFactor(x);
          this.bombs.push({
            key: bombKey,
            x,
            y: this.roadY(x) - (bridge > 0 ? 48 : 32),
            spin: bombKey * 0.91,
            triggered: false
          });
        }
      }
      this.bombs = this.bombs.filter((bomb) => !bomb.triggered && bomb.x > this.distance - 360 && bomb.x < this.distance + 2200);
    }

    collectBombs() {
      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 70);
      for (const bomb of this.bombs) {
        if (bomb.triggered) continue;
        bomb.spin += 0.055 + Math.min(0.08, Math.abs(this.velocity) * 0.00008);
        const sx = this.screenXForWorld(bomb.x);
        const dx = sx - (this.vehicleScreenX || VEHICLE_X);
        const dy = bomb.y - carY;
        if (Math.abs(dx) < 86 && Math.abs(dy) < 104) {
          bomb.triggered = true;
          this.triggerBacteriaBomb(bomb);
        }
      }
    }

    triggerBacteriaBomb(bomb) {
      this.dashTimer = 0;
      this.airborne = true;
      this.vehicleCenterY = this.vehicleCenterY || (this.roadY(this.distance) - 90);
      this.vehicleVy = BOMB_LAUNCH_VY;
      this.suspensionVelocity = BOMB_LAUNCH_VY * 0.22;
      this.velocity = Math.max(this.velocity, 360);
      this.takeoffCooldown = 1.4;
      this.landingGripTimer = 0;
      this.pitchVelocity += 2.2 + Math.random() * 0.8;
      this.rollVelocity += (Math.random() > 0.5 ? 1 : -1) * 1.6;
      this.chairTiltVelocity += 2.4;
      this.riderTiltVelocity += 1.85;
      this.riderVelocityX += 1.2;
      this.riderVelocityY += (Math.random() > 0.5 ? 1 : -1) * 1.1;
      this.roofJunkBounce = 1;
      this.chassisHitFlash = 1;
      this.lifeGraceTimer = Math.max(this.lifeGraceTimer, 0.45);
      this.bombLaunchTimer = 4.2;
      this.airborneNoDeathTimer = 8.5;
      this.bombProtectionTimer = 8.5;
      this.bombAirborneProtected = true;
      this.fallMeter = 0;
      this.emitSparks(bomb.x, bomb.y, 140);
      this.shockwaves.push({ x: bomb.x, y: bomb.y, life: 0.9, maxLife: 0.9, radius: 24 });
      this.showMessage('变异链球菌爆发！炸飞但不直接扣命', 1.4);
      this.playSfx('bomb');
      if (this.wx && this.wx.vibrateShort) {
        this.wx.vibrateShort({ type: 'heavy' });
      }
    }

    triggerDashSkill(x) {
      this.dashTimer = DASH_DURATION;
      this.dashWorldStart = x;
      this.velocity = Math.max(this.velocity, DASH_SPEED);
      this.airborne = true;
      this.vehicleVy = -420;
      this.takeoffCooldown = Math.max(this.takeoffCooldown, 0.65);
      this.lifeGraceTimer = Math.max(this.lifeGraceTimer, 1.0);
      this.roofJunkBounce = 1;
      this.chassisHitFlash = 1;
      this.ensureSkyRewards(x);
      this.showMessage('口腔冲刺！起飞！', 1.35);
      this.playSfx('dash');
    }

    ensureSkyRewards(startX) {
      this.skyRewards = [];
      const baseY = this.roadY(startX) - 260;
      for (let i = 0; i < 44; i += 1) {
        const x = startX + 160 + i * 125;
        this.skyRewards.push({
          type: i % 14 === 5 ? 'tooth' : 'coin',
          x,
          y: baseY - 20 - Math.sin(i * 1.3) * 42 - (i % 4) * 22,
          key: i,
          collected: false
        });
      }
      for (let i = 0; i < 18; i += 1) {
        this.skyRewards.push({
          type: 'cloud',
          x: startX + 80 + i * 310,
          y: baseY - 140 - (i % 3) * 38,
          key: 100 + i,
          collected: false
        });
      }
    }

    updateSkyRewards() {
      if (this.dashTimer <= 0) {
        this.skyRewards = [];
        return;
      }
      this.skyRewards = this.skyRewards.filter((item) => item.x > this.distance - 520 && item.x < this.distance + 5800 && !item.collected);
    }

    collectSkyRewards() {
      if (this.dashTimer <= 0) return;
      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 140);
      for (const item of this.skyRewards) {
        if (item.collected || item.type === 'cloud') continue;
        const sx = this.screenXForWorld(item.x);
        const dx = sx - (this.vehicleScreenX || VEHICLE_X);
        const dy = item.y - carY;
        if (Math.abs(dx) < 102 && Math.abs(dy) < 118) {
          item.collected = true;
          if (item.type === 'tooth') {
            if (!this.healOneLifeFromTooth(1.0)) {
              this.coinCount += 3;
              this.showMessage('牙齿满血，金币 +3', 0.85);
            }
            this.playSfx('tooth');
          } else {
            this.coinCount += 1;
            this.playSfx('coin');
          }
        }
      }
    }

    healOneLifeFromTooth(messageDuration) {
      this.toothHealAmount = 1;
      this.lastToothHealAmount = 0;
      if (this.lives >= MAX_LIVES) {
        this.lives = MAX_LIVES;
        return false;
      }
      const before = this.lives;
      this.lives = Math.min(MAX_LIVES, this.lives + this.toothHealAmount);
      this.lastToothHealAmount = this.lives - before;
      this.showMessage('补牙成功！命 +1', messageDuration);
      return true;
    }

    difficulty() {
      return this.difficultyAt(this.distance);
    }

    difficultyAt(x) {
      return clamp(0.82 + x / 1100, 0.82, 2.25);
    }

    seeded(key) {
      return hashRandom(this.runSeed || 1, key);
    }

    cycleNoise(x, salt) {
      const cycle = Math.floor(x / TERRAIN_CYCLE);
      return this.seeded(cycle * 97 + salt);
    }

    roadY(x) {
      return (
        this.terrainY(x - 18) * 0.12
        + this.terrainY(x - 9) * 0.22
        + this.terrainY(x) * 0.32
        + this.terrainY(x + 9) * 0.22
        + this.terrainY(x + 18) * 0.12
      );
    }

    screenXForWorld(x) {
      return x - this.distance + (this.vehicleScreenX || VEHICLE_X);
    }

    worldXForScreen(x) {
      return this.distance + x - (this.vehicleScreenX || VEHICLE_X);
    }

    screenYForWorld(y) {
      return y - (this.cameraY || 0);
    }

    updateCamera(dt) {
      const fallbackY = this.roadY(this.distance) - 76;
      const focusY = this.vehicleCenterY || fallbackY;
      const target = clamp(focusY - 325, SPACE_CAMERA_MIN, 260);
      this.cameraY += (target - (this.cameraY || 0)) * Math.min(1, dt * 3.4);
    }

    isBridgeGap(x) {
      const t = mod(x, 1500);
      return (t > 660 && t < 1180) || (t > 1220 && t < 1370);
    }

    computeBodyFloorContact() {
      const riderY = RIDER_BASE_Y + this.riderSideSlip * 12 + this.riderFallDrop;
      const angle = this.chairTilt * 0.58 + this.riderTilt * 0.36 + this.roll * 0.04 + this.riderSideSlip * 0.04;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const bodyPoints = [
        { x: -42, y: 4 },
        { x: -16, y: -18 },
        { x: 22, y: -44 },
        { x: 58, y: -28 },
        { x: 74, y: -8 }
      ];
      let deepest = -Infinity;
      for (const point of bodyPoints) {
        const y = riderY + point.x * sin + point.y * cos;
        deepest = Math.max(deepest, y);
      }
      return clamp((deepest - (CABIN_FLOOR_Y - 2)) / 34, 0, 1.3);
    }

    terrainY(x) {
      const d = this.difficultyAt(Math.max(0, x));
      const t = mod(x, TERRAIN_CYCLE);
      const cycle = Math.floor(x / TERRAIN_CYCLE);
      const r1 = this.seeded(cycle * 19 + 3);
      const r2 = this.seeded(cycle * 19 + 7);
      const r3 = this.seeded(cycle * 19 + 11);
      const crest = t < 180 ? Math.sin(t / 180 * Math.PI) * (12 + r1 * 32) : 0;
      const lip = t > 220 && t < 360 ? smoothStep((t - 220) / 140) * (22 + r2 * 58) : 0;
      const drop = t >= 360 && t < 520 ? (32 + r3 * 70) * (1 - smoothStep((t - 360) / 160)) : 0;
      const pothole = t > 620 && t < 760 ? -Math.sin((t - 620) / 140 * Math.PI) * (18 + r2 * 38) : 0;
      const kick = t > 790 && t < 930 ? Math.sin((t - 790) / 140 * Math.PI) * (22 + r1 * 48) : 0;
      const extraWave = Math.sin((t / TERRAIN_CYCLE) * Math.PI * (2 + Math.floor(r3 * 3))) * (r1 - 0.5) * 30;
      return BASELINE_Y
        + Math.sin(x * 0.0047 + this.runSeed * 0.0003) * 34 * d
        + Math.sin(x * 0.012 + 1.8 + this.runSeed * 0.0007) * 16 * d
        + Math.sin(x * 0.024 + r2 * 2) * 4 * d
        + crest
        + lip
        + drop
        + pothole
        + kick
        + extraWave
        + this.bridgeShape(x) * d
        + this.stuntShape(x);
    }

    stuntShape(x) {
      const t = mod(x, STUNT_PERIOD);
      if (t < 720) {
        return -Math.sin(t / 720 * Math.PI) * 8;
      }
      if (t < 980) {
        return -20 - smoothStep((t - 720) / 260) * 210;
      }
      if (t < 1320) {
        return -230 + smoothStep((t - 980) / 340) * 360;
      }
      if (t < 2300) {
        return 130 + Math.sin((t - 1320) / 980 * Math.PI) * 18;
      }
      if (t < 2860) {
        return 130 * (1 - smoothStep((t - 2300) / 560));
      }
      return 0;
    }

    stuntFactor(x) {
      const t = mod(x, STUNT_PERIOD);
      if (t > 680 && t < 1380) {
        return 1 - Math.abs((t - 1030) / 350);
      }
      return 0;
    }

    bridgeShape(x) {
      const t = mod(x, 1500);
      if (t > 660 && t < 940) {
        return (t - 660) * 0.56;
      }
      if (t >= 940 && t < 1180) {
        return 156 - (t - 940) * 0.72;
      }
      if (t > 1220 && t < 1370) {
        return Math.sin((t - 1220) / 150 * Math.PI) * -94;
      }
      return 0;
    }

    sideSlope(x) {
      return Math.sin(x * 0.0046 + 0.8) * 0.24 + Math.sin(x * 0.013) * 0.12;
    }

    roughness(x) {
      const zone = Math.floor(x / 520) % 5;
      if (zone === 0) return 0.58;
      if (zone === 1) return 1.02;
      if (zone === 2) return 0.34;
      if (zone === 3) return 1.28;
      return 0.92;
    }

    bridgeFactor(x) {
      const t = mod(x, 1500);
      if (t > 660 && t < 1180) {
        return 1 - Math.abs((t - 920) / 260);
      }
      if (t > 1220 && t < 1370) {
        return 1 - Math.abs((t - 1295) / 75);
      }
      return 0;
    }

    tryLandVehicle(groundCenterY, rearY, frontY) {
      if (this.vehicleCenterY < groundCenterY || this.vehicleVy < 0) {
        return;
      }
      const impact = this.vehicleVy;
      this.airborne = false;
      this.vehicleCenterY = groundCenterY + Math.min(10, impact * 0.025);
      this.vehicleVy = 0;
      this.suspensionVelocity = clamp(impact * 0.18, 0, 150);
      this.landingGripTimer = 0.28;
      if (this.bombLaunchTimer > 0 || this.airborneNoDeathTimer > 0) {
        this.bombProtectionTimer = Math.max(this.bombProtectionTimer, 1.05);
        this.airborneNoDeathTimer = 0;
        this.bombAirborneProtected = false;
        this.fallMeter = 0;
      }
      this.groundPitch = Math.atan2(frontY - rearY, WHEEL_BASE);
      if (impact > 145) {
        this.applyChassisImpact(this.distance, (rearY + frontY) * 0.5, (impact - 110) * 0.11, 'landing');
      } else {
        this.chairTiltVelocity += impact * 0.0012;
        this.riderTiltVelocity += impact * 0.001;
      }
    }

    triggerExamRageClimb(roadPitch, rearY, frontY) {
      this.stuckClimbTimer = 0;
      this.examRageTimer = 1.15;
      this.examRageCooldown = 1.55;
      this.velocity = Math.max(this.velocity, 116);
      this.distance += 22;
      this.vehicleCenterY = (this.vehicleCenterY || ((rearY + frontY) * 0.5 - 60)) - 22;
      this.suspensionVelocity = -260;
      this.vehicleVy = -340;
      this.pitchVelocity += clamp(-roadPitch, 0.12, 0.9) * 1.9;
      this.chairTiltVelocity += 0.28;
      this.riderTiltVelocity += 0.22;
      this.roofJunkBounce = 1;
      this.chassisHitFlash = 1;
      this.takeoffCooldown = 0.55;
      if (roadPitch < -0.48) {
        this.airborne = true;
        this.landingGripTimer = 0;
      }
      this.emitSparks(this.distance - WHEEL_BASE * 0.4, (rearY + frontY) * 0.5, 48);
      this.showMessage('期末爆肝！一飞冲天！', 1.25);
    }

    handleRiderFall(reason) {
      if (this.bombAirborneProtected || this.bombProtectionTimer > 0 || this.airborneNoDeathTimer > 0) {
        this.fallMeter = 0;
        return;
      }
      if (this.lifeGraceTimer > 0) {
        return;
      }
      if (this.lives <= 1) {
        this.lives = 0;
        this.playSfx('hurt');
        this.endRun(`${reason}，三条命用完了`);
        return;
      }
      this.lives -= 1;
      this.playSfx('hurt');
      this.lifeGraceTimer = 1.35;
      this.fallMeter = 0;
      this.bodyDanger = 0;
      this.bodyFloorContact = 0;
      this.riderFallDrop = 0;
      this.riderLongSlip = 0;
      this.riderSideSlip = 0;
      this.riderVelocityX = 0;
      this.riderVelocityY = 0;
      this.chairTilt *= 0.18;
      this.chairTiltVelocity = 0;
      this.riderTilt *= 0.12;
      this.riderTiltVelocity = 0;
      this.velocity *= 0.78;
      this.showMessage(`扶起来继续！还剩 ${this.lives} 条命`, 1.25);
      if (this.wx && this.wx.vibrateShort) {
        this.wx.vibrateShort({ type: 'medium' });
      }
    }

    handleChassisCollision(dt) {
      if (this.vehicleCenterY === undefined || this.vehicleCenterY === null) return;
      const angle = this.airborne ? this.pitch : (this.groundPitch || this.pitch);
      let worst = null;
      let count = 0;
      for (const probe of CHASSIS_PROBES) {
        const point = this.localToWorld(probe.x, probe.y, angle);
        const road = this.roadY(point.x);
        const penetration = point.y - road;
        if (penetration > 0) {
          count += 1;
          if (!worst || penetration > worst.penetration) {
            worst = { x: point.x, y: road, penetration, probeX: probe.x };
          }
        }
      }
      if (!worst) {
        this.chassisClearTimer = Math.min(0.4, this.chassisClearTimer + dt);
        if (this.chassisClearTimer >= CHASSIS_CLEAR_TIME) {
          this.chassisSeparated = true;
        }
        return;
      }

      const wasSeparated = this.chassisSeparated && this.chassisClearTimer >= CHASSIS_CLEAR_TIME;
      const normal = this.terrainNormalAt(worst.x);
      const correction = worst.penetration + 9;
      this.vehicleCenterY += normal.y * correction;
      this.distance += clamp(normal.x * correction * 0.22, -10, 10);
      this.resolveResidualChassisPenetration(angle);

      const slopeKick = Math.abs(this.terrainSlopeAt(worst.x)) * 10;
      const hitPower = worst.penetration * 0.52 + Math.max(0, this.vehicleVy) * 0.03 + this.velocity * 0.026 + slopeKick + count * 0.8;
      const heavyStrike = worst.penetration > 18 || (this.velocity > 112 && hitPower > 34);
      const bounce = clamp(28 + hitPower * 2.4, 34, 150);
      this.takeoffCooldown = Math.max(this.takeoffCooldown, heavyStrike ? 0.34 : 0.18);
      if (heavyStrike) {
        this.airborne = true;
        this.vehicleVy = -Math.max(bounce, Math.abs(this.vehicleVy) * 0.16);
      } else {
        this.suspensionVelocity = Math.min(this.suspensionVelocity, -bounce);
        this.vehicleVy = this.suspensionVelocity;
      }

      const speedKeep = clamp(1 - hitPower * 0.0075, 0.72, 0.96);
      this.velocity *= speedKeep;
      if (this.gasPressed) {
        this.velocity = Math.max(this.velocity, 14);
      } else if (this.brakePressed) {
        this.velocity = Math.min(this.velocity, -8);
      } else if (Math.abs(this.velocity) < 6) {
        this.velocity = this.velocity < 0 ? -6 : 6;
      }
      if (Math.abs(this.velocity) < 28) {
        const lowSpeedNudge = 5 + Math.min(8, worst.penetration * 0.16);
        if (this.gasPressed) {
          this.distance += lowSpeedNudge * 1.25;
          this.velocity += 26;
          this.suspensionVelocity = Math.min(this.suspensionVelocity, -72);
        } else if (this.brakePressed) {
          this.distance -= lowSpeedNudge * 1.1;
          this.velocity -= 18;
          this.suspensionVelocity = Math.min(this.suspensionVelocity, -52);
        } else {
          this.distance += worst.probeX > 0 ? -lowSpeedNudge : lowSpeedNudge * 0.55;
          this.velocity += 4;
        }
      }
      if (this.gasPressed && this.gasHoldTimer > EXAM_RAGE_GAS_TIME && worst.probeX >= 0 && this.velocity < MIN_CLIMB_SPEED + 18 && this.examRageCooldown <= 0) {
        this.triggerExamRageClimb(this.groundPitch || this.pitch, worst.y, worst.y);
      }

      const torqueDir = worst.probeX < 0 ? 1 : -1;
      this.pitchVelocity += torqueDir * clamp(hitPower * 0.014, 0.08, 0.52);
      this.chairTiltVelocity += torqueDir * (0.08 + hitPower * 0.006);
      this.riderTiltVelocity += 0.06 + hitPower * 0.004;

      if (wasSeparated && this.chassisContactCooldown <= 0) {
        this.applyChassisImpact(worst.x, worst.y, hitPower, 'scrape');
        this.chassisContactCooldown = CHASSIS_CONTACT_COOLDOWN;
      } else if (this.chassisHitFlash <= 0.08 && hitPower > 18) {
        this.chassisHitFlash = Math.max(this.chassisHitFlash, 0.2);
      }
      this.chassisSeparated = false;
      this.chassisClearTimer = 0;
    }

    terrainSlopeAt(x) {
      return (this.roadY(x + 10) - this.roadY(x - 10)) / 20;
    }

    terrainNormalAt(x) {
      const slope = this.terrainSlopeAt(x);
      const length = Math.sqrt(slope * slope + 1) || 1;
      return {
        x: clamp(slope / length, -0.72, 0.72),
        y: -1 / length
      };
    }

    resolveResidualChassisPenetration(angle) {
      let residual = 0;
      for (const probe of CHASSIS_PROBES) {
        const point = this.localToWorld(probe.x, probe.y, angle);
        residual = Math.max(residual, point.y - this.roadY(point.x));
      }
      if (residual > 0) {
        this.vehicleCenterY -= residual + 5;
      }
    }

    applyChassisImpact(x, y, power, type) {
      const threshold = type === 'landing' ? 20 : 17;
      const effectivePower = Math.max(0, power - threshold);
      const isEffectiveHit = type === 'landing' || power > threshold + 3;
      if (isEffectiveHit) {
        this.chassisHitCount += 1;
      }
      let damageGain = type === 'landing' ? effectivePower * 0.26 : effectivePower * 0.18;
      if (power < threshold + 8) {
        damageGain *= 0.72;
      } else if (power < threshold + 22) {
        damageGain *= 1.1;
      }
      if (damageGain > 0 && isEffectiveHit) {
        damageGain += type === 'landing' ? 4.6 : 3.2;
      }
      if (this.damageCooldown > 0) {
        damageGain *= 0.62;
      }
      damageGain = Math.min(damageGain, type === 'landing' ? 18 : 12);
      this.damageCooldown = Math.max(this.damageCooldown, 0.12);
      this.chassisDamage = clamp(this.chassisDamage + damageGain, 0, CAR_COMEDY_DAMAGE_MAX);
      this.chassisHitFlash = Math.min(1, this.chassisHitFlash + power * 0.055);
      this.roofJunkBounce = Math.min(1, this.roofJunkBounce + power * 0.025);
      this.chairTiltVelocity += (0.04 + power * 0.004) * (Math.random() > 0.5 ? 1 : -1);
      this.riderTiltVelocity += 0.025 + power * 0.0025;
      this.emitSparks(x, y, power);
      this.playSfx('impact');
      if (power > 26 && this.examRageTimer <= 0) {
        this.showMessage(type === 'landing' ? '车壳哐当一下，又多了点喜感' : '底盘磕到了，车壳更抽象了', 0.9);
      }
    }

    localToWorld(x, y, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: this.distance + x * CAR_SCALE * cos - y * CAR_SCALE * sin,
        y: this.vehicleCenterY + x * CAR_SCALE * sin + y * CAR_SCALE * cos
      };
    }

    emitSparks(x, y, power) {
      const count = Math.min(14, 4 + Math.floor(power * 0.32));
      for (let i = 0; i < count; i += 1) {
        this.sparks.push({
          x,
          y,
          vx: (Math.random() - 0.5) * (80 + power * 3),
          vy: -Math.random() * (50 + power * 3),
          life: 0.35 + Math.random() * 0.28,
          size: 2 + Math.random() * 3
        });
      }
      this.sparks = this.sparks.slice(-80);
    }

    updateSparks(dt) {
      this.chassisHitFlash = Math.max(0, this.chassisHitFlash - dt * 2.6);
      this.roofJunkBounce = Math.max(0, this.roofJunkBounce - dt * 1.8);
      for (const spark of this.sparks) {
        spark.life -= dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += GRAVITY * 0.45 * dt;
      }
      this.sparks = this.sparks.filter((spark) => spark.life > 0);
    }

    updateShockwaves(dt) {
      for (const wave of this.shockwaves) {
        wave.life -= dt;
        wave.radius += 360 * dt;
      }
      this.shockwaves = this.shockwaves.filter((wave) => wave.life > 0);
    }

    updateMeteors(dt) {
      this.meteorHitCooldown = Math.max(0, this.meteorHitCooldown - dt);
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.spawnMeteor();
        const pressure = clamp(this.distance / 5200, 0, 1);
        this.meteorTimer = METEOR_BASE_INTERVAL - pressure * (METEOR_BASE_INTERVAL - METEOR_MIN_INTERVAL) + Math.random() * 1.15;
      }

      const carY = this.vehicleCenterY || (this.roadY(this.distance) - 80);
      for (const meteor of this.meteors) {
        meteor.age += dt;
        meteor.x += meteor.vx * dt;
        meteor.y += meteor.vy * dt;
        meteor.vy += GRAVITY * 0.38 * dt;
        meteor.spin += meteor.spinSpeed * dt;

        const road = this.roadY(meteor.x) - 8;
        if (!meteor.hit && Math.abs(meteor.x - this.distance) < 78 && Math.abs(meteor.y - carY) < 112) {
          meteor.hit = true;
          this.handleMeteorVehicleHit(meteor);
        } else if (!meteor.hit && meteor.y >= road) {
          meteor.hit = true;
          this.emitSparks(meteor.x, road, 42);
        }
      }
      this.meteors = this.meteors.filter((meteor) => !meteor.hit && meteor.x > this.distance - 620 && meteor.x < this.distance + 1850 && meteor.y < this.roadY(meteor.x) + 260);
    }

    spawnMeteor() {
      const lead = 360 + Math.random() * 560;
      const targetX = this.distance + lead + (Math.random() - 0.5) * 420;
      const startX = targetX - 120 - Math.random() * 260;
      const startY = (this.cameraY || 0) - 160 - Math.random() * 100;
      const speed = 230 + Math.random() * 120 + clamp(this.distance / 1800, 0, 130);
      this.meteors.push({
        x: startX,
        y: startY,
        targetX,
        vx: 40 + Math.random() * 80,
        vy: speed,
        r: 16 + Math.random() * 8,
        age: 0,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.random() * 2.4),
        hit: false
      });
    }

    handleMeteorVehicleHit(meteor) {
      this.emitSparks(meteor.x, meteor.y, 72);
      this.roofJunkBounce = 1;
      this.chassisHitFlash = 1;
      this.pitchVelocity += (Math.random() > 0.5 ? 1 : -1) * 0.48;
      this.rollVelocity += (Math.random() > 0.5 ? 1 : -1) * 0.34;
      this.chairTiltVelocity += 0.38;
      this.riderTiltVelocity += 0.28;
      this.playSfx('meteor');
      if (this.dashTimer > 0) {
        this.showMessage('冲刺无敌！', 0.9);
        return;
      }
      if (this.meteorHitCooldown > 0) return;
      this.meteorHitCooldown = 0.9;
      this.chassisDamage = clamp(this.chassisDamage + METEOR_DAMAGE, 0, CAR_COMEDY_DAMAGE_MAX);
      if (this.lives <= 1) {
        this.lives = 0;
        this.playSfx('hurt');
        this.endRun('陨石砸中，三条命用完了');
      } else {
        this.lives -= 1;
        this.playSfx('hurt');
        this.lifeGraceTimer = Math.max(this.lifeGraceTimer, 0.8);
        this.showMessage(`陨石砸中！还剩 ${this.lives} 条命`, 1.2);
      }
    }

    updateLeakEffects(dt) {
      const damageLevel = this.chassisDamage / CAR_COMEDY_DAMAGE_MAX;
      this.leakTimer -= dt;
      this.fireTimer -= dt;
      const angle = this.airborne ? this.pitch : (this.groundPitch || this.pitch);

      if (damageLevel > 0.55 && this.leakTimer <= 0) {
        this.leakTimer = 0.11 - Math.min(0.07, (damageLevel - 0.55) * 0.18);
        const tail = this.localToWorld(-258, 86, angle);
        this.oilDrops.push({
          x: tail.x - Math.random() * 18,
          y: tail.y + Math.random() * 6,
          vx: -35 - Math.random() * 50 - Math.max(0, this.velocity) * 0.18,
          vy: -20 + Math.random() * 22,
          life: 1.9,
          size: 3 + Math.random() * 4,
          stuck: false
        });
      }

      if (damageLevel > 0.75 && this.fireTimer <= 0) {
        this.fireTimer = 0.045;
        const engine = this.localToWorld(246, 42, angle);
        this.fireParticles.push({
          x: engine.x + (Math.random() - 0.5) * 18,
          y: engine.y + (Math.random() - 0.5) * 10,
          vx: -45 - Math.random() * 80,
          vy: -80 - Math.random() * 90,
          life: 0.38 + Math.random() * 0.22,
          size: 10 + Math.random() * 10,
          smoke: Math.random() > 0.58
        });
      }

      for (const drop of this.oilDrops) {
        drop.life -= dt;
        if (!drop.stuck) {
          drop.x += drop.vx * dt;
          drop.y += drop.vy * dt;
          drop.vy += GRAVITY * 0.38 * dt;
          const road = this.roadY(drop.x) + 10;
          if (drop.y >= road) {
            drop.y = road;
            drop.vx = 0;
            drop.vy = 0;
            drop.stuck = true;
          }
        }
      }
      this.oilDrops = this.oilDrops.filter((drop) => drop.life > 0 && drop.x > this.distance - 700);

      for (const flame of this.fireParticles) {
        flame.life -= dt;
        flame.x += flame.vx * dt;
        flame.y += flame.vy * dt;
        flame.vy -= flame.smoke ? 8 * dt : 18 * dt;
        flame.vx *= Math.pow(0.72, dt);
      }
      this.fireParticles = this.fireParticles.filter((flame) => flame.life > 0 && flame.x > this.distance - 650);
    }

    endRun(reason) {
      if (this.state === 'failAnimation' || this.state === 'gameover') {
        return;
      }
      this.state = 'failAnimation';
      this.pendingFailReason = reason;
      this.failReason = reason;
      this.failAnimationTimer = 2.15;
      this.gasPressed = false;
      this.brakePressed = false;
      this.pointer = null;
      this.showMessage('平衡腚还得练', 2.1);
      if (this.distance > this.best) {
        this.best = this.distance;
        this.saveBest(this.best);
      }
      this.shareTitle = `我在山地平衡房车守住蹲姿 ${Math.floor(this.distance)} 米，你能更稳吗？`;
      if (this.wx && this.wx.vibrateShort) {
        this.wx.vibrateShort({ type: 'medium' });
      }
    }

    updateFailAnimation(dt) {
      this.failAnimationTimer -= dt;
      this.velocity *= Math.pow(0.72, dt * 5);
      this.distance += this.velocity * dt * 0.45;
      this.wheelSpin += this.velocity * dt / WHEEL_SCREEN_RADIUS;
      this.riderTilt += (this.riderTilt >= 0 ? 1 : -1) * dt * 0.9;
      this.riderFallDrop += (150 - this.riderFallDrop) * Math.min(1, dt * 4.2);
      this.chairTilt += (this.chairTilt >= 0 ? 1 : -1) * dt * 0.55;
      this.updateSparks(dt);
      this.updateCamera(dt);
      if (this.failAnimationTimer <= 0) {
        this.state = 'gameover';
        this.failReason = this.pendingFailReason || this.failReason;
      }
    }

    initAudio() {
      if (!this.soundEnabled || this.audio) return;
      const audioRoot = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
      const AudioContextClass = audioRoot.AudioContext || audioRoot.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        const ctx = new AudioContextClass();
        const master = ctx.createGain();
        const bgmGain = ctx.createGain();
        const engineGain = ctx.createGain();
        const dashGain = ctx.createGain();
        master.gain.value = 0.68;
        bgmGain.gain.value = 0;
        engineGain.gain.value = 0;
        dashGain.gain.value = 0;
        bgmGain.connect(master);
        engineGain.connect(master);
        dashGain.connect(master);
        master.connect(ctx.destination);

        const engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 72;
        engineOsc.connect(engineGain);
        engineOsc.start();

        const dashOsc = ctx.createOscillator();
        dashOsc.type = 'triangle';
        dashOsc.frequency.value = 420;
        dashOsc.connect(dashGain);
        dashOsc.start();

        this.audio = {
          ctx,
          master,
          bgmGain,
          engineGain,
          dashGain,
          engineOsc,
          dashOsc,
          bgmStep: 0,
          bgmNextTime: 0,
          duckUntil: 0,
          melody: [196, 247, 294, 330, 294, 247, 220, 247],
          bass: [82, 82, 98, 98, 73, 73, 110, 110]
        };
      } catch (error) {
        this.audio = null;
      }
    }

    ensureAudio() {
      if (!this.soundEnabled) return;
      this.initAudio();
      if (this.audio && this.audio.ctx.state === 'suspended') {
        this.audio.ctx.resume && this.audio.ctx.resume().catch(() => {});
      }
    }

    updateAudio() {
      const audio = this.audio;
      if (!audio || !this.soundEnabled) return;
      const nowTime = audio.ctx.currentTime;
      const isPlaying = this.state === 'playing';
      const isPaused = this.state === 'paused';
      const duck = nowTime < (audio.duckUntil || 0) ? 0.38 : 1;
      const baseBgm = (isPlaying ? 0.05 : isPaused ? 0 : 0.02) * duck;
      audio.bgmGain.gain.setTargetAtTime(baseBgm, nowTime, 0.12);

      const engineTarget = isPlaying && (this.gasPressed || this.brakePressed) ? 0.02 : 0.006;
      const engineFreq = this.brakePressed ? 58 : 78 + clamp(Math.abs(this.velocity) / 188, 0, 1) * 112 + (this.gasPressed ? 30 : 0);
      audio.engineGain.gain.setTargetAtTime(engineTarget, nowTime, 0.05);
      audio.engineOsc.frequency.setTargetAtTime(engineFreq, nowTime, 0.05);

      const dashTarget = isPlaying && this.dashTimer > 0 ? 0.06 : 0;
      audio.dashGain.gain.setTargetAtTime(dashTarget, nowTime, 0.06);
      audio.dashOsc.frequency.setTargetAtTime(420 + Math.sin(this.distance * 0.04) * 60, nowTime, 0.04);

      this.scheduleBgm();
    }

    scheduleBgm() {
      const audio = this.audio;
      if (!audio || !this.soundEnabled) return;
      const ctx = audio.ctx;
      if (audio.bgmNextTime < ctx.currentTime + 0.02) {
        audio.bgmNextTime = ctx.currentTime + 0.02;
      }
      while (audio.bgmNextTime < ctx.currentTime + 0.42) {
        const step = audio.bgmStep % audio.melody.length;
        this.playTone(audio.melody[step], audio.bgmNextTime, 0.08, 'square', 0.03, audio.bgmGain);
        if (step % 2 === 0) {
          this.playTone(audio.bass[step], audio.bgmNextTime, 0.15, 'triangle', 0.018, audio.bgmGain);
        }
        audio.bgmStep += 1;
        audio.bgmNextTime += 0.18;
      }
    }

    playTone(freq, startTime, duration, type, volume, destination) {
      const audio = this.audio;
      if (!audio) return;
      const ctx = audio.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(destination || audio.master);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    }

    playNoise(startTime, duration, volume) {
      const audio = this.audio;
      if (!audio) return;
      const ctx = audio.ctx;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      source.connect(gain);
      gain.connect(audio.master);
      source.start(startTime);
      source.stop(startTime + duration + 0.02);
    }

    playSfx(type) {
      if (!this.soundEnabled) return;
      this.ensureAudio();
      const audio = this.audio;
      if (!audio) return;
      const time = audio.ctx.currentTime;
      const last = this.lastSfxAt[type] || 0;
      const cooldowns = {
        coin: 0.07,
        tooth: 0.12,
        impact: 0.28,
        meteor: 0.38,
        button: 0.08,
        bomb: 0.7,
        hurt: 0.45
      };
      if (time - last < (cooldowns[type] || 0.04)) return;
      this.lastSfxAt[type] = time;

      if (type === 'coin') {
        this.playTone(880, time, 0.06, 'square', 0.07);
        this.playTone(1320, time + 0.04, 0.06, 'square', 0.045);
      } else if (type === 'tooth') {
        this.playTone(1046, time, 0.1, 'triangle', 0.08);
        this.playTone(1568, time + 0.06, 0.11, 'triangle', 0.06);
      } else if (type === 'dash') {
        this.playTone(330, time, 0.12, 'sawtooth', 0.09);
        this.playTone(660, time + 0.08, 0.16, 'sawtooth', 0.08);
        this.playTone(990, time + 0.18, 0.18, 'square', 0.055);
      } else if (type === 'bomb') {
        audio.duckUntil = Math.max(audio.duckUntil || 0, time + 0.38);
        this.playNoise(time, 0.42, 0.14);
        this.playTone(92, time, 0.42, 'sawtooth', 0.13);
        this.playTone(184, time + 0.05, 0.18, 'square', 0.07);
      } else if (type === 'meteor') {
        audio.duckUntil = Math.max(audio.duckUntil || 0, time + 0.32);
        this.playNoise(time, 0.22, 0.12);
        this.playTone(120, time, 0.18, 'sawtooth', 0.1);
      } else if (type === 'impact') {
        this.playNoise(time, 0.08, 0.035);
        this.playTone(180, time, 0.08, 'triangle', 0.032);
      } else if (type === 'hurt') {
        audio.duckUntil = Math.max(audio.duckUntil || 0, time + 0.45);
        this.playTone(392, time, 0.11, 'square', 0.16);
        this.playTone(196, time + 0.08, 0.18, 'sawtooth', 0.14);
      } else if (type === 'button') {
        this.playTone(620, time, 0.05, 'square', 0.035);
      } else if (type === 'coffee') {
        this.playTone(500, time, 0.08, 'triangle', 0.05);
        this.playTone(740, time + 0.04, 0.12, 'triangle', 0.045);
      }
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      if (this.soundEnabled) {
        this.ensureAudio();
        if (this.audio) {
          this.audio.master.gain.setTargetAtTime(0.72, this.audio.ctx.currentTime, 0.04);
        }
        this.showMessage('声音已开启', 0.9);
        this.playSfx('button');
      } else {
        if (this.audio) {
          const time = this.audio.ctx.currentTime;
          this.audio.master.gain.setTargetAtTime(0.0001, time, 0.04);
        }
        this.showMessage('声音已关闭', 0.9);
      }
    }

    useCoffee() {
      if (this.state !== 'playing' || this.coffeeCooldown > 0) {
        return;
      }
      this.coffeeTimer = 3.2;
      this.coffeeCooldown = 8.5;
      this.riderVelocityX *= 0.32;
      this.riderVelocityY *= 0.32;
      this.chairTiltVelocity *= 0.28;
      this.riderTiltVelocity *= 0.28;
      this.fallMeter = Math.max(0, this.fallMeter - 0.18);
      this.showMessage('咖啡压住椅子晃动！', 1.2);
      this.playSfx('coffee');
      if (this.wx && this.wx.vibrateShort) {
        this.wx.vibrateShort({ type: 'light' });
      }
    }

    shareGame() {
      this.shareTitle = `我在山地平衡房车守住蹲姿 ${Math.floor(this.distance)} 米，你能更稳吗？`;
      if (this.wx && this.wx.shareAppMessage) {
        this.wx.shareAppMessage({ title: this.shareTitle });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.shareTitle).then(() => {
          this.showMessage('分享文案已复制', 1.2);
        }).catch(() => {
          this.showMessage(this.shareTitle, 1.6);
        });
      } else {
        this.showMessage(this.shareTitle, 1.6);
      }
    }

    bindEvents() {
      const start = (event) => {
        const point = this.eventPoint(event);
        if (!point) return;
        this.handlePointerStart(point.x, point.y);
        prevent(event);
      };
      const move = (event) => {
        const point = this.eventPoint(event);
        if (!point) return;
        this.handlePointerMove(point.x, point.y);
        prevent(event);
      };
      const end = (event) => {
        this.handlePointerEnd();
        prevent(event);
      };

      if (this.canvas.addEventListener) {
        this.canvas.addEventListener('pointerdown', start);
        this.canvas.addEventListener('pointermove', move);
        this.canvas.addEventListener('pointerup', end);
        this.canvas.addEventListener('pointercancel', end);
        window.addEventListener && window.addEventListener('resize', () => this.resize());
        window.addEventListener && window.addEventListener('deviceorientation', (event) => {
          if (typeof event.gamma === 'number') {
            this.sensorLean = clamp(event.gamma / 32, -0.7, 0.7);
          }
        });
      } else if (this.wx) {
        this.wx.onTouchStart(start);
        this.wx.onTouchMove(move);
        this.wx.onTouchEnd(end);
        this.wx.onTouchCancel(end);
        this.wx.onShow && this.wx.onShow(() => this.resize());
        if (this.wx.startAccelerometer && this.wx.onAccelerometerChange) {
          this.wx.startAccelerometer({ interval: 'game' });
          this.wx.onAccelerometerChange((res) => {
            this.sensorLean = clamp((res.x || 0) * 1.45, -0.85, 0.85);
          });
        }
      }
    }

    handlePointerStart(x, y) {
      this.ensureAudio();
      if (this.state === 'start') {
        this.playSfx('button');
        this.startRun();
        return;
      }
      if (this.state === 'paused') {
        if (this.hit(this.buttons.sound, x, y)) {
          this.toggleSound();
          return;
        }
        if (this.hit(this.buttons.resume, x, y)) {
          this.state = 'playing';
          this.playSfx('button');
          this.showMessage('继续守住平衡腚', 0.9);
          return;
        }
        if (this.hit(this.buttons.restart, x, y)) {
          this.playSfx('button');
          this.startRun();
          return;
        }
        if (this.hit(this.buttons.share, x, y)) {
          this.playSfx('button');
          this.shareGame();
          return;
        }
        return;
      }
      if (this.state === 'gameover') {
        if (this.hit(this.buttons.share, x, y)) {
          this.playSfx('button');
          this.shareGame();
          return;
        }
        if (this.hit(this.buttons.retry, x, y)) {
          this.playSfx('button');
          this.startRun();
        }
        return;
      }
      if (this.state !== 'playing') {
        return;
      }
      if (this.hit(this.buttons.sound, x, y)) {
        this.toggleSound();
        return;
      }
      if (this.hit(this.buttons.pause, x, y)) {
        this.state = 'paused';
        this.gasPressed = false;
        this.brakePressed = false;
        this.pointer = null;
        this.playSfx('button');
        return;
      }
      if (this.hit(this.buttons.restart, x, y)) {
        this.playSfx('button');
        this.startRun();
        return;
      }
      if (this.hit(this.buttons.share, x, y)) {
        this.playSfx('button');
        this.shareGame();
        return;
      }
      if (this.hit(this.buttons.coffee, x, y)) {
        this.useCoffee();
        return;
      }
      if (this.hit(this.buttons.gas, x, y)) {
        this.gasPressed = true;
        this.pointer = { mode: 'gas' };
        return;
      }
      if (this.hit(this.buttons.brake, x, y)) {
        this.brakePressed = true;
        this.pointer = { mode: 'brake' };
        return;
      }
      if (this.hit(this.buttons.weight, x, y) || x > LOGICAL_WIDTH * 0.62) {
        this.pointer = { mode: 'weight' };
        this.handlePointerMove(x, y);
        return;
      }
      this.pointer = { mode: 'lean' };
      this.handlePointerMove(x, y);
    }

    handlePointerMove(x, y) {
      if (!this.pointer || this.state !== 'playing') {
        return;
      }
      if (this.pointer.mode === 'weight') {
        const rect = this.buttons.weightTrack || { x: 656, y: 438, w: 244, h: 18 };
        this.weightTarget = clamp(((x - rect.x) / rect.w) * 2 - 1, -1, 1);
      } else {
        const center = 198;
        this.touchLean = clamp((x - center) / 145, -1, 1);
      }
    }

    handlePointerEnd() {
      if (this.pointer && this.pointer.mode === 'lean') {
        this.touchLean = 0;
      }
      if (this.pointer && this.pointer.mode === 'gas') {
        this.gasPressed = false;
      }
      if (this.pointer && this.pointer.mode === 'brake') {
        this.brakePressed = false;
      }
      this.pointer = null;
    }

    eventPoint(event) {
      const raw = event.touches && event.touches[0] ? event.touches[0] : event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : event;
      const clientX = raw.clientX == null ? raw.x : raw.clientX;
      const clientY = raw.clientY == null ? raw.y : raw.clientY;
      const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0, width: this.canvas.width / this.dpr, height: this.canvas.height / this.dpr };
      return {
        x: (clientX - rect.left - this.offsetX) / this.scale,
        y: (clientY - rect.top - this.offsetY) / this.scale
      };
    }

    resize() {
      let width = LOGICAL_WIDTH;
      let height = LOGICAL_HEIGHT;
      if (this.platform === 'wechat' && this.wx && this.wx.getSystemInfoSync) {
        const info = this.wx.getSystemInfoSync();
        width = info.windowWidth;
        height = info.windowHeight;
        this.dpr = info.pixelRatio || 1;
      } else if (typeof window !== 'undefined') {
        width = window.innerWidth;
        height = window.innerHeight;
        this.dpr = window.devicePixelRatio || 1;
      }

      this.canvas.width = Math.floor(width * this.dpr);
      this.canvas.height = Math.floor(height * this.dpr);
      if (this.canvas.style) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
      this.scale = Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
      this.offsetX = (width - LOGICAL_WIDTH * this.scale) / 2;
      this.offsetY = (height - LOGICAL_HEIGHT * this.scale) / 2;
      this.ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offsetX, this.dpr * this.offsetY);
    }

    render() {
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#0e1318';
      ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
      ctx.restore();

      ctx.save();
      ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offsetX, this.dpr * this.offsetY);
      if (this.chassisHitFlash > 0 && this.state !== 'paused') {
        const hitShake = this.chassisHitFlash * 2.5;
        ctx.translate(Math.sin(this.distance * 0.7) * hitShake, Math.cos(this.distance * 0.6) * hitShake);
      }
      if (this.dashTimer > 0) {
        const shake = Math.sin((DASH_DURATION - this.dashTimer) * 90) * 3.5;
        ctx.translate(shake, Math.cos((DASH_DURATION - this.dashTimer) * 72) * 2.2);
      }
      this.drawWorld(ctx);
      this.drawOilDrops(ctx);
      this.drawMeteors(ctx);
      this.drawDashEffects(ctx);
      this.drawRv(ctx);
      this.drawVehicleWheels(ctx);
      this.drawShockwaves(ctx);
      this.drawSparks(ctx);
      this.drawFireParticles(ctx);
      this.drawHud(ctx);
      if (this.state === 'start') {
        this.drawStart(ctx);
      } else if (this.state === 'paused') {
        this.drawPauseMenu(ctx);
      } else if (this.state === 'failAnimation') {
        this.drawFailAnimation(ctx);
      } else if (this.state === 'gameover') {
        this.drawGameOver(ctx);
      }
      ctx.restore();
    }

    drawWorld(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      sky.addColorStop(0, '#d8f0ff');
      sky.addColorStop(0.5, '#fff1ce');
      sky.addColorStop(1, '#c4d6c2');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      this.drawMountains(ctx, 0.18, '#8ea7a1', 190);
      this.drawMountains(ctx, 0.36, '#647f76', 250);

      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      for (let i = 0; i < 5; i += 1) {
        const x = mod(120 + i * 230 - this.distance * 0.12, LOGICAL_WIDTH + 180) - 90;
        ctx.beginPath();
        ctx.ellipse(x, 78 + i * 12, 44, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 34, 74 + i * 12, 34, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawSpaceBackground(ctx);

      ctx.fillStyle = '#2f4736';
      ctx.beginPath();
      ctx.moveTo(0, LOGICAL_HEIGHT);
      for (let x = 0; x <= LOGICAL_WIDTH + 12; x += 12) {
        const worldX = this.worldXForScreen(x);
        if (this.isBridgeGap(worldX)) {
          ctx.lineTo(x, LOGICAL_HEIGHT);
        } else {
          ctx.lineTo(x, this.screenYForWorld(this.roadY(worldX) + 34));
        }
      }
      ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#a0744a';
      ctx.lineWidth = 34;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let roadStarted = false;
      for (let x = 0; x <= LOGICAL_WIDTH + 12; x += 12) {
        const worldX = this.worldXForScreen(x);
        if (this.isBridgeGap(worldX)) {
          roadStarted = false;
          continue;
        }
        const y = this.screenYForWorld(this.roadY(worldX) + 16);
        if (!roadStarted) {
          ctx.moveTo(x, y);
          roadStarted = true;
        }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#5c4531';
      ctx.lineWidth = 4;
      ctx.beginPath();
      roadStarted = false;
      for (let x = 0; x <= LOGICAL_WIDTH + 12; x += 12) {
        const worldX = this.worldXForScreen(x);
        if (this.isBridgeGap(worldX)) {
          roadStarted = false;
          continue;
        }
        const y = this.screenYForWorld(this.roadY(worldX) + 1);
        if (!roadStarted) {
          ctx.moveTo(x, y);
          roadStarted = true;
        }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this.drawRopeBridges(ctx);
      this.drawSkyRewards(ctx);
      this.drawCoins(ctx);
      this.drawTeeth(ctx);
      this.drawSkills(ctx);
      this.drawBombs(ctx);

      const rearWorldX = this.distance - WHEEL_BASE * 0.5;
      const frontWorldX = this.distance + WHEEL_BASE * 0.5;
      const leftWheelX = this.screenXForWorld(rearWorldX);
      const rightWheelX = this.screenXForWorld(frontWorldX);
      const leftWheelY = this.screenYForWorld(this.roadY(rearWorldX));
      const rightWheelY = this.screenYForWorld(this.roadY(frontWorldX));
      const shadowW = WHEEL_SCREEN_RADIUS * 1.55;
      const shadowH = Math.max(3, WHEEL_SCREEN_RADIUS * 0.34);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(leftWheelX, leftWheelY + shadowH, shadowW, shadowH, -0.08, 0, Math.PI * 2);
      ctx.ellipse(rightWheelX, rightWheelY + shadowH, shadowW, shadowH, 0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(leftWheelX, leftWheelY - shadowH * 0.25, shadowW * 0.78, shadowH * 0.5, -0.06, 0, Math.PI * 2);
      ctx.ellipse(rightWheelX, rightWheelY - shadowH * 0.25, shadowW * 0.78, shadowH * 0.5, 0.03, 0, Math.PI * 2);
      ctx.fill();
    }

    drawSpaceBackground(ctx) {
      const spaceAlpha = clamp((-(this.cameraY || 0) - 520) / 1400, 0, 1);
      if (spaceAlpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = spaceAlpha;
      const space = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      space.addColorStop(0, '#02040c');
      space.addColorStop(0.58, '#071024');
      space.addColorStop(1, '#111318');
      ctx.fillStyle = space;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      for (let i = 0; i < 88; i += 1) {
        const x = mod(i * 113 + 37 - this.distance * 0.018, LOGICAL_WIDTH);
        const y = mod(i * 71 + 19 + (this.cameraY || 0) * 0.025, LOGICAL_HEIGHT);
        const twinkle = 0.48 + Math.sin(i * 2.1 + this.distance * 0.02) * 0.28;
        ctx.globalAlpha = spaceAlpha * twinkle;
        ctx.fillStyle = i % 7 === 0 ? '#ffe7a8' : '#f5fbff';
        ctx.beginPath();
        ctx.arc(x, y, i % 9 === 0 ? 2.2 : 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = spaceAlpha;
      const sunX = 790 - this.distance * 0.006;
      const sunY = 92 + (this.cameraY || 0) * 0.015;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 96);
      sunGlow.addColorStop(0, 'rgba(255,238,154,1)');
      sunGlow.addColorStop(0.35, 'rgba(255,180,74,0.56)');
      sunGlow.addColorStop(1, 'rgba(255,130,52,0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 96, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe27c';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawRopeBridges(ctx) {
      const firstCycle = Math.floor(this.worldXForScreen(-400) / 1500) * 1500;
      const lastCycle = this.worldXForScreen(LOGICAL_WIDTH + 900);
      ctx.save();
      for (let base = firstCycle; base < lastCycle; base += 1500) {
        this.drawRopeBridgeSpan(ctx, base + 660, base + 1180);
        this.drawRopeBridgeSpan(ctx, base + 1220, base + 1370);
      }
      ctx.restore();
    }

    drawRopeBridgeSpan(ctx, start, end) {
      const screenStart = this.screenXForWorld(start);
      const screenEnd = this.screenXForWorld(end);
      if (screenEnd < -120 || screenStart > LOGICAL_WIDTH + 120) {
        return;
      }

      ctx.strokeStyle = '#5d3e2b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      for (let x = start; x <= end; x += 18) {
        const sx = this.screenXForWorld(x);
        const y = this.screenYForWorld(this.roadY(x) - 30 + Math.sin(x * 0.05) * 4);
        if (x === start) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#8a5d35';
      ctx.lineWidth = 3;
      for (let x = start; x <= end; x += 28) {
        const sx = this.screenXForWorld(x);
        const y = this.screenYForWorld(this.roadY(x) - 9);
        ctx.beginPath();
        ctx.moveTo(sx - 10, y - 8);
        ctx.lineTo(sx + 10, y + 8);
        ctx.stroke();
      }

      ctx.strokeStyle = '#4b2f1d';
      ctx.lineWidth = 7;
      ctx.beginPath();
      for (let x = start; x <= end; x += 18) {
        const sx = this.screenXForWorld(x);
        const y = this.screenYForWorld(this.roadY(x) + 8 + Math.sin(x * 0.07) * 3);
        if (x === start) ctx.moveTo(sx, y);
        else ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    drawCoins(ctx) {
      ctx.save();
      for (const coin of this.coins) {
        if (coin.collected) continue;
        const x = this.screenXForWorld(coin.x);
        if (x < -40 || x > LOGICAL_WIDTH + 40) continue;
        const y = this.screenYForWorld(coin.y);
        const spin = 0.65 + Math.abs(Math.sin(this.distance * 0.05 + coin.key)) * 0.35;
        ctx.fillStyle = '#f4c542';
        ctx.beginPath();
        ctx.ellipse(x, y, coin.r * spin, coin.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#9d6b12';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#8b5b0e';
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('¥', x, y + 4);
      }
      ctx.restore();
    }

    drawBombs(ctx) {
      if (!this.bombs.length) return;
      ctx.save();
      for (const bomb of this.bombs) {
        if (bomb.triggered) continue;
        const x = this.screenXForWorld(bomb.x);
        const y = this.screenYForWorld(bomb.y);
        if (x < -90 || x > LOGICAL_WIDTH + 90 || y < -130 || y > LOGICAL_HEIGHT + 130) continue;
        this.drawBacteriaBomb(ctx, x, y, BOMB_DRAW_SCALE + Math.sin(this.distance * 0.025 + bomb.key) * 0.018, bomb.spin);
      }
      ctx.restore();
    }

    drawBacteriaBomb(ctx, x, y, size, spin) {
      const turn = Math.cos(spin);
      const squash = 0.58 + Math.abs(turn) * 0.42;
      const shineSide = turn >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(x, y);
      if (this.bombReady && this.bombImage) {
        const iw = this.bombImage.naturalWidth || this.bombImage.width;
        const ih = this.bombImage.naturalHeight || this.bombImage.height;
        const drawH = 124 * size;
        const drawW = drawH * (iw / ih) * squash;
        ctx.globalAlpha = 0.94 + Math.abs(turn) * 0.06;
        ctx.drawImage(this.bombImage, -drawW / 2, -drawH * 0.88, drawW, drawH);
        ctx.globalAlpha = 1;
        ctx.restore();
        return;
      }
      ctx.scale(size * squash, size);

      const bodyGradient = ctx.createLinearGradient(0, -56, 0, 54);
      bodyGradient.addColorStop(0, '#b9d45b');
      bodyGradient.addColorStop(0.62, '#8fb342');
      bodyGradient.addColorStop(1, '#5d7626');
      ctx.fillStyle = bodyGradient;
      ctx.strokeStyle = '#243016';
      ctx.lineWidth = 4 / Math.max(0.65, squash);
      ctx.beginPath();
      ctx.ellipse(0, 28, 72, 48, 0, Math.PI, 0);
      ctx.lineTo(72, 30);
      ctx.bezierCurveTo(58, 68, -58, 68, -72, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.52;
      ctx.fillStyle = '#e8f5a3';
      ctx.beginPath();
      ctx.ellipse(shineSide * 30, 6, 18, 8, -0.45, 0, Math.PI * 2);
      ctx.ellipse(shineSide * -34, -3, 6, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#253016';
      ctx.lineWidth = 2.5 / Math.max(0.65, squash);
      ctx.font = '800 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('变异链球菌', 0, 29);
      ctx.fillText('变异链球菌', 0, 29);

      ctx.fillStyle = '#ffd1b3';
      ctx.strokeStyle = '#2b1d18';
      ctx.lineWidth = 3 / Math.max(0.65, squash);
      ctx.beginPath();
      ctx.ellipse(0, -54, 42, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1d2026';
      ctx.beginPath();
      ctx.moveTo(-42, -70);
      for (let i = 0; i <= 8; i += 1) {
        const px = -42 + i * 10.5;
        const py = -76 + Math.sin(i * 1.7 + spin) * 6;
        ctx.lineTo(px, py);
        ctx.lineTo(px + 4, -48 + Math.sin(i + spin) * 4);
      }
      ctx.lineTo(42, -56);
      ctx.quadraticCurveTo(0, -90, -42, -70);
      ctx.fill();

      ctx.strokeStyle = '#2b1d18';
      ctx.lineWidth = 2.3 / Math.max(0.65, squash);
      ctx.beginPath();
      ctx.ellipse(-17, -55, 14, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(18, -55, 14, 7, 0, 0, Math.PI * 2);
      ctx.moveTo(-3, -55);
      ctx.lineTo(4, -55);
      ctx.stroke();

      ctx.fillStyle = '#2b1d18';
      ctx.beginPath();
      ctx.ellipse(-16, -55, 3.5, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(20, -55, 3.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2b1d18';
      ctx.lineWidth = 2.7 / Math.max(0.65, squash);
      ctx.beginPath();
      ctx.moveTo(-28, -70);
      ctx.lineTo(-6, -64);
      ctx.moveTo(8, -64);
      ctx.lineTo(31, -70);
      ctx.stroke();

      ctx.strokeStyle = '#7b2e25';
      ctx.lineWidth = 2.5 / Math.max(0.65, squash);
      ctx.beginPath();
      ctx.moveTo(-18, -36);
      ctx.quadraticCurveTo(0, -24, 23, -38);
      ctx.stroke();

      ctx.restore();
    }

    drawTeeth(ctx) {
      ctx.save();
      for (const tooth of this.teeth) {
        if (tooth.collected) continue;
        const x = this.screenXForWorld(tooth.x);
        if (x < -50 || x > LOGICAL_WIDTH + 50) continue;
        const glow = 0.55 + Math.sin(this.distance * 0.045 + tooth.key) * 0.18;
        const bob = Math.sin(this.distance * 0.035 + tooth.key * 1.7) * 5;
        ctx.globalAlpha = 0.22 + glow * 0.18;
        ctx.fillStyle = '#aee7ff';
        ctx.beginPath();
        const y = this.screenYForWorld(tooth.y + bob);
        ctx.ellipse(x, y, tooth.r * 1.45, tooth.r * 1.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        this.drawTooth(ctx, x, y, tooth.r, Math.sin(this.distance * 0.02 + tooth.key) * 0.18);
      }
      ctx.restore();
    }

    drawSkills(ctx) {
      ctx.save();
      for (const skill of this.skills) {
        if (skill.collected) continue;
        const x = this.screenXForWorld(skill.x);
        const y = this.screenYForWorld(skill.y);
        if (x < -50 || x > LOGICAL_WIDTH + 50) continue;
        const pulse = 0.65 + Math.abs(Math.sin(this.distance * 0.06 + skill.key)) * 0.35;
        ctx.globalAlpha = 0.26 + pulse * 0.22;
        ctx.fillStyle = '#72d6ff';
        ctx.beginPath();
        ctx.arc(x, y, 30 + pulse * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#e8fbff';
        ctx.strokeStyle = '#178bd8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(x, y, 23, 17, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#178bd8';
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 18);
        ctx.lineTo(x - 10, y + 2);
        ctx.lineTo(x + 2, y + 2);
        ctx.lineTo(x - 4, y + 20);
        ctx.lineTo(x + 14, y - 4);
        ctx.lineTo(x + 2, y - 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawSkyRewards(ctx) {
      if (!this.skyRewards.length) return;
      ctx.save();
      for (const item of this.skyRewards) {
        if (item.collected) continue;
        const x = this.screenXForWorld(item.x);
        const y = this.screenYForWorld(item.y);
        if (x < -80 || x > LOGICAL_WIDTH + 80) continue;
        if (item.type === 'cloud') {
          ctx.fillStyle = 'rgba(255,255,255,0.76)';
          ctx.beginPath();
          ctx.ellipse(x, y, 42, 14, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 28, y - 4, 34, 12, 0, 0, Math.PI * 2);
          ctx.ellipse(x - 24, y + 2, 28, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'tooth') {
          this.drawTooth(ctx, x, y, 17, Math.sin(this.distance * 0.03 + item.key) * 0.2);
        } else {
          ctx.fillStyle = '#f4c542';
          ctx.beginPath();
          ctx.ellipse(x, y, 12, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9d6b12';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawMeteors(ctx) {
      if (!this.meteors.length) return;
      ctx.save();
      for (const meteor of this.meteors) {
        const targetX = this.screenXForWorld(meteor.targetX);
        const targetY = this.screenYForWorld(this.roadY(meteor.targetX) + 7);
        if (targetX > -80 && targetX < LOGICAL_WIDTH + 80) {
          const pulse = 0.45 + Math.sin(meteor.age * 10) * 0.18;
          ctx.globalAlpha = 0.22 + pulse * 0.18;
          ctx.fillStyle = '#d74f61';
          ctx.beginPath();
          ctx.ellipse(targetX, targetY, 34 + pulse * 10, 9 + pulse * 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        const x = this.screenXForWorld(meteor.x);
        const y = this.screenYForWorld(meteor.y);
        if (x < -120 || x > LOGICAL_WIDTH + 120 || y > LOGICAL_HEIGHT + 160) continue;
        ctx.strokeStyle = 'rgba(255,116,61,0.58)';
        ctx.lineWidth = meteor.r * 0.72;
        ctx.beginPath();
        ctx.moveTo(x - meteor.vx * 0.16, y - meteor.vy * 0.12);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(meteor.spin);
        ctx.fillStyle = '#5b332c';
        ctx.strokeStyle = '#ff743d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-meteor.r, -meteor.r * 0.35);
        ctx.lineTo(-meteor.r * 0.28, -meteor.r);
        ctx.lineTo(meteor.r * 0.9, -meteor.r * 0.42);
        ctx.lineTo(meteor.r * 0.76, meteor.r * 0.62);
        ctx.lineTo(-meteor.r * 0.44, meteor.r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,210,90,0.65)';
        ctx.beginPath();
        ctx.ellipse(meteor.r * 0.18, -meteor.r * 0.2, meteor.r * 0.32, meteor.r * 0.18, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawOilDrops(ctx) {
      if (!this.oilDrops.length) return;
      ctx.save();
      for (const drop of this.oilDrops) {
        const x = this.screenXForWorld(drop.x);
        const y = this.screenYForWorld(drop.y);
        if (x < -80 || x > LOGICAL_WIDTH + 80 || y < -80 || y > LOGICAL_HEIGHT + 120) continue;
        ctx.globalAlpha = clamp(drop.life / 1.6, 0, 0.68);
        ctx.fillStyle = '#111318';
        ctx.beginPath();
        ctx.ellipse(x, y, drop.stuck ? drop.size * 2.4 : drop.size, drop.stuck ? drop.size * 0.9 : drop.size * 1.35, drop.stuck ? 0 : -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawFireParticles(ctx) {
      if (!this.fireParticles.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const flame of this.fireParticles) {
        const x = this.screenXForWorld(flame.x);
        const y = this.screenYForWorld(flame.y);
        if (x < -100 || x > LOGICAL_WIDTH + 100 || y < -120 || y > LOGICAL_HEIGHT + 120) continue;
        const alpha = clamp(flame.life / 0.42, 0, 1);
        ctx.globalAlpha = flame.smoke ? alpha * 0.3 : alpha * 0.82;
        ctx.fillStyle = flame.smoke ? '#1d252c' : (Math.random() > 0.45 ? '#ff743d' : '#ffd25a');
        ctx.beginPath();
        ctx.ellipse(x, y, flame.size * (flame.smoke ? 1.2 : 0.72), flame.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawTooth(ctx, x, y, size, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = '#fffdf4';
      ctx.strokeStyle = '#87aab6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-size * 0.72, -size * 0.5);
      ctx.bezierCurveTo(-size * 1.05, -size * 1.05, -size * 0.35, -size * 1.32, 0, -size * 0.82);
      ctx.bezierCurveTo(size * 0.35, -size * 1.32, size * 1.05, -size * 1.05, size * 0.72, -size * 0.5);
      ctx.bezierCurveTo(size * 0.92, size * 0.2, size * 0.42, size * 1.1, size * 0.14, size * 0.86);
      ctx.bezierCurveTo(0, size * 0.72, -size * 0.04, size * 0.12, -size * 0.18, size * 0.86);
      ctx.bezierCurveTo(-size * 0.48, size * 1.12, -size * 0.92, size * 0.2, -size * 0.72, -size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(132,185,204,0.22)';
      ctx.beginPath();
      ctx.ellipse(-size * 0.25, -size * 0.42, size * 0.22, size * 0.12, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawMountains(ctx, speed, color, baseY) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, LOGICAL_HEIGHT);
      for (let x = -80; x <= LOGICAL_WIDTH + 100; x += 80) {
        const px = x - mod(this.distance * speed, 160);
        ctx.lineTo(px, baseY + Math.sin((x + this.distance * 0.04) * 0.014) * 24);
        ctx.lineTo(px + 80, baseY - 70 - Math.sin(x * 0.02) * 30);
      }
      ctx.lineTo(LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    drawDashEffects(ctx) {
      if (this.dashTimer <= 0) return;
      const progress = 1 - this.dashTimer / DASH_DURATION;
      const x = this.vehicleScreenX || VEHICLE_X;
      const y = this.screenYForWorld(this.vehicleCenterY || (this.roadY(this.distance) - 120));
      const pulse = 0.72 + Math.sin(progress * Math.PI * 14) * 0.24;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(x + 22, y, 24, x + 22, y, 240);
      glow.addColorStop(0, `rgba(118,220,255,${0.5 + pulse * 0.24})`);
      glow.addColorStop(0.48, 'rgba(86,154,255,0.34)');
      glow.addColorStop(1, 'rgba(86,154,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(x + 20, y, 270, 116, -0.04, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(220,250,255,0.88)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 28; i += 1) {
        const lane = i - 13.5;
        const startX = x - 80 - i * 28 + mod(this.distance * 3.8 + i * 23, 88);
        const yy = y + lane * 13 + Math.sin(progress * 14 + i) * 6;
        ctx.globalAlpha = 0.34 + (i % 4) * 0.1;
        ctx.beginPath();
        ctx.moveTo(startX - 190, yy);
        ctx.lineTo(startX + 42, yy - 4);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(87,215,255,0.55)';
      for (let i = 0; i < 8; i += 1) {
        ctx.globalAlpha = 0.18 + i * 0.045;
        ctx.beginPath();
        ctx.ellipse(x - 95 - i * 28, y + Math.sin(progress * 16 + i) * 18, 72 - i * 4, 14 + i, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = '#7ee5ff';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 2, 150 + pulse * 18, 54 + pulse * 12, -0.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawRv(ctx) {
      const vehicleX = this.vehicleScreenX || VEHICLE_X;
      const centerY = this.screenYForWorld(this.vehicleCenterY || (this.roadY(this.distance) - CAR_SCALE * (WHEEL_LOCAL_Y + WHEEL_RADIUS)));
      const visualPitch = this.airborne ? this.pitch : (this.groundPitch || 0);

      ctx.save();
      ctx.translate(vehicleX, centerY);
      ctx.rotate(visualPitch);
      ctx.scale(CAR_SCALE, CAR_SCALE);

      const rollOffset = this.roll * 18;

      ctx.fillStyle = '#f6f6eb';
      ctx.strokeStyle = '#143ec5';
      ctx.lineWidth = 4;
      this.drawRvBodyShell(ctx, rollOffset);
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fill();
      ctx.restore();
      ctx.stroke();

      ctx.fillStyle = 'rgba(220, 235, 246, 0.28)';
      roundRect(ctx, -230, -170 + rollOffset * 0.22, 284, 232, 16);
      ctx.fill();
      ctx.strokeStyle = '#1b2b3a';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = this.bodyFloorContact > 0 ? 'rgba(215,79,97,0.22)' : 'rgba(42,54,62,0.18)';
      roundRect(ctx, -224, CABIN_FLOOR_Y - 4 + rollOffset * 0.18, 272, 18, 5);
      ctx.fill();
      this.drawChassisDamage(ctx, rollOffset);

      this.drawRider(ctx, RIDER_BASE_X + this.riderLongSlip * 18, RIDER_BASE_Y + rollOffset * 0.25 + this.riderSideSlip * 12 + this.riderFallDrop);

      ctx.fillStyle = '#82c5db';
      roundRect(ctx, 82, -146 + rollOffset * 0.1, 148, 108, 12);
      ctx.fill();
      ctx.fillStyle = '#26313a';
      ctx.fillRect(104, -116 + rollOffset * 0.1, 82, 8);
      ctx.fillRect(104, -88 + rollOffset * 0.1, 96, 8);

      ctx.strokeStyle = '#143ec5';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-230, -170 + rollOffset * 0.22);
      ctx.lineTo(-230, 60 + rollOffset * 0.22);
      ctx.moveTo(54, -170 + rollOffset * 0.22);
      ctx.lineTo(54, 60 + rollOffset * 0.22);
      ctx.moveTo(-230, 60 + rollOffset * 0.22);
      ctx.lineTo(54, 60 + rollOffset * 0.22);
      ctx.stroke();

      ctx.strokeStyle = '#143ec5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(194, -212);
      ctx.lineTo(194, -190);
      ctx.moveTo(226, -214);
      ctx.lineTo(226, -190);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(160, -224, 30, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(222, -228, 34, 14, -0.12, 0, Math.PI * 2);
      ctx.stroke();

      this.drawRoofSign(ctx, rollOffset);

      ctx.restore();
    }

    drawRvBodyShell(ctx, rollOffset) {
      const top = -188 + rollOffset * 0.2;
      const bottom = 112;
      const noseTop = -150 + rollOffset * 0.08;
      const noseTip = -42 + rollOffset * 0.04;
      ctx.beginPath();
      ctx.moveTo(-258, top);
      ctx.quadraticCurveTo(-280, top, -280, top + 22);
      ctx.lineTo(-280, bottom - 22);
      ctx.quadraticCurveTo(-280, bottom, -258, bottom);
      ctx.lineTo(218, bottom);
      ctx.lineTo(286, 56 + rollOffset * 0.08);
      ctx.lineTo(268, noseTip);
      ctx.lineTo(218, noseTop);
      ctx.lineTo(210, top);
      ctx.closePath();
    }

    drawRoofSign(ctx, rollOffset) {
      const damageLevel = clamp(this.chassisDamage / CAR_COMEDY_DAMAGE_MAX, 0, 1);
      const damageTilt = damageLevel * 0.14;
      const wobble = Math.sin(this.distance * 0.12) * 0.035 + this.roofJunkBounce * 0.08;
      const fallen = damageLevel > 0.68;
      ctx.save();
      ctx.translate(fallen ? -172 + Math.sin(this.distance * 0.09) * 10 : -26, fallen ? -204 + rollOffset * 0.08 + damageLevel * 72 : -294 + rollOffset * 0.08);
      ctx.rotate(fallen ? -0.78 + wobble * 2.4 : wobble - damageTilt);
      ctx.strokeStyle = '#3d4852';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-108, 48);
      ctx.lineTo(-108, fallen ? 30 : 16);
      ctx.moveTo(108, 48);
      ctx.lineTo(108, fallen ? 34 : 16);
      ctx.stroke();
      if (fallen) {
        ctx.strokeStyle = '#5d3e2b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(126, -10);
        ctx.quadraticCurveTo(156, 18 + Math.sin(this.distance * 0.18) * 12, 128, 54);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff8dc';
      ctx.strokeStyle = '#143ec5';
      ctx.lineWidth = 5;
      roundRect(ctx, -178, -30, 356, 66, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#26313a';
      ctx.font = '800 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('口腔医学', 0, 4);
      ctx.restore();
    }

    drawVehicleWheels(ctx) {
      const rearWorldX = this.distance - WHEEL_BASE * 0.5;
      const frontWorldX = this.distance + WHEEL_BASE * 0.5;
      if (this.airborne) {
        const angle = this.pitch;
        const rear = this.localToWorld(-WHEEL_LOCAL_X, WHEEL_LOCAL_Y, angle);
        const front = this.localToWorld(WHEEL_LOCAL_X, WHEEL_LOCAL_Y, angle);
        this.drawWheel(ctx, this.screenXForWorld(rear.x), this.screenYForWorld(rear.y), this.wheelSpin, WHEEL_SCREEN_RADIUS);
        this.drawWheel(ctx, this.screenXForWorld(front.x), this.screenYForWorld(front.y), this.wheelSpin, WHEEL_SCREEN_RADIUS);
        return;
      }
      this.drawWheel(ctx, this.screenXForWorld(rearWorldX), this.screenYForWorld(this.roadY(rearWorldX) - WHEEL_SCREEN_RADIUS), this.wheelSpin, WHEEL_SCREEN_RADIUS);
      this.drawWheel(ctx, this.screenXForWorld(frontWorldX), this.screenYForWorld(this.roadY(frontWorldX) - WHEEL_SCREEN_RADIUS), this.wheelSpin, WHEEL_SCREEN_RADIUS);
    }

    drawChassisDamage(ctx, rollOffset) {
      if (this.chassisDamage <= 1) return;
      ctx.save();
      const damage = this.chassisDamage;
      const level = clamp(damage / CAR_COMEDY_DAMAGE_MAX, 0, 1);
      const wobble = Math.sin(this.distance * 0.13) * level * 8;
      const hitGlow = this.chassisHitFlash > 0 ? '#ffcf5a' : '#744638';
      const bottomY = 104 + rollOffset * 0.12;

      ctx.strokeStyle = hitGlow;
      ctx.lineWidth = 2.5 + level * 5;
      ctx.beginPath();
      ctx.moveTo(170, -130 + rollOffset * 0.08);
      ctx.lineTo(208 + level * 20, -112 + wobble);
      ctx.lineTo(184, -90 + level * 18);
      ctx.stroke();

      ctx.fillStyle = `rgba(215,79,97,${0.12 + level * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(222 + level * 12, -34 + rollOffset * 0.08, 34 + level * 22, 22 + level * 10, -0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#7e423d';
      ctx.lineWidth = 3 + level * 3;
      ctx.beginPath();
      ctx.moveTo(246, 34 + wobble * 0.2);
      ctx.lineTo(286 + level * 26, 42 + level * 32);
      ctx.stroke();

      if (damage > 8) {
        ctx.strokeStyle = '#f5fbff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-188, -134);
        ctx.lineTo(-154, -110);
        ctx.moveTo(-170, -130);
        ctx.lineTo(-178, -92);
        ctx.moveTo(-154, -110);
        ctx.lineTo(-120, -128);
        ctx.stroke();
      }

      if (damage > 18) {
        ctx.strokeStyle = '#5c332c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-72, -150);
        ctx.lineTo(-30 + level * 28, -104 + Math.sin(this.distance * 0.2) * level * 7);
        ctx.lineTo(-68, -20);
        ctx.stroke();
      }

      if (damage > 28) {
        ctx.fillStyle = '#26313a';
        for (let i = 0; i < 6; i += 1) {
          const smokeX = 288 + i * 12 + Math.sin(this.distance * 0.06 + i) * 5;
          const smokeY = 70 - i * 15 - level * 18;
          ctx.globalAlpha = 0.16 + level * 0.16;
          ctx.beginPath();
          ctx.ellipse(smokeX, smokeY, 14 + i * 3, 9 + i * 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (damage > 42) {
        const bounce = this.roofJunkBounce * 34 + Math.abs(Math.sin(this.distance * 0.18)) * level * 10;
        ctx.strokeStyle = '#5d3e2b';
        ctx.fillStyle = '#d8a84f';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(178 + wobble, -238 - bounce);
        ctx.rotate(0.25 + level * 0.35);
        roundRect(ctx, -28, -10, 56, 20, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (damage > 56) {
        ctx.fillStyle = '#f6f6eb';
        ctx.strokeStyle = '#143ec5';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(-252 - level * 16, 28 + Math.sin(this.distance * 0.17) * 6);
        ctx.rotate(-0.32 - level * 0.22);
        roundRect(ctx, -28, -42, 46, 84, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      if (damage > 46) {
        ctx.save();
        ctx.fillStyle = '#15191f';
        ctx.strokeStyle = '#7e423d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(-238, 44 + rollOffset * 0.1, 48 + level * 26, 34 + level * 12, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#f6f6eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-282, 8);
        ctx.lineTo(-306 - level * 24, -4 + wobble);
        ctx.lineTo(-288, 72 + level * 18);
        ctx.stroke();
        ctx.restore();
      }

      if (damage > 70) {
        ctx.save();
        ctx.strokeStyle = '#26313a';
        ctx.fillStyle = '#44515b';
        ctx.lineWidth = 4;
        ctx.translate(242 + level * 32, 92 + Math.sin(this.distance * 0.24) * 6);
        ctx.rotate(0.24 + level * 0.18);
        ctx.beginPath();
        ctx.ellipse(0, 0, 42, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = '#744638';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-210, bottomY + Math.sin(damage) * 3);
      ctx.lineTo(-142, bottomY + 8);
      ctx.moveTo(112, bottomY + 5);
      ctx.lineTo(182, bottomY + 15);
      ctx.stroke();
      ctx.restore();
    }

    drawSparks(ctx) {
      if (!this.sparks.length) return;
      ctx.save();
      for (const spark of this.sparks) {
        const x = this.screenXForWorld(spark.x);
        const y = this.screenYForWorld(spark.y);
        ctx.globalAlpha = clamp(spark.life / 0.45, 0, 1);
        ctx.fillStyle = '#ffd25a';
        ctx.beginPath();
        ctx.arc(x, y, spark.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff7a3d';
        ctx.beginPath();
        ctx.arc(x - spark.vx * 0.018, y - spark.vy * 0.018, spark.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawShockwaves(ctx) {
      if (!this.shockwaves.length) return;
      ctx.save();
      for (const wave of this.shockwaves) {
        const x = this.screenXForWorld(wave.x);
        const y = this.screenYForWorld(wave.y);
        const progress = 1 - wave.life / wave.maxLife;
        ctx.globalAlpha = clamp(wave.life / wave.maxLife, 0, 1);
        ctx.strokeStyle = '#ffd25a';
        ctx.lineWidth = 8 * (1 - progress) + 2;
        ctx.beginPath();
        ctx.arc(x, y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,116,61,0.68)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, wave.radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    drawWheel(ctx, x, y, spin, radius) {
      ctx.save();
      const tireDamage = clamp((this.chassisDamage - 58) / 42, 0, 1);
      const wobble = tireDamage * Math.sin(this.distance * 0.22 + x * 0.01) * 3.2;
      x += wobble;
      y += Math.abs(wobble) * 0.45;
      ctx.translate(x, y);
      ctx.rotate(spin);
      if (tireDamage > 0) {
        ctx.scale(1 + tireDamage * 0.18, 1 - tireDamage * 0.24);
      }
      ctx.fillStyle = '#1d252c';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5f1e6';
      ctx.lineWidth = Math.max(3, radius * 0.13);
      ctx.stroke();
      ctx.strokeStyle = '#89a4b1';
      ctx.lineWidth = Math.max(2, radius * 0.08);
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(i * Math.PI / 3) * radius * 0.8, Math.sin(i * Math.PI / 3) * radius * 0.8);
        ctx.stroke();
      }
      if (tireDamage > 0) {
        ctx.strokeStyle = `rgba(255,210,90,${0.25 + tireDamage * 0.45})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, radius * 0.2);
        ctx.lineTo(radius * 0.45, -radius * 0.18);
        ctx.moveTo(-radius * 0.2, -radius * 0.62);
        ctx.lineTo(radius * 0.62, radius * 0.34);
        ctx.stroke();
      }
      ctx.restore();
      if (tireDamage > 0.25) {
        ctx.save();
        ctx.globalAlpha = 0.12 + tireDamage * 0.18;
        ctx.fillStyle = '#26313a';
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.ellipse(x - 16 - i * 14, y - 20 - i * 7, 10 + i * 4, 6 + i * 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawRider(ctx, x, y) {
      const sway = Math.sin(this.distance * 0.08) * 2 + this.pitchVelocity * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.chairTilt * 0.58 + this.riderTilt * 0.36 + this.roll * 0.04 + this.riderSideSlip * 0.04 + sway * 0.003);
      if (this.characterReady && this.characterImage) {
        const iw = this.characterImage.naturalWidth || this.characterImage.width;
        const ih = this.characterImage.naturalHeight || this.characterImage.height;
        const drawW = 152;
        const drawH = drawW * (ih / iw);
        ctx.drawImage(this.characterImage, -64, -86, drawW, drawH);
      } else {
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, -22, 0, 66, 34, 12);
        ctx.fill();
        ctx.fillStyle = '#23262c';
        roundRect(ctx, -28, 28, 80, 38, 16);
        ctx.fill();
        ctx.fillStyle = '#f2c9a5';
        ctx.beginPath();
        ctx.arc(52, -10, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (this.bodyFloorContact > 0) {
        ctx.fillStyle = `rgba(215,79,97,${0.18 + Math.min(0.38, this.bodyFloorContact * 0.18)})`;
        ctx.beginPath();
        ctx.ellipse(x + 18, CABIN_FLOOR_Y + 7, 74, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawHud(ctx) {
      ctx.fillStyle = 'rgba(14,19,24,0.78)';
      roundRect(ctx, 18, 14, 304, 74, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 23px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('山地平衡房车', 36, 44);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#dce8ee';
      ctx.fillText(`${this.eventName}  ${Math.floor(this.distance)}m  ${Math.floor(this.velocity)}km/h  金币 ${this.coinCount}  最佳 ${Math.floor(this.best)}m`, 38, 70);
      this.drawLives(ctx, 252, 32);

      this.drawMeter(ctx, 360, 18, 180, '俯仰', this.pitch / MAX_PITCH);
      this.drawMeter(ctx, 560, 18, 180, '侧倾', this.roll / MAX_ROLL);
      this.drawMeter(ctx, 760, 18, 170, '破烂值', this.chassisDamage / CAR_COMEDY_DAMAGE_MAX);
      this.drawSpeedGauge(ctx);

      if (this.state === 'playing') {
        this.buttons.sound = { x: 708, y: 94, w: 56, h: 38 };
        this.buttons.pause = { x: 770, y: 94, w: 56, h: 38 };
        this.buttons.restart = { x: 832, y: 94, w: 56, h: 38 };
        this.buttons.share = { x: 894, y: 94, w: 56, h: 38 };
        this.buttons.gas = { x: 34, y: 400, w: 156, h: 104 };
        this.buttons.brake = { x: 770, y: 400, w: 156, h: 104 };
        this.buttons.coffee = { x: 404, y: 438, w: 150, h: 58 };
        this.buttons.weightTrack = { x: 592, y: 458, w: 132, h: 18 };
        this.buttons.weight = { x: 570, y: 416, w: 176, h: 92 };
        this.drawPedal(ctx, this.buttons.gas, '油门', this.gasPressed, '#52a66c');
        this.drawPedal(ctx, this.buttons.brake, '后退', this.brakePressed, '#d74f61');
        this.drawButton(ctx, this.buttons.coffee, this.coffeeCooldown > 0 ? `${this.coffeeCooldown.toFixed(1)}s` : '咖啡固定', this.coffeeCooldown > 0 ? '#8c929b' : '#b98049');
        this.drawButton(ctx, this.buttons.sound, this.soundEnabled ? '声音' : '静音', this.soundEnabled ? '#6c7a89' : '#8c929b');
        this.drawButton(ctx, this.buttons.pause, '暂停', '#26313a');
        this.drawButton(ctx, this.buttons.restart, '重开', '#4f8bd7');
        this.drawButton(ctx, this.buttons.share, '分享', '#52a66c');
        this.drawWeightControl(ctx);
      }

      if (this.messageTimer > 0 && this.message) {
        ctx.globalAlpha = Math.min(1, this.messageTimer * 2);
        ctx.fillStyle = '#111318';
        roundRect(ctx, 323, 104, 314, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.message, 480, 128);
        ctx.globalAlpha = 1;
      }
    }

    drawLives(ctx, x, y) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 18px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('命', x - 24, y + 1);
      for (let i = 0; i < MAX_LIVES; i += 1) {
        const active = i < this.lives;
        const cx = x + i * 22;
        ctx.fillStyle = active ? '#d74f61' : 'rgba(255,255,255,0.24)';
        ctx.beginPath();
        ctx.arc(cx - 5, y - 3, 6, 0, Math.PI * 2);
        ctx.arc(cx + 5, y - 3, 6, 0, Math.PI * 2);
        ctx.lineTo(cx, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = active ? '#ffffff' : 'rgba(255,255,255,0.42)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSpeedGauge(ctx) {
      const cx = 650;
      const cy = 444;
      const r = 58;
      const absSpeed = Math.abs(this.velocity);
      const normalMax = 188;
      const speedValue = clamp(absSpeed / normalMax, 0, 1);
      const overSpeed = clamp((absSpeed - normalMax) / (DASH_SPEED - normalMax), 0, 1);
      const rpmValue = clamp((this.gasPressed || this.brakePressed ? 0.22 : 0.04) + speedValue * 0.78 + overSpeed * 0.28 + Math.max(0, this.pitchVelocity) * 0.04, 0, 1.18);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#27313a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22);
      ctx.stroke();
      ctx.strokeStyle = '#d74f61';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 1.82, Math.PI * 2.22);
      ctx.stroke();
      if (overSpeed > 0) {
        ctx.strokeStyle = `rgba(93,213,255,${0.35 + overSpeed * 0.55})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 8, Math.PI * 0.78, Math.PI * (0.78 + overSpeed * 1.44));
        ctx.stroke();
      }
      for (let i = 0; i <= 6; i += 1) {
        const a = Math.PI * (0.78 + i * 0.24);
        ctx.strokeStyle = '#27313a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
      const needleAngle = Math.PI * (0.78 + Math.min(rpmValue, 1) * 1.44);
      ctx.strokeStyle = '#f2f4f5';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(needleAngle) * (r - 12), cy + Math.sin(needleAngle) * (r - 12));
      ctx.stroke();
      ctx.strokeStyle = '#d74f61';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(needleAngle) * (r - 12), cy + Math.sin(needleAngle) * (r - 12));
      ctx.stroke();
      ctx.fillStyle = '#27313a';
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '800 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.floor(this.velocity)}`, cx, cy + 34);
      ctx.font = '11px sans-serif';
      ctx.fillText(overSpeed > 0.08 ? '爆表' : 'km/h', cx, cy + 49);
      ctx.restore();
    }

    drawFailAnimation(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 19, 24, 0.24)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#111318';
      roundRect(ctx, 336, 104, 288, 54, 20);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('平衡腚还得练', 480, 139);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#f1d2d2';
      ctx.fillText(this.failReason || '这波没绷住', 480, 178);
      ctx.restore();
    }

    drawPauseMenu(ctx) {
      ctx.save();
      ctx.fillStyle = 'rgba(14, 19, 24, 0.58)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 318, 126, 324, 278, 18);
      ctx.fill();
      ctx.fillStyle = '#171a20';
      ctx.textAlign = 'center';
      ctx.font = '800 30px sans-serif';
      ctx.fillText('暂停中', 480, 184);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#56606c';
      ctx.fillText('物理、陨石、道具和计时都已暂停', 480, 216);
      this.buttons.resume = { x: 380, y: 246, w: 200, h: 48 };
      this.buttons.restart = { x: 380, y: 306, w: 200, h: 48 };
      this.buttons.share = { x: 380, y: 366, w: 200, h: 48 };
      this.buttons.sound = { x: 592, y: 246, w: 82, h: 48 };
      this.drawButton(ctx, this.buttons.resume, '继续游戏', '#52a66c');
      this.drawButton(ctx, this.buttons.restart, '重新开始', '#4f8bd7');
      this.drawButton(ctx, this.buttons.share, '分享战绩', '#d74f61');
      this.drawButton(ctx, this.buttons.sound, this.soundEnabled ? '声音' : '静音', '#6c7a89');
      ctx.restore();
    }

    drawMeter(ctx, x, y, w, label, value) {
      const danger = Math.abs(value);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      roundRect(ctx, x, y, w, 50, 10);
      ctx.fill();
      ctx.fillStyle = '#27313a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 12, y + 18);
      ctx.fillStyle = '#d7dce0';
      roundRect(ctx, x + 12, y + 28, w - 24, 9, 5);
      ctx.fill();
      const center = x + w / 2;
      const half = (w - 30) / 2;
      ctx.fillStyle = danger > 0.74 ? '#d74f61' : '#52a66c';
      const fill = clamp(value, -1, 1) * half;
      roundRect(ctx, fill >= 0 ? center : center + fill, y + 28, Math.abs(fill), 9, 5);
      ctx.fill();
      ctx.fillStyle = '#20252b';
      ctx.fillRect(center - 1, y + 25, 2, 15);
    }

    drawLeanPad(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      roundRect(ctx, 210, 438, 190, 58, 16);
      ctx.fill();
      ctx.fillStyle = '#27313a';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('滑动/倾斜：左右压重心', 305, 459);
      ctx.fillStyle = '#d8dde1';
      roundRect(ctx, 236, 472, 138, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#d74f61';
      ctx.beginPath();
      ctx.arc(305 + this.tiltInput * 62, 477, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    drawPedal(ctx, rect, label, pressed, color) {
      ctx.save();
      ctx.fillStyle = pressed ? color : 'rgba(255,255,255,0.84)';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
      ctx.fill();
      ctx.strokeStyle = pressed ? '#ffffff' : color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = pressed ? '#ffffff' : '#27313a';
      ctx.font = '900 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + 58);
      ctx.font = '13px sans-serif';
      ctx.fillText(label === '油门' ? '按住前进' : '按住倒车', rect.x + rect.w / 2, rect.y + 82);
      ctx.restore();
    }

    drawWeightControl(ctx) {
      const track = this.buttons.weightTrack;
      ctx.fillStyle = 'rgba(255,255,255,0.84)';
      roundRect(ctx, 626, 416, 306, 92, 16);
      ctx.fill();
      ctx.fillStyle = '#27313a';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('拖车尾配重：压车头 / 压车尾', 779, 441);
      ctx.fillStyle = '#d6dce1';
      roundRect(ctx, track.x, track.y, track.w, track.h, 9);
      ctx.fill();
      ctx.fillStyle = '#4f8bd7';
      const knobX = track.x + (this.rearWeight + 1) * 0.5 * track.w;
      ctx.beginPath();
      ctx.arc(knobX, track.y + track.h / 2, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#59636e';
      ctx.font = '12px sans-serif';
      ctx.fillText('前', track.x, 496);
      ctx.fillText('后', track.x + track.w, 496);
    }

    drawStart(ctx) {
      ctx.fillStyle = 'rgba(14, 19, 24, 0.58)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 268, 124, 424, 254, 18);
      ctx.fill();
      ctx.fillStyle = '#171a20';
      ctx.textAlign = 'center';
      ctx.font = '800 34px sans-serif';
      ctx.fillText('山地平衡载具版', 480, 186);
      ctx.font = '17px sans-serif';
      ctx.fillStyle = '#525b66';
      ctx.fillText('左下油门，右下后退；松手车辆会停住', 480, 234);
      ctx.fillText('椅子先晃，人再晃；身体碰到车厢底线才失败', 480, 262);
      ctx.fillText('控速、配重、倾斜和咖啡一起稳住小白椅', 480, 290);
      this.drawButton(ctx, { x: 378, y: 322, w: 204, h: 50 }, '开始守护蹲姿', '#d74f61');
    }

    drawGameOver(ctx) {
      ctx.fillStyle = 'rgba(14, 19, 24, 0.62)';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 294, 112, 372, 294, 18);
      ctx.fill();
      ctx.fillStyle = '#171a20';
      ctx.textAlign = 'center';
      ctx.font = '800 28px sans-serif';
      ctx.fillText('蹲姿失守', 480, 168);
      ctx.font = '46px sans-serif';
      ctx.fillText(`${Math.floor(this.distance)}m`, 480, 232);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#56606c';
      ctx.fillText(this.failReason, 480, 274);
      ctx.fillText(`最佳 ${Math.floor(this.best)}m`, 480, 304);
      this.buttons.retry = { x: 322, y: 336, w: 146, h: 50 };
      this.buttons.share = { x: 492, y: 336, w: 146, h: 50 };
      this.drawButton(ctx, this.buttons.retry, '再开一局', '#d74f61');
      this.drawButton(ctx, this.buttons.share, '分享', '#52a66c');
    }

    drawButton(ctx, rect, label, color) {
      ctx.fillStyle = color;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6);
    }

    showMessage(text, seconds) {
      this.message = text;
      this.messageTimer = seconds;
    }

    hit(rect, x, y) {
      return rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    loadCharacterImage() {
      if (!this.characterSrc) {
        return;
      }
      let image = null;
      if (this.platform === 'wechat' && this.wx && this.wx.createImage) {
        image = this.wx.createImage();
      } else if (typeof Image !== 'undefined') {
        image = new Image();
      }
      if (!image) return;
      image.onload = () => {
        this.characterImage = image;
        this.characterReady = true;
      };
      image.onerror = () => {
        this.characterReady = false;
      };
      image.src = this.characterSrc;
    }

    loadBombImage() {
      if (!this.bombSrc) {
        return;
      }
      let image = null;
      if (this.platform === 'wechat' && this.wx && this.wx.createImage) {
        image = this.wx.createImage();
      } else if (typeof Image !== 'undefined') {
        image = new Image();
      }
      if (!image) return;
      image.onload = () => {
        this.bombImage = image;
        this.bombReady = true;
      };
      image.onerror = () => {
        this.bombReady = false;
      };
      image.src = this.bombSrc;
    }

    loadBest() {
      try {
        if (this.platform === 'web' && typeof localStorage !== 'undefined') {
          return Number(localStorage.getItem('mountainRvBest') || 0);
        }
        if (this.wx && this.wx.getStorageSync) {
          return Number(this.wx.getStorageSync('mountainRvBest') || 0);
        }
      } catch (error) {
        return 0;
      }
      return 0;
    }

    saveBest(value) {
      try {
        if (this.platform === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('mountainRvBest', String(value));
        } else if (this.wx && this.wx.setStorageSync) {
          this.wx.setStorageSync('mountainRvBest', value);
        }
      } catch (error) {
        // Storage failures should not break the run.
      }
    }
  }

  function roundRect(ctx, x, y, w, h, radius) {
    const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
    const right = x + w;
    const bottom = y + h;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(right, y, right, bottom, r);
    ctx.arcTo(right, bottom, x, bottom, r);
    ctx.arcTo(x, bottom, x, y, r);
    ctx.arcTo(x, y, right, y, r);
    ctx.closePath();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothStep(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function hashRandom(seed, key) {
    let value = (Math.imul((seed | 0) ^ 0x9e3779b9, 1664525) + Math.imul((key | 0) ^ 0x85ebca6b, 1013904223)) | 0;
    value ^= value >>> 16;
    value = Math.imul(value, 2246822519) | 0;
    value ^= value >>> 13;
    value = Math.imul(value, 3266489917) | 0;
    value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  }

  function now() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  function requestFrame(callback) {
    const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(() => fn(now()), 16);
    return raf(callback);
  }

  function prevent(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
  }

  return { createBalanceDingGame };
});
