/*jslint browser: true, undef: true, eqeqeq: true, nomen: true, white: true */
/*global window: false, document: false */

/**
 * @license Copyright 2010 Dalton Maag Ltd http://www.daltonmaag.com
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

var PACMAN = (function () {

    "use strict";

    var FPS = 30,
        BLOCK = 20,
        BISCUIT = 2,
        PILL = 6,
        GHOST = 10,
        PACMAN = 15,
        
        // Directions
        UP = 1,
        LEFT = 2, 
        DOWN = 4,
        RIGHT = 8,
        WAITING = 5,
        PAUSE = 6,
        PLAYING = 7,
        COUNTDOWN = 8,
        EATEN_PAUSE = 9,
        DYING = 10,
        Modernizr = window.Modernizr,
        
        // Ghost colors
        ghostColors = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
        
        // Map
        map = [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
            [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
            [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
            [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
            [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
            [0,0,0,0,1,0,1,0,0,2,0,0,1,0,1,0,0,0,0],
            [2,1,1,1,1,1,1,0,2,2,2,0,1,1,1,1,1,1,2],
            [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
            [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
            [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
            [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
            [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
            [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
            [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
            [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        
        height = null,
        width = null,
        state = WAITING,
        audio = null,
        ghosts = [],
        ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
        eatenCount = 0,
        level = 0,
        tick = 0,
        ghostPos, userPos, stateChanged = true,
        timerStart = null,
        lastTime = 0,
        ctx = null,
        timer = null,
        map = null,
        user = null,
        stored = null;

    function getTick() {
        return tick;
    }

    function drawScore(text, position) {
        ctx.fillStyle = "#FFFF00";
        ctx.font = "12px BDCartoonShoutRegular";
        ctx.fillText(text, 
                     (position["new"]["x"] / 10) * BLOCK, 
                     ((position["new"]["y"] + 5) / 10) * BLOCK);
    }

    function dialog(text) {
        ctx.fillStyle = "#FFFF00";
        ctx.font = "14px BDCartoonShoutRegular";
        var width = ctx.measureText(text).width,
            x = ((map.width * BLOCK) - width) / 2;
        ctx.fillText(text, x, (map.height * 10) + 8);
    }

    function soundDisabled() {
        return localStorage["soundDisabled"] === "true";
    }

    function startLevel() {        
        user.resetPosition();
        for (var i = 0; i < ghosts.length; i += 1) {
            if (!ghosts[i].eaten) {
                ghosts[i].reset();
            }
        }
        audio.play("start");
        timerStart = tick;
        setState(COUNTDOWN);
    }

    function startNewGame() {
        setState(WAITING);
        level = 1;
        user.reset();
        map.reset();
        map.draw(ctx);
        startLevel();
    }

    function keyDown(e) {
        if (e.keyCode === 78) { // 'N' key
            startNewGame();
        } else if (e.keyCode === 83) { // 'S' key
            audio.disableSound();
            localStorage["soundDisabled"] = !soundDisabled();
        } else if (e.keyCode === 80 && state === PAUSE) { // 'P' key
            map.draw(ctx);
            setState(stored);
        } else if (e.keyCode === 80) { // 'P' key
            stored = state;
            setState(PAUSE);
        } else if (state !== PAUSE) {   
            return user.keyDown(e);
        }
        return true;
    }

    function loseLife() {        
        setState(WAITING);
        user.loseLife();
        if (user.getLives() > 0) {
            startLevel();
        }
    }

    function setState(nState) {
        state = nState;
        stateChanged = true;
    }

    function collided(user, ghost) {
        return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + 
                         Math.pow(ghost.y - user.y, 2))) < 10;
    }

    function drawFooter() {
        var topLeft = (map.height * BLOCK),
            textBase = topLeft + 17;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, topLeft, (map.width * BLOCK), 30);

        ctx.fillStyle = "#FFFF00";

        for (var i = 0, len = user.getLives(); i < len; i++) {
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.moveTo(150 + (25 * i) + BLOCK / 2,
                       (topLeft + 1) + BLOCK / 2);

            ctx.arc(150 + (25 * i) + BLOCK / 2,
                    (topLeft + 1) + BLOCK / 2,
                    BLOCK / 2, Math.PI * 0.15, Math.PI * 1.85, false);
            ctx.fill();
        }

        ctx.fillStyle = !soundDisabled() ? "#00FF00" : "#FF0000";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("♪", 10, textBase);
        ctx.fillText("s", 10, textBase);

        ctx.fillStyle = "#FFFF00";
        ctx.font = "14px BDCartoonShoutRegular";
        ctx.fillText("Score: " + user.theScore(), 30, textBase);
        ctx.fillText("Level: " + level, 260, textBase);
    }

    function redrawBlock(pos) {
        map.drawBlock(Math.floor(pos.y/10), Math.floor(pos.x/10), ctx);
        map.drawBlock(Math.ceil(pos.y/10), Math.ceil(pos.x/10), ctx);
    }

    function mainDraw() { 

        var diff, u, i, len, nScore;

        ghostPos = [];

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            ghostPos.push(ghosts[i].move(ctx));
        }
        u = user.move(ctx);

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            redrawBlock(ghostPos[i].old);
        }
        redrawBlock(u.old);

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            ghosts[i].draw(ctx);
        }                     
        user.draw(ctx);

        userPos = u["new"];

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            if (collided(userPos, ghostPos[i]["new"])) {
                if (ghosts[i].isVulnerable()) { 
                    audio.play("eatghost");
                    ghosts[i].eat();
                    eatenCount += 1;
                    nScore = eatenCount * 50;
                    drawScore(nScore, ghostPos[i]);
                    user.addScore(nScore);                    
                    setState(EATEN_PAUSE);
                    timerStart = tick;
                } else if (ghosts[i].isDangerous()) {
                    audio.play("die");
                    setState(DYING);
                    timerStart = tick;
                }
            }
        }                             
    }

    function mainLoop() {

        var diff;

        if (state !== PAUSE) { 
            ++tick;
        }

        map.drawPills(ctx);

        if (state === PLAYING) {
            mainDraw();
        } else if (state === WAITING && stateChanged) {            
            stateChanged = false;
            map.draw(ctx);
            dialog("Press N to start a New game");            
        } else if (state === EATEN_PAUSE && 
                   (tick - timerStart) > (Modernizr.audio ? 3 : 1)) {
            map.draw(ctx);
            setState(PLAYING);
        } else if (state === DYING) {
            if (tick - timerStart > (Modernizr.audio ? 4 : 1)) { 
                loseLife();
            }
        } else if (state === COUNTDOWN) {
            
            diff = 5 + timerStart - tick;
            
            if (diff === 0) {
                map.draw(ctx);
                setState(PLAYING);
            } else {
                if (diff > 0) {
                    dialog("Starting in: " + diff);
                } else { 
                    dialog("GO!");
                }
            }
        } else if (state === PAUSE && stateChanged) {
            stateChanged = false;
            dialog("Game Paused");
        }                        

        drawFooter();
    }

    function eatenPill() {
        audio.play("eatpill");
        timerStart = tick;
        eatenCount = 0;
        for (var i = 0; i < ghosts.length; i += 1) {
            if (!ghosts[i].eaten) {
                ghosts[i].makeEatable(ctx);
            }
        }        
    }

    function completedLevel() {
        setState(WAITING);
        level += 1;
        map.reset();
        user.newLevel();
        // Reset all ghosts for new level
        for (var i = 0; i < ghosts.length; i += 1) {
            ghosts[i].eaten = false;
            ghosts[i].reset();
        }
        startLevel();
    }

    function keyPress(e) {
        if (state !== WAITING && state !== PAUSE) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function init(wrapper, root) {

        var i, len, ghost,
            blockSize = wrapper.offsetWidth / 19,
            canvas = document.createElement("canvas");
        
        canvas.setAttribute("width", (blockSize * 19) + "px");
        canvas.setAttribute("height", (blockSize * 22) + 30 + "px");
        
        wrapper.appendChild(canvas);
        
        ctx = canvas.getContext('2d');

        audio = PACMAN.audio(root);
        
        map = PACMAN.map(ctx, blockSize);
        user = PACMAN.user(ctx, map, blockSize);
        
        ghosts = [];
        for (i = 0; i < 4; i += 1) {
            ghost = PACMAN.ghost(ctx, map, blockSize, ghostColors[i]);
            ghosts.push(ghost);
        }
        
        map.setBlock = function(pos, type) {
            if (type === PILL && map.block(pos) === PILL) {
                return false;
            }
            map.setBlock(pos, type);
            return true;
        };

        user.eaten = eatenPill;
        user.win = completedLevel;

        document.addEventListener("keydown", keyDown, true);
        document.addEventListener("keypress", keyPress, true); 

        timer = window.setInterval(mainLoop, 1000 / FPS);

        return {
            soundDisabled : soundDisabled,
            init : init,
            startNewGame : startNewGame,
            showLeaderboard: showLeaderboard
        };
    }

    function showLeaderboard() {
        // Clear the canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Title
        ctx.fillStyle = "#FFFF00";
        ctx.font = "20px BDCartoonShoutRegular";
        ctx.fillText("GLOBAL LEADERBOARD", 50, 50);
        
        // Instructions
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px BDCartoonShoutRegular";
        ctx.fillText("PRESS ESC TO RETURN TO GAME", 50, 80);
        
        // Headers
        ctx.fillStyle = "#FFFF00";
        ctx.font = "14px BDCartoonShoutRegular";
        ctx.fillText("RANK", 50, 120);
        ctx.fillText("NAME", 120, 120);
        ctx.fillText("SCORE", 200, 120);
        ctx.fillText("LEVEL", 280, 120);
        ctx.fillText("DATE", 350, 120);
        
        // Get and display leaderboard data
        if (typeof window.getGlobalLeaderboard === 'function') {
            window.getGlobalLeaderboard().then(function(data) {
                ctx.fillStyle = "#FFFFFF";
                ctx.font = "12px BDCartoonShoutRegular";
                
                for (var i = 0; i < Math.min(data.length, 10); i++) {
                    var y = 150 + (i * 25);
                    var entry = data[i];
                    
                    // Rank
                    ctx.fillText((i + 1).toString(), 50, y);
                    
                    // Name
                    ctx.fillText(entry.name || "ANON", 120, y);
                    
                    // Score (green)
                    ctx.fillStyle = "#00FF00";
                    ctx.fillText(entry.score.toString(), 200, y);
                    
                    // Level (gold)
                    ctx.fillStyle = "#FFD700";
                    ctx.fillText(entry.level.toString(), 280, y);
                    
                    // Date
                    ctx.fillStyle = "#FFFFFF";
                    var date = new Date(entry.created_at);
                    ctx.fillText(date.toLocaleDateString(), 350, y);
                }
            }).catch(function(error) {
                console.error('Error loading leaderboard:', error);
                ctx.fillStyle = "#FF0000";
                ctx.font = "12px BDCartoonShoutRegular";
                ctx.fillText("Error loading leaderboard", 50, 150);
            });
        }
        
        // Add ESC key listener
        function escapeHandler(e) {
            if (e.keyCode === 27) { // ESC key
                document.removeEventListener("keydown", escapeHandler);
                map.draw(ctx);
                setState(WAITING);
            }
        }
        document.addEventListener("keydown", escapeHandler);
        
        setState(PAUSE);
    }

    function showNameInput(score, level) {
        // Clear the canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        var playerName = "";
        var cursorVisible = true;
        var cursorTimer = 0;
        
        function drawNameInput() {
            // Clear canvas
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Title
            ctx.fillStyle = "#FFFF00";
            ctx.font = "20px BDCartoonShoutRegular";
            var titleText = "ENTER LEADERBOARD NAME";
            var titleWidth = ctx.measureText(titleText).width;
            ctx.fillText(titleText, (ctx.canvas.width - titleWidth) / 2, 150);
            
            // Input box background
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(150, 180, 200, 30);
            
            // Input box border
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(150, 180, 200, 30);
            
            // Player name text
            ctx.fillStyle = "#000000";
            ctx.font = "16px BDCartoonShoutRegular";
            ctx.fillText(playerName, 155, 200);
            
            // Cursor
            if (cursorVisible) {
                var textWidth = ctx.measureText(playerName).width;
                ctx.fillRect(155 + textWidth, 185, 2, 20);
            }
            
            // Instructions
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "12px BDCartoonShoutRegular";
            ctx.fillText("MAX 6 CHARACTERS", 200, 230);
            
            // Confirm button
            var buttonColor = playerName.length > 0 ? "#00FF00" : "#666666";
            ctx.fillStyle = buttonColor;
            ctx.fillRect(200, 250, 120, 30);
            
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(200, 250, 120, 30);
            
            ctx.fillStyle = "#000000";
            ctx.font = "14px BDCartoonShoutRegular";
            ctx.fillText("CONFIRM NAME", 210, 270);
        }
        
        function nameInputHandler(e) {
            if (e.keyCode === 8) { // Backspace
                playerName = playerName.slice(0, -1);
                drawNameInput();
            } else if (e.keyCode === 13 && playerName.length > 0) { // Enter
                confirmName();
            } else if (e.keyCode >= 32 && e.keyCode <= 126 && playerName.length < 6) {
                // Printable characters
                var char = String.fromCharCode(e.keyCode).toUpperCase();
                playerName += char;
                drawNameInput();
            }
            e.preventDefault();
        }
        
        function confirmName() {
            if (playerName.length === 0) return;
            
            document.removeEventListener("keydown", nameInputHandler);
            clearInterval(cursorInterval);
            
            // Save score with name
            if (typeof window.saveScoreToLeaderboard === 'function') {
                window.saveScoreToLeaderboard(score, level, playerName).then(function() {
                    showLeaderboard();
                }).catch(function(error) {
                    console.error('Error saving score:', error);
                    showLeaderboard();
                });
            } else {
                showLeaderboard();
            }
        }
        
        // Cursor blinking
        var cursorInterval = setInterval(function() {
            cursorVisible = !cursorVisible;
            drawNameInput();
        }, 500);
        
        document.addEventListener("keydown", nameInputHandler);
        drawNameInput();
    }

    return {
        init : init,
        showLeaderboard: showLeaderboard,
        showNameInput: showNameInput
    };

}());

/* Human readable keyCode index */
var KEY = {'BACKSPACE': 8, 'TAB': 9, 'NUM_PAD_CLEAR': 12, 'ENTER': 13, 'SHIFT': 16, 'CTRL': 17, 'ALT': 18, 'PAUSE': 19, 'CAPS_LOCK': 20, 'ESCAPE': 27, 'SPACEBAR': 32, 'PAGE_UP': 33, 'PAGE_DOWN': 34, 'END': 35, 'HOME': 36, 'ARROW_LEFT': 37, 'ARROW_UP': 38, 'ARROW_RIGHT': 39, 'ARROW_DOWN': 40, 'PRINT_SCREEN': 44, 'INSERT': 45, 'DELETE': 46, 'SEMICOLON': 59, 'WINDOWS_LEFT': 91, 'WINDOWS_RIGHT': 92, 'SELECT': 93, 'NUM_PAD_ASTERISK': 106, 'NUM_PAD_PLUS_SIGN': 107, 'NUM_PAD_HYPHEN-MINUS': 109, 'NUM_PAD_FULL_STOP': 110, 'NUM_PAD_SOLIDUS': 111, 'NUM_LOCK': 144, 'SCROLL_LOCK': 145, 'SEMICOLON': 186, 'EQUALS_SIGN': 187, 'COMMA': 188, 'HYPHEN-MINUS': 189, 'FULL_STOP': 190, 'SOLIDUS': 191, 'GRAVE_ACCENT': 192, 'LEFT_SQUARE_BRACKET': 219, 'REVERSE_SOLIDUS': 220, 'RIGHT_SQUARE_BRACKET': 221, 'APOSTROPHE': 222};

