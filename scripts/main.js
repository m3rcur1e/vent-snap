const cur1e = require("cur1e-shared");

const PREF_ON = "ventsnap-enabled";
const PREF_RADIUS = "ventsnap-radius";
const RADIUS_DEFAULT = 6, RADIUS_MIN = 2, RADIUS_MAX = 10;
const REFRESH = 20;
const GRID_PROP = "factorio-tweaks.grid-snap";

let appliedX = 0, appliedY = 0;
let keyFirst = null, keySize = 0;
let target = null;
let single = null;
let frame = 0;

function enabled(){
    return Core.settings.getBool(PREF_ON, true);
}

function radius(){
    return Mathf.clamp(Core.settings.getInt(PREF_RADIUS, RADIUS_DEFAULT), RADIUS_MIN, RADIUS_MAX);
}

function desktop(){
    const inp = Vars.control.input;
    return (inp instanceof DesktopInput) && Vars.state.isGame() ? inp : null;
}

function ventBlock(b){
    if(b == null || b.size != 3) return false;
    if(!(b instanceof ThermalGenerator || b instanceof AttributeCrafter)) return false;
    return b.attribute == Attribute.steam;
}

let sums = {}, sumCount = 0;
function steamAt(block, x, y){
    const k = x * 8192 + y;
    let v = sums[k];
    if(v === undefined){
        if(sumCount > 40000){
            sums = {};
            sumCount = 0;
        }
        v = block.sumAttribute(Attribute.steam, x, y);
        sums[k] = v;
        sumCount++;
    }
    return v;
}
Events.on(WorldLoadEvent, () => {
    sums = {};
    sumCount = 0;
});

function needOf(block){
    if(block instanceof ThermalGenerator) return block.minEfficiency + 0.0001;
    return block.minEfficiency - block.baseEfficiency - 0.0001;
}

function snapSpot(block, cx, cy, r){
    const need = Math.max(needOf(block), 0.0001);
    const team = Vars.player.team();
    let bx = 0, by = 0, found = false, bestSum = 0, bestD = 1e9;
    for(let x = cx - r; x <= cx + r; x++){
        for(let y = cy - r; y <= cy + r; y++){
            let d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if(d > r * r) continue;
            let sum = steamAt(block, x, y);
            if(sum < need || sum < bestSum - 0.001 || (Math.abs(sum - bestSum) <= 0.001 && d >= bestD)) continue;
            if(!placeOk(block, team, x, y)) continue;
            bx = x;
            by = y;
            found = true;
            bestSum = sum;
            bestD = d;
        }
    }
    return found ? {x: bx, y: by} : null;
}

let cBlock = null, cX = 0, cY = 0, cR = 0, cFrame = 0, cSpot = null;
function spotFor(block, cx, cy){
    const r = radius();
    if(block == cBlock && cx == cX && cy == cY && r == cR && frame - cFrame < REFRESH) return cSpot;
    cSpot = snapSpot(block, cx, cy, r);
    cBlock = block;
    cX = cx;
    cY = cy;
    cR = r;
    cFrame = frame;
    return cSpot;
}

function sameBuilt(block, team, x, y){
    const tile = Vars.world.tile(x, y);
    const b = tile == null ? null : tile.build;
    if(b == null || (typeof b.team === "function" ? b.team() : b.team) != team || b.tile != tile) return false;
    if(b.block == block) return true;
    return (b instanceof ConstructBlock.ConstructBuild) && b.current == block;
}

function placeOk(block, team, x, y){
    return Build.validPlace(block, team, x, y, 0) || sameBuilt(block, team, x, y);
}

function sameHand(plans){
    return keyFirst != null && !plans.isEmpty() && plans.first() == keyFirst && plans.size == keySize;
}

function takeHand(plans){
    keyFirst = plans.first();
    keySize = plans.size;
    appliedX = 0;
    appliedY = 0;
    target = null;
    let count = 0;
    for(let i = 0; i < plans.size; i++){
        let p = plans.get(i);
        if(!p.breaking && ventBlock(p.block)){
            target = p;
            count++;
        }
    }
    if(count != 1) target = null;
}

function forget(){
    keyFirst = null;
    keySize = 0;
    target = null;
    appliedX = 0;
    appliedY = 0;
}

function shift(plans, dx, dy){
    if(dx == 0 && dy == 0) return;
    for(let i = 0; i < plans.size; i++){
        let p = plans.get(i);
        p.x += dx;
        p.y += dy;
    }
}

function unsnap(inp){
    if(sameHand(inp.selectPlans)) shift(inp.selectPlans, -appliedX, -appliedY);
    appliedX = 0;
    appliedY = 0;
}

