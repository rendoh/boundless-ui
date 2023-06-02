import 'the-new-css-reset';

import { clock } from './core/clock';
import { renderer } from './core/renderer';
import { sizes } from './core/sizes';
import { Sketch } from './Sketch';

sizes.addEventListener('resize', resize);
clock.addEventListener('tick', update);

const sketch = new Sketch();
renderer.scene.add(sketch.scene);

function resize() {
  sketch.resize();
  renderer.resize();
}

function update() {
  sketch.update();
  renderer.update();
}