(function () {
    "use strict";
    
    var NONE = 4,
        UP = 1,
        LEFT = 2, 
        DOWN = 4,
        RIGHT = 8,
        BLOCK = 20;

    PACMAN.user = function (ctx, map, blockSize) {

        var position = null,
            direction = null,
            eaten = null,
            due = null, 
            lives = null,
            score = 5,
            keyMap = {};
            
        keyMap[KEY.ARROW_LEFT] = LEFT;
        keyMap[KEY.ARROW_UP] = UP;
        keyMap[KEY.ARROW_RIGHT] = RIGHT;
        keyMap[KEY.ARROW_DOWN] = DOWN;

        function addScore(nScore) { 
            score += nScore;
            if (score >= 10000 && score - nScore < 10000) { 
                lives += 1;
            }
        }

        function theScore() { 
            return score;
        }

        function loseLife() { 
            lives -= 1;
            if (lives === 0) {
                // Show name input when game over
                PACMAN.showNameInput(score, map.level || 1);
            }
        }

        function getLives() {
            return lives;
        }

        function newLevel() {
            resetPosition();
            eaten = 0;
        }

        function resetPosition() {
            position = {"x": 90, "y": 120};
            direction = LEFT;
            due = LEFT;
        }

        function reset() {
            lives = 3;
            score = 0;
            newLevel();
        }

        function keyDown(e) {
            if (typeof keyMap[e.keyCode] !== "undefined") { 
                due = keyMap[e.keyCode];
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            return true;
        }

        function getNewCoord(dir, current) {   
            return {
                "x": current.x + (dir === LEFT && -2 || dir === RIGHT && 2 || 0),
                "y": current.y + (dir === DOWN && 2 || dir === UP && -2 || 0)
            };
        }

        function onWholeSquare(x) {
            return x % 10 === 0;
        }

        function pointToCoord(x) {
            return Math.round(x/10);
        }

        function nextSquare(x, dir) {
            var rem = x % 10;
            if (rem === 0) { 
                return x; 
            } else if (dir === RIGHT || dir === DOWN) { 
                return x + (10 - rem);
            } else {
                return x - rem;
            }
        }

        function next(pos, dir) {
            return {
                "y" : pointToCoord(nextSquare(pos.y, dir)),
                "x" : pointToCoord(nextSquare(pos.x, dir)),
            };                               
        }

        function onGridSquare(pos) {
            return onWholeSquare(pos.y) && onWholeSquare(pos.x);
        }

        function isOnSamePlane(due, dir) {
            return ((due === LEFT || due === RIGHT) && 
                    (dir === LEFT || dir === RIGHT)) || 
                ((due === UP || due === DOWN) && 
                 (dir === UP || dir === DOWN));
        }

        function move(ctx) {

            var npos = null, 
                nextWhole = null, 
                oldPosition = position,
                block = null;

            if (due !== direction) {
                npos = getNewCoord(due, position);

                if (isOnSamePlane(due, direction) || 
                    (onGridSquare(position) && 
                     map.isFloorSpace(next(npos, due)))) {
                    direction = due;
                } else {
                    npos = null;
                }
            }

            if (npos === null) {
                npos = getNewCoord(direction, position);
            }

            if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) {
                direction = NONE;
            }

            if (direction === NONE) {
                return {"new" : position, "old" : position};
            }

            if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) {
                npos = {"y": 100, "x": -10};
            }

            if (npos.y === 100 && npos.x <= -12 && direction === LEFT) {
                npos = {"y": 100, "x": 190};
            }

            position = npos;        
            nextWhole = next(position, direction);

            block = map.block(nextWhole);        

            if ((block === 1 || block === 4) && 
                onGridSquare(position)) {

                map.setBlock(nextWhole, 0);
                addScore((block === 1) ? 10 : 50);
                eaten += 1;

                if (eaten === 182) {
                    eaten = 0;
                    map.reset();
                    map.level += 1;
                    if (typeof eaten === "function") { 
                        eaten();
                    }
                }

                if (block === 4) {
                    if (typeof eaten === "function") { 
                        eaten();
                    }                    
                }
            }   

            return {
                "new" : position,
                "old" : oldPosition
            };
        }

        function draw(ctx) {

            var s = map.blockSize, 
                angle = 0;

            if ((typeof direction === "number") && 
                (direction > 0 && direction < 9)) {

                if (direction === UP) { 
                    angle = Math.PI * 1.5;
                } else if (direction === DOWN) { 
                    angle = Math.PI * 0.5;
                } else if (direction === LEFT) { 
                    angle = Math.PI;
                } else if (direction === RIGHT) { 
                    angle = 0;
                }

                ctx.fillStyle = "#FFFF00";
                ctx.save();
                ctx.translate(((position.x/10) * s) + s / 2,
                              ((position.y/10) * s) + s / 2);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.arc(0, 0, s / 2, 0.15 * Math.PI, 1.85 * Math.PI, false);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();    
                ctx.restore();
            }
        }

        return {
            "draw"          : draw,
            "loseLife"      : loseLife,
            "getLives"      : getLives,
            "score"         : score,
            "addScore"      : addScore,
            "theScore"      : theScore,
            "keyDown"       : keyDown,
            "move"          : move,
            "newLevel"      : newLevel,
            "reset"         : reset,
            "resetPosition" : resetPosition
        };
    };

}());

