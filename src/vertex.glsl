uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uCurvature;
varying vec2 vUv;

float z(float x, float r) {
  return r - sqrt(r * r - x * x);
}

void main() {
  vUv = uv;
  float scale = max(uResolution.x, uResolution.y) / 1280.;
  vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  float d = distance(worldPosition.xy / max(uResolution.x, uResolution.y), vec2(0.)) * uPixelRatio;
  vec3 pos = position;
  pos.z -= z(d * 1000., 600. / max(uCurvature, 0.01)) * uPixelRatio / scale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
