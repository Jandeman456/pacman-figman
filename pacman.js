var PACMAN = (function () {

    var state = WAITING,
        audio = null,
        ghosts = [],
        ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
        eatenCount = 0,
        level = 0,
        tick = 0,
        ghostPos, userPos, 
        stateChanged = true,
        timerStart = null,
        lastTime = 0,
        ctx = null,
        timer = null,
        map = null,
        user = null,
        stored = null;

    var WAITING = 1,
        PLAYING = 2,
        COUNTDOWN = 3,
        EATEN_PAUSE = 4,
        DYING = 5,
        GAME_OVER = 6;

    function getTick() { 
        return tick;
    }

    function drawScore(text, position) {
        ctx.fillStyle = "#FFFF00";
        ctx.font = "12px BDCartoonShoutRegular";
        ctx.fillText(text, 
                     (position["new"]["x"] / 10) * map.blockSize, 
                     ((position["new"]["y"] + 5) / 10) * map.blockSize);
    }

    function dialog(text) {
        ctx.fillStyle = "#FFFF00";
        ctx.font = "14px BDCartoonShoutRegular";
        var width = ctx.measureText(text).width,
            x = ((map.width * map.blockSize) - width) / 2;
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
        if (e.keyCode >= 37 && e.keyCode <= 40) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (state === WAITING && e.keyCode === 83) { // 'S'
            startNewGame();
        } else if (state === WAITING && e.keyCode === 76) { // 'L'
            showLeaderboard();
        } else if (state === PLAYING) {
            user.keyDown(e);
        } else if (state === COUNTDOWN && e.keyCode === 80) { // 'P'
            setState(WAITING);
        }
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
        var topLeft  = (map.height * map.blockSize),
            textBase = topLeft + 17;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, topLeft, (map.width * map.blockSize), 30);

        ctx.fillStyle = "#FFFF00";

        for (var i = 0, len = user.getLives(); i < len; i++) {
            ctx.fillStyle = "#FFFF00";
            ctx.beginPath();
            ctx.moveTo(150 + (25 * i) + map.blockSize / 2,
                       (topLeft + 1) + map.blockSize / 2);

            ctx.arc(150 + (25 * i) + map.blockSize / 2,
                    (topLeft + 1) + map.blockSize / 2,
                    map.blockSize / 2, Math.PI * 0.15, Math.PI * 1.85, false);
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
            if (!ghosts[i].eaten) {
                ghostPos.push(ghosts[i].move(ctx));
            }
        }
        u = user.move(ctx);

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            if (!ghosts[i].eaten) {
                redrawBlock(ghostPos[i].old);
            }
        }
        redrawBlock(u.old);

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            if (!ghosts[i].eaten) {
                ghosts[i].draw(ctx);
            }
        }
        user.draw(ctx);

        userPos = u["new"];

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            if (!ghosts[i].eaten && collided(userPos, ghostPos[i]["new"])) {
                if (ghosts[i].isVunerable()) { 
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

        if (state !== COUNTDOWN) {
            ++tick;
        }

        map.drawPills(ctx);

        if (state === PLAYING) {
            mainDraw();
        } else if (state === WAITING && stateChanged) {            
            stateChanged = false;
            map.draw(ctx);
            dialog("Press S to start a New Game or L for Leaderboard");
        } else if (state === GAME_OVER && stateChanged) {
            stateChanged = false;
            map.draw(ctx);
            dialog("GAME OVER");
        } else if (state === COUNTDOWN) {
            diff = 5 + Math.floor((timerStart - tick) / 60);
            if (diff === 0) {
                map.draw(ctx);
                setState(PLAYING);
            } else {
                if (diff !== lastTime) { 
                    lastTime = diff;
                    map.draw(ctx);
                    dialog("Starting in: " + diff);
                }
            }
        } else if (state === EATEN_PAUSE && 
                   (tick - timerStart) > (Modernizr.audio ? 1000 : 1600)) {
            map.draw(ctx);
            setState(PLAYING);
        } else if (state === DYING) {
            if (tick - timerStart > (Modernizr.audio ? 1000 : 1600)) { 
                loseLife();
            }
        }

        drawFooter();
    }

    function eatenPill() {
        audio.play("eatpill");
        timerStart = tick;
        eatenCount = 0;
        for (i = 0; i < ghosts.length; i += 1) {
            if (!ghosts[i].eaten) {
                ghosts[i].makeEatable(ctx);
            }
        }
    }

    function completedLevel() {
        level += 1;
        
        if (level > 30) {
            // Game won! Save score globally
            saveScoreGlobally();
            setState(WAITING);
            map.draw(ctx);
            dialog("🐶CONGRATULATIONS! YOU BONKED PUMP.FUN OUT OF THE TRENCHES!🐶");
            return;
        }
        
        setState(WAITING);
        map.reset();
        user.newLevel();
        
        // Reset all ghosts for new level
        for (var i = 0; i < ghosts.length; i += 1) {
            ghosts[i].eaten = false;
        }
        
        startLevel();
    }

    function getLevel() {
        return level;
    }

    function saveScoreGlobally() {
        var currentScore = user.theScore();
        var currentLevel = level;
        
        // Save to global Supabase leaderboard
        if (window.saveScoreToLeaderboard) {
            window.saveScoreToLeaderboard(currentScore, currentLevel);
        }
    }

    function keyPress(e) { 
        if (state !== WAITING && state !== GAME_OVER) {
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
        user = PACMAN.user(ctx, map, audio);

        for (i = 0, len = ghostSpecs.length; i < len; i += 1) {
            ghost = PACMAN.ghost(ctx, map, ghostSpecs[i]);
            ghosts.push(ghost);
        }

        map.draw(ctx);
        dialog("Loading ...");

        var extension = Modernizr.audio.ogg ? 'ogg' : 'mp3';

        var audio_files = [
            ["start", root + "audio/opening_song." + extension],
            ["die", root + "audio/die." + extension],
            ["eatghost", root + "audio/eatghost." + extension],
            ["eatpill", root + "audio/eatpill." + extension],
            ["eating", root + "audio/eating.short." + extension],
            ["eating2", root + "audio/eating.short." + extension]
        ];

        load(audio_files, function() { loaded(); });
    }

    function load(arr, callback) {

        if (arr.length === 0) { 
            callback();
            return;
        }

        var x = arr.pop();

        audio.load(x[0], x[1], function() { 
            load(arr, callback);
        });
    }

    function loaded() {

        dialog("Press S to Start");

        document.addEventListener("keydown", keyDown, true);
        document.addEventListener("keypress", keyPress, true); 

        timer = window.setInterval(mainLoop, 1000 / 60);

        document.addEventListener("click", function(e) { 
            if (e.target === canvas) { 
                e.preventDefault();
                e.stopPropagation();
            }
        }, false);
    }

    function showLeaderboard() {
        setState(WAITING);
        map.draw(ctx);
        
        if (window.getGlobalLeaderboard) {
            window.getGlobalLeaderboard().then(function(scores) {
                var leaderboardText = "🏆 GLOBAL LEADERBOARD 🏆\n\n";
                
                if (scores && scores.length > 0) {
                    for (var i = 0; i < Math.min(scores.length, 10); i++) {
                        var rank = i + 1;
                        var score = scores[i].score;
                        var level = scores[i].level;
                        leaderboardText += rank + ". Score: " + score + " (Level " + level + ")\n";
                    }
                } else {
                    leaderboardText += "No scores yet! Be the first to play!";
                }
                
                leaderboardText += "\n\nPress S to start a new game";
                
                // Clear and show leaderboard
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = "#FFFF00";
                ctx.font = "12px BDCartoonShoutRegular";
                
                var lines = leaderboardText.split('\n');
                var lineHeight = 20;
                var startY = 50;
                
                for (var j = 0; j < lines.length; j++) {
                    ctx.fillText(lines[j], 20, startY + (j * lineHeight));
                }
            }).catch(function(error) {
                console.error('Error loading leaderboard:', error);
                dialog("Error loading leaderboard. Press S to start a new game");
            });
        } else {
            dialog("Leaderboard not available. Press S to start a new game");
        }
    }

    return {
        "init" : init,
        "showLeaderboard": showLeaderboard
    };

}());

