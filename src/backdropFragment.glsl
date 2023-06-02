uniform float uTime;
uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec2 uResolution;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
  float aspect = uResolution.x / uResolution.y;

  float stripe = mod((vUv.y / aspect + uTime / 50.) * 150., 1.);
  stripe = step(0.8, stripe);

  float roughness = floor(30. * uOpacity) + 5.;
  vec2 tuv = floor(vUv * roughness) / roughness;
  tuv.x *= aspect;
  tuv.x -= (aspect - 1.0) / 2.;
  float s = 1. - step(0.5, max(abs(tuv.x - 0.5), abs(tuv.y - 0.5)));
  float diffuse = texture2D(uTexture, tuv).a * s;
  vec3 h = vec3(0.2, 0.2, 0.2) * stripe;
  vec3 color = vec3(0.55, 0.25, 0.) * diffuse * .45 * uOpacity;

  gl_FragColor = vec4(h + color, 1.) * (rand(vUv + uTime / 1000.));
}
