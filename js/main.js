// modified timer for phases
let Timer = function(callback, delay) {
    let timerId, start, remaining = delay;
  
    // pause method
    this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= Date.now() - start;
    };
  
    // resume method
    this.resume = function() {
        start = Date.now();
        window.clearTimeout(timerId);
        timerId = window.setTimeout(callback, remaining);
    };

    // delete timer method
    this.clear = function() {
        clearTimeout(timerId);
    }
  
    this.resume();
  };

// useful to have them as global variables
let canvas, ctx, w, h; 

// default game options
const defaultGameOptions = {
    snowGoodKindChance: 95,
    monstersMinLoosingCount: 1,
    monstersMaxLoosingCount: 2,
}

// game data
const game = {
    // objects
    remainsObjects: [],
    loosedObjects: [],
    snowballs: [],

    // game images
    heartImage: "images/heart.png",
    giftImage: "images/gift.png",

    // timers
    objectsLoosingTimer: undefined,
    phaseTimer: undefined,
    phasePrepearingTime: 3000,

    // game bars
    bars: {
        phaseBar: "phase-bar",
        levelBar: "level-bar",
        giftBar: "gift-bar",
        lifeBar: "life-bar",
        middleScreenText: "middle-screen-text",
        snowflakesCount: "snowflakes-count"
    },

    // objects kinds
    kinds: {
        good: "good",
        bad: "bad"
    },

    // game statuses
    statuses: {
        prepearing: "prepearing",
        loosed: "loosed",
        playing: "playing",
        paused: "paused"
    },

    // other
    loopStatus: true,
    animationFrame: undefined,
    phase: 1,
    level: 1,
    status: "prepearing"
}

// snow data
const snow = {
    type: "snow",
    color: "white",
    icicleImage: "images/icicle.png",
    
    // snow properties
    minLoosingCount: 7,
    maxLoosingCount: 12,
    minRadius: 8,
    maxRadius: 15,

    goodKindChance: defaultGameOptions.snowGoodKindChance,
    requiredCount: 20,
    loosingInterval: 500,
    phaseTime: 30000,

    // next phase data
    nextObjects: undefined
}

// monsters data
const monsters = {
    type: "monsters",
    images: {
        redMonster: "images/redMonster.png",
        blueMonster: "images/blueMonster.png",
        purpleMonster: "images/purpleMonster.png"
    },

    // properties
    minLoosingCount: defaultGameOptions.monstersMinLoosingCount,
    maxLoosingCount: defaultGameOptions.monstersMaxLoosingCount,
    minRadius: 40,
    maxRadius: 40,

    loosingInterval: 4000,
    requiredCount: 6,
    phaseTime: 60000,

    // next phase data
    nextPhaseObjects: undefined
}

// snowball data
const snowball = {
    type: "snowball",
    radius: 15,
    normalSpeed: 10,
    color: "rgb(122, 206, 245)"
}

// player data
let player = {
    x: null,
    y: null,
    width: 40,
    height: 170,
    speed: 25,
    image: "images/player.png",
    collectedSnowCount: 0,
    health: 3,
    gifts: 3
}

// keys
const keys = {
    leftMove: "a",
    rightMove: "d",
}

// initialize event
window.onload = function init() {
    // called AFTER the page has been loaded
    document.getElementById("middle-screen-text").style.visibility = "hidden";

    // getting canvas element
    canvas = document.querySelector("#myCanvas");
    
    // often useful
    w = canvas.width; 
    h = canvas.height; 
    
    // setting player coordinates
    player.x = w / 2 - player.width;
    player.y = h - player.height;
    
    // important, we will draw with this object
    ctx = canvas.getContext('2d');
  
    // add a keyboard event listener to the document
    document.addEventListener("keydown", event => {
        // left move event
        if(event.key === keys.leftMove) {
            if(game.loopStatus) {
                if(player.x - player.speed > canvas.getBoundingClientRect().x) {
                    player.x -= player.speed;
                }
            }
        }
        // right move event
        else if(event.key === keys.rightMove) {
            if(game.loopStatus) {
                if(player.x + player.speed < canvas.getBoundingClientRect().x + canvas.getBoundingClientRect().width - 80) {
                    player.x += player.speed;
                }
            }
        }
        // pause event
        else if(event.key === "Escape") {
            if(game.status !== game.statuses.prepearing && game.status !== game.statuses.loosed) {
                changePhaseExecutingStatus();
                putText("Pause");
                changeTextVisibility();
            }
        }
    });

    // mouse button down event
    document.addEventListener("mousedown", event => {
        if(event.button === 0 && game.status === game.statuses.playing && player.collectedSnowCount > 0) {
            // changing collected snow
            player.collectedSnowCount--;
            changeCollectedSnowCount();

            // creating new snowball
            let snowball = createSnowball(event.clientX, event.clientY);
            game.snowballs.push(snowball);
        }
    });

    // pushing links for the objects
    snow.nextPhaseObjects = monsters;
    monsters.nextPhaseObjects = snow;
    
    // executing first game phase
    executeFirstPhase();
};

// game main loop
function mainLoop() {
    if(game.loopStatus) {
        // 1 - clear the canvas
        ctx.clearRect(0, 0, w, h);
        
        // draw the ball and the player
        drawPlayer();
        drawAllObjects(game.loosedObjects);

        // animate the ball that is bouncing all over the walls
        moveAllObjects(game.loosedObjects);

        // draw and move smowballs
        drawAllSnowballs(game.snowballs);
        moveAllSnowballs();

        // ask for a new animation frame
        if(game.status !== game.statuses.loosed) {
            game.animationFrame = requestAnimationFrame(mainLoop);
        }
    }
}

// first phase executing
function executeFirstPhase() {
    putText("Level " + game.level);
    changeTextVisibility();

    setTimeout(function() {
        executePhase(snow);
    }, game.phasePrepearingTime)
}

// executing game phase
function executePhase(objects) {
    // executing new phase
    startPhase();

    // adding phase timer
    game.phaseTimer = new Timer(function() {
        cancelAnimationFrame(game.animationFrame);
        clearInterval(game.objectsLoosingTimer);

        // clearing all game arrays of objects
        game.remainsObjects = [];
        game.loosedObjects = [];
        game.snowballs = [];
        
        // ending phase
        endPhase();

        // timer for the next phase executing
        setTimeout(function() {
            executePhase(objects.nextPhaseObjects);
        }, game.phasePrepearingTime);
    }, objects.phaseTime);
    
    // refilling empty arrays and loosing there elements
    game.remainsObjects = refillObjects(objects.requiredCount, objects.type, objects);
    looseAndRefill(objects);

    // loosing objects interval
    game.objectsLoosingTimer = setInterval(function() {
        if(game.loopStatus) {
            looseAndRefill(objects);
        }
    }, objects.loosingInterval);

    // requesting new animation frame
    game.animationFrame = requestAnimationFrame(mainLoop);
}