import EntityController from "./EntityController.js";
import Intup from "./Input.js";
import { vec3 } from "./gmath.js";
import spa from "./spa.js";

class PlayerLocalController extends EntityController {
    constructor(player, canvas, {
        mousemoveSensitivity = 200,
    } = {}) {
        super(player);
        this.mousemoveSensitivity = mousemoveSensitivity;
        this.input = new Intup(canvas);
        // this.input.enableAutoPointerLock();
        this.input.addEventListener("mousemove", this.mousemove.bind(this));
        this.input.addEventListener("mouseup", this.mouseup.bind(this));
        this.input.addEventListener("mousedown", this.mousedown.bind(this));
        this.input.addEventListener("keydown", this.keydown.bind(this));
        this.input.addEventListener("keyup", this.keyup.bind(this));
        this.input.addEventListener("wheelup", this.wheelup.bind(this));
        this.input.addEventListener("wheeldown", this.wheeldown.bind(this));
        this.input.addEventListener("pointerlockchange", (e, locked) => {
            if (!locked && this.showStopPage) {
                spa.openPage("stop_game_page");
            }
            else if (locked) this.input.requestPointerLock();
            this.showStopPage = true;
        });
        this.keys = this.input.keys;
        this.input.onFlyBtnClick = () => {
            let {lastFlyBtnClick} = this, now = new Date();
            if (lastFlyBtnClick - now < 0 && now - lastFlyBtnClick < 250) {
                this.entity.toFlyMode && this.entity.toFlyMode(false);
                let moveBtns = this.input.moveBtns;
                if (this.entity.isFly) {
                    moveBtns.querySelector(".mc-move-btn-jump").style.display = "none";
                    moveBtns.querySelector(".mc-move-btn-fly").style.display = "";
                }
                else {
                    moveBtns.querySelector(".mc-move-btn-jump").style.display = "";
                    moveBtns.querySelector(".mc-move-btn-fly").style.display = "none";
                }
            }
            this.lastFlyBtnClick = now;
        };
        this.mouseRightBtnDown = false;
        this.mouseLeftBtnDown = false;
        this.destroyOrPlaceBlockTimer = null;
    };
    mousemove(e, locked) {
        if (!locked) return;
        let i = this.mousemoveSensitivity * (Math.PI / 180);
        // movementX left- right+    movementY up- down+
        this.entity.yaw -= (e.movementX || e.mozMovementX || e.webkitMovementX || 0) * i / this.input.canvas.width;
        this.entity.pitch -= (e.movementY || e.mozMovementY || e.webkitMovementY || 0) * i / this.input.canvas.height;
        if (this.entity.pitch > Math.PI / 2)
            this.entity.pitch = Math.PI / 2;
        else if (this.entity.pitch < -Math.PI / 2)
            this.entity.pitch = -Math.PI / 2;
    };
    mousedown(e, locked) {
        if (!locked) {
            this.input.requestPointerLock();
            return;
        }
        if (e.button !== 0 && e.button !== 2) return;
        if (e.button === 0) this.mouseRightBtnDown = true;
        if (e.button === 2) this.mouseLeftBtnDown = true;
        const destroyOrPlaceBlock = () => {
            let entity = this.entity,
                world = entity.world,
                start = entity.getEyePosition(),
                end = entity.getDirection(20);
            vec3.add(start, end, end);
            // 当实体有碰撞箱时 这里需要按碰撞箱检测
            let hit = world.rayTraceBlock(start, end, (x, y, z) => {
                let b = world.getTile(x, y, z);
                return b && b.name !== "air";
            });
            if (hit === null || hit.axis === "") return;
            let pos = hit.blockPos;
            if (this.mouseLeftBtnDown) {
                pos["xyz".indexOf(hit.axis[0])] += hit.axis[1] === '-'? -1: 1;
                if (vec3.exactEquals(pos, start.map(Math.floor))) return;
                let blockName = this.entity.inventory.getOnHands().name;
                if (blockName !== "air") world.setTile(...pos, blockName);
            }
            else if (this.mouseRightBtnDown) {
                world.setTile(...pos, "air");
            }
        };
        destroyOrPlaceBlock();
        if (this.destroyOrPlaceBlockTimer !== null)
            window.clearInterval(this.destroyOrPlaceBlockTimer);
        this.destroyOrPlaceBlockTimer = window.setInterval(destroyOrPlaceBlock, 300);
    };
    mouseup(e, locked) {
        if (!locked) return;
        if (e.button === 0) this.mouseRightBtnDown = false;
        if (e.button === 2) this.mouseLeftBtnDown = false;
        if (!(this.mouseRightBtnDown || this.mouseLeftBtnDown) && this.destroyOrPlaceBlockTimer !== null) {
            window.clearInterval(this.destroyOrPlaceBlockTimer);
            this.destroyOrPlaceBlockTimer = null;
        }
    };
    keydown(e, locked) {
        if (this.entity.inventory) {
            if (String.fromCharCode(e.keyCode) === 'E') {
                if (locked) {
                    this.showStopPage = false;
                    this.input.exitPointerLock();
                    this.entity.inventory.showInventoryPage();
                }
                else this.entity.inventory.closeInventoryPage();
            }
        }
        if (!locked) return;
        if (String.fromCharCode(e.keyCode) === ' ') {
            let {spaceDownTime, spaceUpTime} = this;
            let now = new Date();
            if (spaceDownTime - spaceUpTime < 0 && now - spaceDownTime > 90 && now - spaceDownTime < 250)
                this.doubleClickSpace = true;
            else this.doubleClickSpace = false;
            if (this.doubleClickSpace) {
                this.entity.toFlyMode && this.entity.toFlyMode(!this.entity.isFly);
                let moveBtns = this.input.moveBtns;
                try {
                    if (this.entity.isFly) {
                        moveBtns.querySelector(".mc-move-btn-jump").style.display = "none";
                        moveBtns.querySelector(".mc-move-btn-fly").style.display = "";
                    }
                    else {
                        moveBtns.querySelector(".mc-move-btn-jump").style.display = "";
                        moveBtns.querySelector(".mc-move-btn-fly").style.display = "none";
                    }
                } catch {}
            }
            this.spaceDownTime = now;
        }
        if (this.keys.W) {
            let {moveDownTime, moveUpTime} = this;
            let now = new Date();
            if (moveDownTime - moveUpTime < 0 && now - moveDownTime > 90 && now - moveDownTime < 250)
                this.doubleClickMove = true;
            else this.doubleClickMove = false;
            if (this.doubleClickMove) {
                this.entity.toRunMode && this.entity.toRunMode(!this.entity.isRun);
            }
            this.moveDownTime = now;
        }
    };
    keyup(e, locked) {
        if (!locked) return;
        if (!this.keys[" "]) this.spaceUpTime = new Date();
        if (!this.keys.W) {
            this.moveUpTime = new Date();
            this.entity.toRunMode && this.entity.toRunMode(false);
        }
    };
    wheelup(e, locked) {
        if (!locked) return;
        const t = new Date();
        if (t - this.lastWeelTime < 100) return;
        this.entity.inventory && this.entity.inventory.hotbarSelectNext();
        this.lastWeelTime = t;
    };
    wheeldown(e, locked) {
        if (!locked) return;
        const t = new Date();
        if (t - this.lastWeelTime < 100) return;
        this.entity.inventory && this.entity.inventory.hotbarSelectPrev();
        this.lastWeelTime = t;
    };
};

export {
    PlayerLocalController,
    PlayerLocalController as default
};
