uniform float uTime;
uniform vec2 uResolution;
uniform float uHovered;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  vec2 tuv = vUv * 2. - .5;
  float strength = step(0.25, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
  float diffuse = texture2D(uTexture, tuv).a * (1. - strength);
  vec3 color = vec3(0., .7, 0.);

  vec4 baseColor = vec4(1., 1., 1., .15);
  vec4 iconColor = vec4(color, diffuse);
  vec4 defaultColor = mix(baseColor, iconColor, diffuse);

  vec4 activeBaseColor = vec4(color, uHovered);
  vec4 activeIconColor = vec4(0.);
  vec4 activeColor = mix(activeBaseColor, activeIconColor, diffuse);

  gl_FragColor = mix(defaultColor, activeColor, uHovered);
}