/* Human readable keyCode index */
var KEY = {'UP': 38, 'DOWN': 40, 'LEFT': 37, 'RIGHT': 39};

/**
 * Returns a function that is restricted to being called no more than every `wait` milliseconds.
 */
function throttle(func, wait) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        if (!timeout) {
            timeout = setTimeout(function() {
                timeout = null;
                func.apply(context, args);
            }, wait);
        }
    };
}

PACMAN.audio = function(root) {

    var files          = {},
        endEvents      = ['ended', 'loadstart'],
        progressEvents = ['loadstart', 'progress', 'canplaythrough', 'loadedmetadata', 'loadeddata'],
        errorEvents    = ['error', 'abort'];

    function isSupported(type) { 
        var elem = document.createElement('audio');
        return !!(elem.canPlayType && elem.canPlayType(type).replace(/no/, ''));
    }

    function trackLoadProgress(audio, callback) { 

        var calledCallback = false;

        function callCallback() { 
            if (!calledCallback) { 
                calledCallback = true;
                callback();
            }
        }

        function errorCallback() { 
            calledCallback = true;
            callback();
        }

        if (audio.readyState > 0) { 
            callCallback();
        }

        audio.addEventListener('canplaythrough', callCallback, false);
        audio.addEventListener('error', errorCallback, false);
    }

    function load(name, path, callback) { 

        if (files[name]) { 
            return files[name];
        }

        var audio = files[name] = document.createElement('audio');

        trackLoadProgress(audio, callback);

        audio.setAttribute('preload', 'true');
        audio.setAttribute('autobuffer', 'true');
        audio.setAttribute('src', path + '?' + new Date().getTime());
        audio.load();

        return audio;
    }

    function play(name) { 
        if (!files[name] || localStorage["soundDisabled"] === "true") { 
            return;
        }

        files[name].currentTime = 0;
        files[name].play();
    }

    return {
        "load" : load,
        "play" : play,
        "disableSound" : function() { 
            localStorage["soundDisabled"] = "true";
        },
        "enableSound" : function() { 
            localStorage["soundDisabled"] = "false";
        }
    };
};

