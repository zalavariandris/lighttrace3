import QUAD from "../QUAD.js"
// import PASS_THROUGH_VERTEX_SHADER from "../shaders/PASS_THROUGH_VERTEX_SHADER.js"
import { loadShader } from "../shaders/load-shader.js"

const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs")

/**
* Convert wavelength to RGB color
* 
* @param {Framebuffer} params.outputFramebuffer - Trget framebuffer to render secondary rays in vec4(pos, dir).
* @param {[Array]} params.outputResolution - Resolution of the output [width, height].
* @param {Texture} params.wavelengthTexture - Texture containing ray data in vec4(pos, dir).
* @param {Texture} params.spectrum - Texture containing spectral colors
*/
function wavelengthToColor(regl, {
    outputFramebuffer,
    outputResolution,
    lightDataTexture,
    spectralTexture,
}){
    regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
        framebuffer: outputFramebuffer,
        uniforms:{
            outputResolution: outputResolution,
            lightDataTexture: lightDataTexture,
            lightDataResolution: [lightDataTexture.width, lightDataTexture.height],
            spectralTexture: spectralTexture
        },
        frag:`precision mediump float;
        uniform vec2 outputResolution;
        uniform sampler2D lightDataTexture;
        uniform vec2 lightDataResolution;
        uniform sampler2D spectralTexture;

        vec3 hsv2rgb(vec3 c)
        {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        void main()
        {
            float wavelength = texture2D(lightDataTexture, gl_FragCoord.xy/outputResolution.xy).r;
            float intensity = texture2D(lightDataTexture, gl_FragCoord.xy/outputResolution.xy).a;

            // normalize wavelength to visible color range aprox. [400-700]
            float t = (wavelength-400.0)/300.0;
            
            vec4 spectralColor = texture2D(spectralTexture, vec2(t, 0.5)).rgba * vec4(1.0,1.0,1.0, 50.0*intensity);
            vec4 hueColor = vec4(hsv2rgb(vec3(t, 1.0, 1.0)), 50.0*intensity);
            vec4 whiteColor = vec4(1.0, 1.0, 1.0,1.0);

            gl_FragColor = whiteColor;
        }`
    })()
}

export {wavelengthToColor}