function releaseSingle(inp){
    if(single == null) return;
    const b = single;
    single = null;
    inp.selectPlans.clear();
    inp.lastSchematic = null;
    inp.block = b;
    forget();
}

function standDown(inp){
    if(single != null) releaseSingle(inp);
    else unsnap(inp);
    forget();
}

function update(){
    const ci = Vars.control.input;
    if(single == null && keyFirst == null && ci.block == null && ci.selectPlans.isEmpty()){
        if(cBlock != null) cBlock = null;
        return;
    }
    frame++;

    const inp = desktop();
    if(inp == null){
        single = null;
        forget();
        return;
    }
    if(!enabled()){
        standDown(inp);
        return;
    }
    const plans = inp.selectPlans;

    if(single != null && (inp.block != null || !sameHand(plans))) single = null;

    if(single == null && inp.block != null){
        if(!ventBlock(inp.block) || !plans.isEmpty() || inp.mode != PlaceMode.none) return;
        const mw = Core.input.mouseWorld();
        const cx = World.toTile(mw.x), cy = World.toTile(mw.y);
        if(spotFor(inp.block, cx, cy) == null) return;
        single = inp.block;
        inp.block = null;
        plans.add(new BuildPlan(cx, cy, 0, single, single.lastConfig));
        inp.schematicX = cx;
        inp.schematicY = cy;
    }

    if(plans.isEmpty()){
        forget();
        return;
    }
    if(!sameHand(plans)) takeHand(plans);

    if(target == null || java.lang.System.getProperty(GRID_PROP) == "1"){
        shift(plans, -appliedX, -appliedY);
        appliedX = 0;
        appliedY = 0;
        if(target == null && single != null) releaseSingle(inp);
        return;
    }

    const mw = Core.input.mouseWorld();
    const vent = spotFor(target.block, World.toTile(mw.x), World.toTile(mw.y));
    if(vent == null && single != null){
        releaseSingle(inp);
        return;
    }
    let nx = 0, ny = 0;
    if(vent != null){
        nx = vent.x - (target.x - appliedX);
        ny = vent.y - (target.y - appliedY);
    }
    shift(plans, nx - appliedX, ny - appliedY);
    appliedX = nx;
    appliedY = ny;
}

function guarded(fn){
    try{
        fn();
    }catch(e){
        Log.err("[vent-snap] " + e);
    }
}

Events.run(Trigger.preDraw, () => {
    try{
        update();
    }catch(e){
        Log.err("[vent-snap] " + e);
    }
});

let rotateKey = null, rotateGen = 0;
function suppressQuickRotate(){
    const b = Binding.rotatePlaced;
    if(rotateKey == null){
        if(b.value.key == KeyCode.unset) return;
        rotateKey = b.value.key;
        b.value.key = KeyCode.unset;
    }
    const gen = ++rotateGen;
    Core.app.post(() => Core.app.post(() => {
        if(gen != rotateGen || rotateKey == null) return;
        b.value.key = rotateKey;
        rotateKey = null;
    }));
}

function beforeInput(){
    if(keyFirst == null) return;
    const inp = desktop();
    if(inp == null || !enabled()) return;
    unsnap(inp);
    if(!inp.selectPlans.isEmpty()) suppressQuickRotate();
}

function press(){
    const inp = desktop();
    if(inp == null || !enabled() || Core.scene.hasMouse() || Core.scene.hasField()) return;
    if(java.lang.System.getProperty(GRID_PROP) == "1") return;
    if(!inp.selectPlans.isEmpty()){
        unsnap(inp);
        const mw = Core.input.mouseWorld();
        const cx = World.toTile(mw.x), cy = World.toTile(mw.y);
        shift(inp.selectPlans, cx - inp.schematicX, cy - inp.schematicY);
        inp.schematicX = cx;
        inp.schematicY = cy;
    }
    cBlock = null;
    update();
}

Core.input.addProcessor(extend(InputProcessor, {
    keyDown(key){
        guarded(beforeInput);
        return false;
    },
    scrolled(ax, ay){
        guarded(beforeInput);
        return false;
    }
}));

Core.input.getInputProcessors().insert(0, extend(InputProcessor, {
    touchDown(screenX, screenY, pointer, button){
        guarded(() => {
            if(button == Binding.select.value.key) press();
            else beforeInput();
        });
        return false;
    }
}));

cur1e.settings({mod: "vent-snap", title: "vent-snap.settings.title", icon: "power", build: t => {
    t.checkPref(PREF_ON, true);
    t.sliderPref(PREF_RADIUS, RADIUS_DEFAULT, RADIUS_MIN, RADIUS_MAX, 1, v => v + "");
}});

Log.info("[vent-snap] loaded");
