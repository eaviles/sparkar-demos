import Blocks from 'Blocks';
import Diagnostics from 'Diagnostics';
import Reactive from 'Reactive';
import Scene from 'Scene';
import TouchGestures from 'TouchGestures';

let nullObj;
let planeTracker;
let spheres = [];

async function onLongPressHook(gesture) {
  planeTracker.trackPoint(gesture.location, gesture.state);
  while (spheres.length > 0) {
    const sphere = spheres.pop();
    Scene.destroy(sphere);
  }
}

async function onTapHook(gesture) {
  const { x, y } = gesture.location;
  const tapPoint = Scene.unprojectWithDepth(Reactive.point2d(x, y), 1.0);
  const newSphere = await Blocks.instantiate('sphereBlock');
  newSphere.transform.x = tapPoint.x.pinLastValue();
  newSphere.transform.y = tapPoint.y.pinLastValue();
  newSphere.transform.z = tapPoint.z.pinLastValue();
  nullObj.addChild(newSphere);
  spheres.push(newSphere);
}

async function start() {
  [planeTracker, nullObj] = await Promise.all([
    await Scene.root.findFirst('planeTracker0'),
    await Scene.root.findFirst('nullObject0'),
  ]);
  TouchGestures.onLongPress().subscribe(onLongPressHook);
  TouchGestures.onTap().subscribe(onTapHook);
  Diagnostics.log('initiated.');
}

start();
