import Blocks from 'Blocks';
import cannon from 'cannon';
import Diagnostics from 'Diagnostics';
import Reactive from 'Reactive';
import Scene from 'Scene';
import Time from 'Time';
import TouchGestures from 'TouchGestures';

let nullObj;
let planeTracker;
let spheres = [];
let world;
let lastTime;
let ground;

function resetGround(data) {
  const { planeX, planeY, planeZ } = data;
  if (ground) world.removeBody(ground);
  ground = new cannon.Body({
    mass: 0,
    position: new cannon.Vec3(0, 0, planeZ * 2),
    shape: new cannon.Plane(),
  });
  Diagnostics.log(`ground: ${planeX}, ${planeY}, ${planeZ}`);
  world.addBody(ground);
}

function onLongPressCallbackDelayed(_, data) {
  resetGround(data);
}

function getPlaneTrackerSnapshot() {
  return {
    planeX: planeTracker.worldTransform.x,
    planeY: planeTracker.worldTransform.y,
    planeZ: planeTracker.worldTransform.z,
  };
}

async function onLongPressCallback(gesture) {
  planeTracker.trackPoint(gesture.location, gesture.state);
  while (spheres.length > 0) {
    const { instance, body } = spheres.pop();
    if (cannon) world.removeBody(body);
    Scene.destroy(instance);
  }
  if (cannon) {
    const snapshot = getPlaneTrackerSnapshot();
    Time.setTimeoutWithSnapshot(snapshot, onLongPressCallbackDelayed, 0);
  }
}

async function onTapCallbackDelayed(_time, data) {
  const { tapX, tapY, tapZ } = data;
  const instance = await Blocks.instantiate('sphereBlock');
  instance.transform.x = tapX;
  instance.transform.y = tapY;
  instance.transform.z = tapZ;
  nullObj.addChild(instance);

  let body;
  if (cannon) {
    body = new cannon.Body({
      mass: 1,
      position: new cannon.Vec3(tapX, tapY, tapZ),
      shape: new cannon.Sphere(0.0275),
    });
    world.addBody(body);
  }
  spheres.push({ instance, body });
}

async function onTapCallback(gesture) {
  const tapPoint = Scene.unprojectToFocalPlane(
    Reactive.point2d(gesture.location.x, gesture.location.y)
  );
  const snapshot = {
    tapX: tapPoint.x,
    tapY: tapPoint.y,
    tapZ: tapPoint.z,
  };
  Time.setTimeoutWithSnapshot(snapshot, onTapCallbackDelayed, 0);
}

function onTimeCallback(time) {
  if (lastTime != undefined) {
    for (let i = 0; i < spheres.length; i += 1) {
      const { instance, body } = spheres[i];
      instance.transform.x = body.position.x;
      instance.transform.y = body.position.y;
      instance.transform.z = body.position.z;
    }
    const dt = (time - lastTime) / 1000;
    world.step(1 / 60, dt, 3);
  }
  lastTime = time;
}

function initPhysicsDelayed(_, data) {
  resetGround(data);
  Time.setInterval(onTimeCallback, 30);
}

function initPhysics() {
  world = new cannon.World();

  world.gravity.set(0, 0, -2);
  world.broadphase = new cannon.NaiveBroadphase();
  world.solver.iterations = 5;
  world.defaultContactMaterial.contactEquationStiffness = 5e6;
  world.defaultContactMaterial.contactEquationRelaxation = 10;
  world.quatNormalizeFast = true;
  world.quatNormalizeSkip = 3;

  const snapshot = getPlaneTrackerSnapshot();
  Time.setTimeoutWithSnapshot(snapshot, initPhysicsDelayed, 0);
}

async function start() {
  [planeTracker, nullObj] = await Promise.all([
    await Scene.root.findFirst('planeTracker0'),
    await Scene.root.findFirst('nullObject0'),
  ]);
  TouchGestures.onLongPress().subscribe(onLongPressCallback);
  TouchGestures.onTap().subscribe(onTapCallback);
  if (cannon) initPhysics();
  Diagnostics.log('initiated.');
}

start();