PACMAN.map = function(ctx, blockSize) {

    var height    = null, 
        width     = null, 
        startTime = null,
        level     = null,
        pill      = null,
        map       = null;

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
        ctx.lineWidth   = 5;
        ctx.lineCap     = "round";

        for (i = 0; i < WALLS.length; i += 1) {
            line = WALLS[i];
            ctx.beginPath();

            for (j = 0; j < line.length; j += 1) {

                p = line[j];

                if (p.move) {
                    ctx.moveTo(p.move[0] * blockSize, p.move[1] * blockSize);
                } else if (p.line) {
                    ctx.lineTo(p.line[0] * blockSize, p.line[1] * blockSize);
                } else if (p.curve) { 
                    ctx.quadraticCurveTo(p.curve[0] * blockSize, 
                                         p.curve[1] * blockSize,
                                         p.curve[2] * blockSize, 
                                         p.curve[3] * blockSize);   
                }
            }
            ctx.stroke();
        }
    }

    function reset() {
        map    = Pacman.MAP.clone();
        height = map.length;
        width  = map[0].length;        
    }

    function block(pos) {
        return map[pos.y][pos.x];
    }

    function setBlock(pos, type) {
        map[pos.y][pos.x] = type;
    }

    function drawPills(ctx) {

        if (++pill > 30) {
            pill = 0;
        }

        for (i = 0; i < height; i += 1) {
            for (j = 0; j < width; j += 1) {
                if (map[i][j] === PILL) {
                    ctx.beginPath();

                    ctx.fillStyle = "#000";
                    ctx.fillRect((j * blockSize), (i * blockSize), 
                                 blockSize, blockSize);

                    ctx.fillStyle = "#FFF";
                    ctx.arc((j * blockSize) + blockSize / 2,
                            (i * blockSize) + blockSize / 2,
                            Math.abs(5 - (pill / 3)), 
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

    function isOnSamePlane(y1, y2, tolerance) { 
        return Math.abs(y1 - y2) < tolerance;
    }

    function completedLevel() {
        var dotsRemaining = 0;
        
        for (var i = 0; i < height; i += 1) {
            for (var j = 0; j < width; j += 1) {
                if (map[i][j] === BISCUIT) {
                    dotsRemaining++;
                }
            }
        }
        
        return dotsRemaining === 0;
    }

    reset();

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
        "blockSize"    : blockSize,
        "completedLevel" : completedLevel
    };
};

PACMAN.user = function (ctx, map, audio) {

    var position  = null,
        direction = null,
        eaten     = null,
        due       = null, 
        lives     = null,
        score     = 5,
        keyMap    = {};
    
    keyMap[KEY.ARROW_LEFT]  = LEFT;
    keyMap[KEY.ARROW_UP]    = UP;
    keyMap[KEY.ARROW_RIGHT] = RIGHT;
    keyMap[KEY.ARROW_DOWN]  = DOWN;

    function addScore(nScore) { 
        score += nScore;
        if (score >= 10000 && score - nScore < 10000) { 
            lives += 1;
        }
    }

    function theScore() { 
        return score;
    }

    function getLives() {
        return lives;
    }

    function reset() {
        score = 5;
        lives = 3;
        newLevel();
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

    function loseLife() { 
        lives -= 1;
        if (lives > 0) {
            resetPosition();
        } else {
            // Game over - save score globally
            if (window.saveScoreToLeaderboard) {
                window.saveScoreToLeaderboard(score, PACMAN.getLevel ? PACMAN.getLevel() : 1);
            }
        }
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

        var speed  = 2,
            xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0),
            ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0);

        return {
            "x": current.x + xSpeed,
            "y": current.y + ySpeed
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

        var npos        = null, 
            nextWhole   = null, 
            oldPosition = position,
            block       = null;

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

        if ((isMidSquare(position.y) || isMidSquare(position.x)) &&
            block === BISCUIT || block === PILL) {

            map.setBlock(nextWhole, EMPTY);           
            addScore((block === BISCUIT) ? 10 : 50);
            eaten += 1;

            if (block === PILL) { 
                audio.play("eatpill");
                timerStart = tick;
                eatenCount = 0;
                for (i = 0; i < ghosts.length; i += 1) {
                    if (!ghosts[i].eaten) {
                        ghosts[i].makeEatable(ctx);
                    }
                }
            }

            if (map.completedLevel()) {
                completedLevel();
            }
        }   

        return {
            "new" : position,
            "old" : oldPosition
        };
    }

    function isMidSquare(x) { 
        var rem = x % 10;
        return rem > 3 && rem < 7;
    }

    function calcAngle(dir, pos) { 
        if (dir == RIGHT && (pos.x % 10 < 5)) {
            return {"start":0.1, "end":1.9, "direction": false};
        } else if (dir === DOWN && (pos.y % 10 < 5)) { 
            return {"start":0.6, "end":2.4, "direction": false};
        } else if (dir === UP && (pos.y % 10 < 5)) { 
            return {"start":1.1, "end":2.9, "direction": false};
        } else if (dir === LEFT && (pos.x % 10 < 5)) { 
            return {"start":1.6, "end":3.4, "direction": false};
        }
        return {"start":0, "end":2, "direction": false};
    }

    function drawDead(ctx, amount) { 

        var size = map.blockSize, 
            half = size / 2;

        if (amount >= 1) { 
            return;
        }

        ctx.fillStyle = "#FFFF00";
        ctx.beginPath();
        ctx.moveTo(((position.x/10) * size) + half, 
                   ((position.y/10) * size) + half);

        ctx.arc(((position.x/10) * size) + half, 
                ((position.y/10) * size) + half,
                half, 0, Math.PI * 2 * amount, true); 

        ctx.fill();    
    }

    function draw(ctx) { 

        var s     = map.blockSize, 
            angle = calcAngle(direction, position);

        ctx.fillStyle = "#FFFF00";

        ctx.beginPath();

        ctx.moveTo(((position.x/10) * s) + s / 2,
                   ((position.y/10) * s) + s / 2);

        ctx.arc(((position.x/10) * s) + s / 2,
                ((position.y/10) * s) + s / 2,
                s / 2, Math.PI * angle.start, 
                Math.PI * angle.end, angle.direction); 

        ctx.fill();    
    }

    return {
        "draw"          : draw,
        "drawDead"      : drawDead,
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

PACMAN.ghost = function (ctx, map, colour) {

    var position  = null,
        direction = null,
        eatable   = null,
        eaten     = false,
        due       = null;

    function getNewCoord(dir, current) {

        var speed = isVunerable() ? 1 : isHidden() ? 4 : 2,
            xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0),
            ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0);

        return {
            "x": current.x + xSpeed,
            "y": current.y + ySpeed
        };
    }

    function wrap(pos) { 
        if (pos.x >= 190 && direction === RIGHT) { 
            return {"y": pos.y, "x": -10}; 
        } else if (pos.x <= -12 && direction === LEFT) { 
            return {"y": pos.y, "x": 190}; 
        }
        return pos;
    }

    function oppositeDirection(dir) { 
        return dir === LEFT && RIGHT ||
               dir === RIGHT && LEFT ||
               dir === UP && DOWN || UP;
    }

    function makeEatable(ctx) { 
        direction = oppositeDirection(direction);
        eatable = ctx.tick + 300; 
    }

    function reset() {
        eaten = false;
        position = {"x": 90, "y": 80};
        direction = DOWN;
        eatable = null;
        due = null;
    }

    function onWholeSquare(x) {
        return x % 10 === 0;
    }

    function oppositePosition(dir) { 
        return dir === LEFT && RIGHT ||
               dir === RIGHT && LEFT ||
               dir === UP && DOWN ||
               dir === DOWN && UP;
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

    function getDirection(target) {

        var random = Math.floor(Math.random() * 4),
            direction = NONE,
            directions = [UP, DOWN, LEFT, RIGHT];

        if (random >= 0 && random < directions.length) {
            direction = directions[random];
        }

        if (direction === UP && target.y < position.y) { 
            direction = UP;
        } else if (direction === DOWN && target.y > position.y) { 
            direction = DOWN;
        } else if (direction === LEFT && target.x < position.x) {
            direction = LEFT;
        } else if (direction === RIGHT && target.x > position.x) { 
            direction = RIGHT;
        }

        return direction;
    }

    function isVunerable() { 
        return eatable !== null;
    }

    function isDangerous() {
        return eatable === null;
    }

    function isHidden() { 
        return eatable === null && position.y === 80;
    }

    function getColour() { 
        if (eatable) { 
            if (eatable - ctx.tick > 100) { 
                return "#0000BB";
            } else { 
                return ctx.tick % 20 > 10 ? "#0000BB" : "#FF0000";
            } 
        } else if(eaten) { 
            return "#222";
        }
        return colour;
    }

    function move(ctx) {

        var oldPos = position,
            onGrid = onGridSquare(position),
            npos   = null;

        if (due !== direction) {

            npos = getNewCoord(due, position);

            if (onGrid &&
                map.isFloorSpace({
                    "y":pointToCoord(nextSquare(npos.y, due)), 
                    "x":pointToCoord(nextSquare(npos.x, due))})
               ) {
                direction = due;
            } else {
                npos = null;
            }
        }

        if (npos === null) {
            npos = getNewCoord(direction, position);
        }

        if (onGrid &&
            map.isWallSpace({
                "y" : pointToCoord(nextSquare(npos.y, direction)), 
                "x" : pointToCoord(nextSquare(npos.x, direction))
            })) {

            due = getRandomDirection();
            return move(ctx);
        }

        position = wrap(npos);

        due = getDirection({"x": 90, "y": 80});

        return {
            "new" : position,
            "old" : oldPos
        };
    }

    function pane(pos) {

        if (pos.y === 100 && pos.x >= 190 && direction === RIGHT) {
            return {"y": 100, "x": -10};
        }

        if (pos.y === 100 && pos.x <= -12 && direction === LEFT) {
            return {"y": 100, "x": 190};
        }

        return false;
    }

    function move(ctx) {
        var oldPos = position,
            onGrid = onGridSquare(position),
            npos = null;

        if (due !== direction) {
            npos = getNewCoord(due, position);

            if (onGrid && map.isFloorSpace(next(npos, due))) {
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

        position = wrap(npos);
        due = getDirection({"x": 90, "y": 80});

        return {
            "new" : position,
            "old" : oldPos
        };
    }

    function eat() {
        eatable = null;
        eaten = true;
    }

    function draw(ctx) {

        var s    = map.blockSize,
            top  = (position.y/10) * s,
            left = (position.x/10) * s;

        if (eatable && eatable - ctx.tick <= 100 && (ctx.tick % 10) < 5) { 
            return;
        }

        ctx.fillStyle = getColour();
        ctx.beginPath();

        ctx.moveTo(left, top);
        ctx.lineTo(left + s, top);
        ctx.lineTo(left + s, top + (s/2));
        ctx.lineTo(left + (3*s/4), top + (s/2));
        ctx.lineTo(left + (3*s/4), top + ((s*3)/4));
        ctx.lineTo(left + (s/2), top + (s/2));
        ctx.lineTo(left + (s/4), top + ((s*3)/4));
        ctx.lineTo(left + (s/4), top + (s/2));
        ctx.lineTo(left, top + (s/2));

        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "#FFF";
        ctx.arc(left + (s/3), top + (s/3), s/6, 0, 300, false);
        ctx.arc(left + ((s*2)/3), top + (s/3), s/6, 0, 300, false);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = "#000";
        ctx.arc(left + (s/3), top + (s/3), s/15, 0, 300, false);
        ctx.arc(left + ((s*2)/3), top + (s/3), s/15, 0, 300, false);
        ctx.closePath();
        ctx.fill();

    }

    return {
        "eat"         : eat,
        "isVunerable" : isVunerable,
        "isDangerous" : isDangerous,
        "makeEatable" : makeEatable,
        "reset"       : reset,
        "move"        : move,
        "draw"        : draw,
        "eaten"       : eaten
    };
};

var NONE     = 4,
    UP       = 3,
    LEFT     = 2,
    DOWN     = 1,
    RIGHT    = 11,
    WAITING  = 5,
    PAUSE    = 6,
    PLAYING  = 7,
    COUNTDOWN = 8,
    EATEN_PAUSE = 9,
    DYING = 10,
    GAME_OVER = 11;

var EMPTY    = 0,
    BISCUIT  = 1,
    WALL     = 2,
    PILL     = 3;

var Pacman = {

    "MAP": {

        "width" : 19,
        "height" : 22,
        "map" : [
            [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
            [2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2],
            [2,3,2,2,1,2,2,2,1,2,1,2,2,2,1,2,2,3,2],
            [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
            [2,1,2,2,1,2,1,2,2,2,2,2,1,2,1,2,2,1,2],
            [2,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,2],
            [2,2,2,2,1,2,2,2,0,2,0,2,2,2,1,2,2,2,2],
            [0,0,0,2,1,2,0,0,0,0,0,0,0,2,1,2,0,0,0],
            [2,2,2,2,1,2,0,2,2,0,2,2,0,2,1,2,2,2,2],
            [0,0,0,0,1,0,0,2,0,0,0,2,0,0,1,0,0,0,0],
            [2,2,2,2,1,2,0,2,2,2,2,2,0,2,1,2,2,2,2],
            [0,0,0,2,1,2,0,0,0,0,0,0,0,2,1,2,0,0,0],
            [2,2,2,2,1,2,2,2,0,2,0,2,2,2,1,2,2,2,2],
            [2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2],
            [2,1,2,2,1,2,2,2,1,2,1,2,2,2,1,2,2,1,2],
            [2,3,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,3,2],
            [2,2,1,2,1,2,1,2,2,2,2,2,1,2,1,2,1,2,2],
            [2,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,2],
            [2,1,2,2,2,2,2,2,1,2,1,2,2,2,2,2,2,1,2],
            [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
            [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
        ],

        "clone" : function () { 
            return this.map.slice();
        }
    }
};

var WALLS = [

    [{"move": [0, 9.5]}, {"line": [3, 9.5]}],
    [{"move": [5, 9.5]}, {"line": [14, 9.5]}],
    [{"move": [16, 9.5]}, {"line": [19, 9.5]}],

    [{"move": [0, 8.5]}, {"line": [3, 8.5]}],
    [{"move": [5, 8.5]}, {"line": [14, 8.5]}],
    [{"move": [16, 8.5]}, {"line": [19, 8.5]}],

    [{"move": [0, 11.5]}, {"line": [3, 11.5]}],
    [{"move": [5, 11.5]}, {"line": [14, 11.5]}],
    [{"move": [16, 11.5]}, {"line": [19, 11.5]}],

    [{"move": [0, 12.5]}, {"line": [3, 12.5]}],
    [{"move": [5, 12.5]}, {"line": [14, 12.5]}],
    [{"move": [16, 12.5]}, {"line": [19, 12.5]}],

    [{"move": [3, 7.5]}, {"line": [3, 9]}],
    [{"move": [15, 7.5]}, {"line": [15, 9]}],

    [{"move": [3, 11]}, {"line": [3, 12.5]}],
    [{"move": [15, 11]}, {"line": [15, 12.5]}],

    [{"move": [0, 4.5]}, {"line": [3, 4.5]}],
    [{"move": [5, 4.5]}, {"line": [7.5, 4.5]}],
    [{"move": [11.5, 4.5]}, {"line": [14, 4.5]}],
    [{"move": [16, 4.5]}, {"line": [19, 4.5]}],

    [{"move": [0, 6.5]}, {"line": [3, 6.5]}],
    [{"move": [5, 6.5]}, {"line": [7.5, 6.5]}],
    [{"move": [11.5, 6.5]}, {"line": [14, 6.5]}],
    [{"move": [16, 6.5]}, {"line": [19, 6.5]}],

    [{"move": [3, 4.5]}, {"line": [3, 6.5]}],
    [{"move": [15, 4.5]}, {"line": [15, 6.5]}],

    [{"move": [0, 13.5]}, {"line": [3, 13.5]}],
    [{"move": [5, 13.5]}, {"line": [7.5, 13.5]}],
    [{"move": [11.5, 13.5]}, {"line": [14, 13.5]}],
    [{"move": [16, 13.5]}, {"line": [19, 13.5]}],

    [{"move": [0, 15.5]}, {"line": [3, 15.5]}],
    [{"move": [5, 15.5]}, {"line": [7.5, 15.5]}],
    [{"move": [11.5, 15.5]}, {"line": [14, 15.5]}],
    [{"move": [16, 15.5]}, {"line": [19, 15.5]}],

    [{"move": [3, 13.5]}, {"line": [3, 15.5]}],
    [{"move": [15, 13.5]}, {"line": [15, 15.5]}],

    [{"move": [0, 16.5]}, {"line": [7.5, 16.5]}],
    [{"move": [11.5, 16.5]}, {"line": [19, 16.5]}],

    [{"move": [0, 18.5]}, {"line": [7.5, 18.5]}],
    [{"move": [11.5, 18.5]}, {"line": [19, 18.5]}],

    [{"move": [7.5, 13.5]}, {"line": [7.5, 16.5]}],
    [{"move": [11.5, 13.5]}, {"line": [11.5, 16.5]}],

    [{"move": [0, 19.5]}, {"line": [3, 19.5]}],
    [{"move": [5, 19.5]}, {"line": [14, 19.5]}],
    [{"move": [16, 19.5]}, {"line": [19, 19.5]}],

    [{"move": [0, 20.5]}, {"line": [3, 20.5]}],
    [{"move": [5, 20.5]}, {"line": [14, 20.5]}],
    [{"move": [16, 20.5]}, {"line": [19, 20.5]}],

    [{"move": [3, 19.5]}, {"line": [3, 20.5]}],
    [{"move": [15, 19.5]}, {"line": [15, 20.5]}],

    [{"move": [0, 0.5]}, {"line": [19, 0.5]}],
    [{"move": [0, 1.5]}, {"line": [19, 1.5]}],
    [{"move": [0, 0.5]}, {"line": [0, 1.5]}],
    [{"move": [19, 0.5]}, {"line": [19, 1.5]}],

    [{"move": [2, 3.5]}, {"line": [4, 3.5]}],
    [{"move": [15, 3.5]}, {"line": [17, 3.5]}],
    [{"move": [2, 2.5]}, {"line": [4, 2.5]}],
    [{"move": [15, 2.5]}, {"line": [17, 2.5]}],

    [{"move": [2, 2.5]}, {"line": [2, 3.5]}],
    [{"move": [4, 2.5]}, {"line": [4, 3.5]}],
    [{"move": [15, 2.5]}, {"line": [15, 3.5]}],
    [{"move": [17, 2.5]}, {"line": [17, 3.5]}],

    [{"move": [1, 0.5]}, {"line": [1, 1.5]}],
    [{"move": [18, 0.5]}, {"line": [18, 1.5]}]

];