(function () {
    "use strict";

    var WALL = 0,
        BISCUIT = 1,
        EMPTY = 2,
        BLOCK = 3,
        PILL = 4,
        NONE = 4,
        UP = 1,
        LEFT = 2, 
        DOWN = 4,
        RIGHT = 8;

    PACMAN.map = function (ctx, blockSize) {

        var height = null, 
            width = null, 
            blockSize = blockSize,
            pillSize = 0,
            map = [
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
                [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
                [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
                [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
                [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
                [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
                [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
                [0,0,0,0,1,0,1,0,0,2,0,0,1,0,1,0,0,0,0],
                [2,1,1,1,1,1,1,0,2,2,2,0,1,1,1,1,1,1,2],
                [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
                [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
                [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
                [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
                [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
                [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
                [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
                [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ];

        height = map.length;
        width = map[0].length;

        function withinBounds(y, x) {
            return y >= 0 && y < height && x >= 0 && x < width;
        }

        function isWall(pos) {
            return withinBounds(pos.y, pos.x) && map[pos.y][pos.x] === WALL;
        }

        function isFloorSpace(pos) {
            if (!withinBounds(pos.y, pos.x)) {
                return false;
            }
            var peice = map[pos.y][pos.x];
            return peice === EMPTY || 
                peice === BISCUIT || 
                peice === PILL;
        }

        function drawWall(ctx) {

            var i, j, p, line;

            ctx.strokeStyle = "#0000FF";
            ctx.lineWidth = 2;
            ctx.lineCap = "round";

            for (i = 0; i < height; i += 1) {
                for (j = 0; j < width; j += 1) {
                    if (map[i][j] === WALL) {
                        ctx.fillStyle = "#0000FF";
                        ctx.fillRect((j * blockSize), (i * blockSize), 
                                     blockSize, blockSize);

                        if (withinBounds(i-1, j) && map[i-1][j] === WALL) {
                            line = [];
                            line[0] = [(j * blockSize), (i * blockSize)];
                            line[1] = [((j+1) * blockSize), (i * blockSize)];
                            ctx.beginPath();
                            ctx.moveTo(line[0][0], line[0][1]);
                            ctx.lineTo(line[1][0], line[1][1]);
                            ctx.stroke();
                        }

                        if (withinBounds(i, j-1) && map[i][j-1] === WALL) { 
                            line = [];
                            line[0] = [(j * blockSize), (i * blockSize)];
                            line[1] = [(j * blockSize), ((i+1) * blockSize)];
                            ctx.beginPath();
                            ctx.moveTo(line[0][0], line[0][1]);
                            ctx.lineTo(line[1][0], line[1][1]);
                            ctx.stroke();
                        }

                        if (withinBounds(i+1, j) && map[i+1][j] === WALL) {
                            line = [];
                            line[0] = [(j * blockSize), ((i+1) * blockSize)];
                            line[1] = [((j+1) * blockSize), ((i+1) * blockSize)];
                            ctx.beginPath();
                            ctx.moveTo(line[0][0], line[0][1]);
                            ctx.lineTo(line[1][0], line[1][1]);
                            ctx.stroke();
                        }
                        if (withinBounds(i, j+1) && map[i][j+1] === WALL) { 
                            line = [];
                            line[0] = [((j+1) * blockSize), (i * blockSize)];
                            line[1] = [((j+1) * blockSize), ((i+1) * blockSize)];
                            ctx.beginPath();
                            ctx.moveTo(line[0][0], line[0][1]);
                            ctx.lineTo(line[1][0], line[1][1]);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        function reset() {
            map = [
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
                [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
                [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
                [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
                [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
                [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
                [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
                [0,0,0,0,1,0,1,0,0,2,0,0,1,0,1,0,0,0,0],
                [2,1,1,1,1,1,1,0,2,2,2,0,1,1,1,1,1,1,2],
                [0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0],
                [2,2,2,0,1,0,1,1,1,1,1,1,1,0,1,0,2,2,2],
                [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0],
                [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,0],
                [0,1,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0],
                [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
                [0,4,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,4,0],
                [0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ];
        }

        function block(pos) {
            return map[pos.y][pos.x];
        }

        function setBlock(pos, type) {
            map[pos.y][pos.x] = type;
        }

        function drawPills(ctx) {

            if (++pillSize > 30) {
                pillSize = 0;
            }

            for (var i = 0; i < height; i += 1) {
                for (var j = 0; j < width; j += 1) {                    
                    if (map[i][j] === PILL) {
                        ctx.beginPath();

                        ctx.fillStyle = "#000";
                        ctx.fillRect((j * blockSize), (i * blockSize), 
                                     blockSize, blockSize);

                        ctx.fillStyle = "#FFF";
                        ctx.arc((j * blockSize) + blockSize / 2,
                                (i * blockSize) + blockSize / 2,
                                Math.abs(5 - (pillSize/3)), 
                                0, 
                                Math.PI * 2, false); 
                        ctx.fill();
                        ctx.closePath();
                    }
                }
            }
        }

        function draw(ctx) {

            var i, j, size = blockSize;

            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width * size, height * size);

            drawWall(ctx);

            for (i = 0; i < height; i += 1) {
                for (j = 0; j < width; j += 1) {
                    drawBlock(i, j, ctx);
                }
            }
        }

        function drawBlock(y, x, ctx) {
            var layout = map[y][x];

            if (layout === BISCUIT) {
                ctx.fillStyle = "#FFF";
                ctx.fillRect((x * blockSize) + (blockSize / 2.5), 
                             (y * blockSize) + (blockSize / 2.5), 
                             blockSize / 6, blockSize / 6);
            }
        }

        return {
            "draw"         : draw,
            "drawBlock"    : drawBlock,
            "drawPills"    : drawPills,
            "block"        : block,
            "setBlock"     : setBlock,
            "reset"        : reset,
            "isWallSpace"  : isWall, 
            "isFloorSpace" : isFloorSpace,
            "height"       : height,
            "width"        : width,
            "blockSize"    : blockSize
        };
    };

}());

(function () {

    "use strict";

    var NONE = 4,
        UP = 1,
        LEFT = 2, 
        DOWN = 4,
        RIGHT = 8,
        WAITING = 5,
        PAUSE = 6,
        PLAYING = 7,
        COUNTDOWN = 8,
        EATEN_PAUSE = 9,
        DYING = 10,
        Modernizr = window.Modernizr;

    PACMAN.ghost = function (ctx, map, blockSize, colour) {

        var position = null,
            direction = null,
            eatable = null,
            eaten = false,
            due = null;

        function getNewCoord(dir, current) {
            var speed = 1;
            return {
                "x": current.x + (dir === LEFT && -speed || dir === RIGHT && speed || 0),
                "y": current.y + (dir === DOWN && speed || dir === UP && -speed || 0)
            };
        }

        function onWholeSquare(x) {
            return x % 10 === 0;
        }

        function oppositeDirection(dir) {
            return dir === LEFT && RIGHT ||
                dir === RIGHT && LEFT ||
                dir === UP && DOWN || UP;
        }

        function makeEatable() {
            direction = oppositeDirection(direction);
            eatable = ctx.createImageData(blockSize, blockSize);
            for (var i = 0; i < eatable.data.length; i += 4) {
                eatable.data[i] = 0x00;
                eatable.data[i+1] = 0x00; 
                eatable.data[i+2] = 0xFF;
                eatable.data[i+3] = 0xFF;
            }
        }

        function reset() {
            eaten = false;
            eatable = null;
            position = {"x": 90, "y": 80};
            direction = LEFT;
            due = LEFT;
        }

        function onGridSquare(pos) {
            return onWholeSquare(pos.y) && onWholeSquare(pos.x);
        }

        function pointToCoord(x) {
            return Math.round(x/10);
        }

        function nextSquare(x, dir) {
            var rem = x % 10;
            if (rem === 0) { 
                return x; 
            } else if (dir === RIGHT || dir === DOWN) { 
                return x + (10 - rem);
            } else {
                return x - rem;
            }
        }

        function next(pos, dir) {
            return {
                "y" : pointToCoord(nextSquare(pos.y, dir)),
                "x" : pointToCoord(nextSquare(pos.x, dir)),
            };                               
        }

        function getRandomDirection() {
            var moves = (direction === LEFT || direction === RIGHT) 
                ? [UP, DOWN] : [LEFT, RIGHT];
            return moves[Math.floor(Math.random() * 2)];
        }

        function move(ctx) {

            var oldPos = position,
                onGrid = onGridSquare(position),
                npos = null;

            if (due !== direction) {

                npos = getNewCoord(due, position);

                if (onGrid &&
                    map.isFloorSpace(next(npos, due))) {
                    direction = due;
                } else {
                    npos = null;
                }
            }

            if (npos === null) {
                npos = getNewCoord(direction, position);
            }

            if (onGrid && map.isWallSpace(next(npos, direction))) {

                due = getRandomDirection();
                return move(ctx);
            }

            position = npos;

            if (position.x === 100 && position.y === 100 && direction === RIGHT) {
                position = {"x": -10, "y": 100};
            }

            if (position.x === -12 && position.y === 100 && direction === LEFT) {
                position = {"x": 190, "y": 100};
            }

            due = getRandomDirection();

            return {
                "new" : position,
                "old" : oldPos
            };
        }

        function pinkMoves() {

            return {
                "new" : position,
                "old" : position
            };
        }

        function draw(ctx) {

            var s = blockSize,
                top = (position.y/10) * s,
                left = (position.x/10) * s;

            if (eatable && eatable.data) {
                ctx.putImageData(eatable, left, top);
            } else {
                ctx.fillStyle = colour;
                ctx.beginPath();
                ctx.arc(left + (s/2), top + (s/2), s/2, 0, Math.PI * 2, true);
                ctx.fill();
            }
        }

        function pinkDraw(ctx) {

            var s = blockSize;

            ctx.fillStyle = colour;
            ctx.fillRect(((position.x-5)/10) * s, 
                         ((position.y-5)/10) * s, s, s);

            ctx.beginPath();
            ctx.fillStyle = colour;
            ctx.arc(((position.x)/10) * s + s/2, 
                    ((position.y)/10) * s + s/2, s/2, 0, Math.PI*2, true);
            ctx.fill();
        }

        function isVulnerable() { 
            return eatable !== null;
        }

        function isDangerous() {
            return eaten === false && eatable === null;
        }

        function eat() {
            eaten = true;
        }

        return {
            "eat"            : eat,
            "isVulnerable"   : isVulnerable,
            "isDangerous"    : isDangerous,
            "makeEatable"    : makeEatable,
            "reset"          : reset,
            "move"           : move,
            "draw"           : draw,
            "eaten"          : eaten
        };
    };

}());

PACMAN.audio = function (root) {

    var files          = [],
        endEvents      = [],
        progressEvents = [],
        playing        = [];

    function load(name, path, cb) {

        var f = files[name] = document.createElement("audio");

        progressEvents[name] = function(event) { progress(event, name, cb); };

        f.addEventListener("canplaythrough", progressEvents[name], true);
        f.setAttribute("preload", "true");
        f.setAttribute("autobuffer", "true");
        f.setAttribute("src", path + "" + name + ".mp3");
        f.pause();
    }

    function progress(event, name, callback) {
        if (callback) {
            callback();
            callback = null;
        }
        files[name].removeEventListener("canplaythrough", 
                                        progressEvents[name], true);
    }

    function disableSound() {
        for (var i = 0; i < playing.length; i++) {
            files[playing[i]].pause();
            files[playing[i]].currentTime = 0;
        }
        playing = [];
    }

    function ended(name) {

        var i, tmp = [], found = false;

        files[name].removeEventListener("ended", endEvents[name], true);

        for (i = 0; i < playing.length; i++) {
            if (!found && playing[i]) {
                found = true;
            } else { 
                tmp.push(playing[i]);
            }
        }
        playing = tmp;
    }

    function play(name) {
        if (!files[name]) {
            return;
        }

        endEvents[name] = function() { ended(name); };
        files[name].addEventListener("ended", endEvents[name], true);
        files[name].currentTime = 0;
        files[name].play();
        playing.push(name);
    }

    function pause() {
        for (var i = 0; i < playing.length; i++) {
            files[playing[i]].pause();
        }
    }

    function resume() {
        for (var i = 0; i < playing.length; i++) {
            files[playing[i]].play();
        }
    }

    return {
        "disableSound" : disableSound,
        "load"         : load,
        "play"         : play,
        "pause"        : pause,
        "resume"       : resume
    };
};

PACMAN.load = function (root, callback) {

    var loaded    = 0,
        audio     = PACMAN.audio(root);

    function finished() {
        loaded++;
        if (loaded === 8) {
            callback(audio);
        }
    }

    function loadAudio(name) {
        audio.load(name, root, finished);
    }

    loadAudio("die");
    loadAudio("eatghost");
    loadAudio("eatpill");  
    loadAudio("eating");
    loadAudio("intermission");
    loadAudio("opening_song");
    loadAudio("siren");
    loadAudio("waza");
};
