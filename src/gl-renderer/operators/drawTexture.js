
import QUAD from "../QUAD.js"
import { loadShader } from "../shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs")

// draw Texture to screen
function drawTexture(regl, {
    texture, 
    outputResolution, 
    exposure=1.0,
    framebuffer=null
}={})
{
    regl({...QUAD,
        framebuffer: framebuffer,
        viewport: {x:0, y:0, width:outputResolution[0], height: outputResolution[1]},
        vert: PASS_THROUGH_VERTEX_SHADER,
        depth: { enable: false },
        uniforms:{
            texture: texture,
            outputResolution: outputResolution,
            exposure: exposure
        },
        frag:`precision mediump float;
        uniform sampler2D texture;
        uniform vec2 outputResolution;
        uniform float exposure;
        void main()
        {   
            vec2 UV = gl_FragCoord.xy/outputResolution;
            vec4 color = texture2D(texture, UV);
            gl_FragColor = color*vec4(exposure, exposure, exposure, 1.0);
        }`
    })();
}

export {drawTexture}