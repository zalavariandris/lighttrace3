import QUAD from "../QUAD.js"
import PASS_THROUGH_VERTEX_SHADER from "../shaders/PASS_THROUGH_VERTEX_SHADER.js"

/**
* Create secondary rays 
* 
* @param {Framebuffer} params.outputFramebuffer - Trget framebuffer to render secondary rays in vec4(pos, dir).
* @param {[Array]} params.outputResolution - Resolution of the output [width, height].
* @param {Texture} params.incidentRaysTexture - Texture containing ray data in vec4(pos, dir).
* @param {Texture} params.hitDataTexture - Texture containing hit data in vec4(pos, normal).
*/
function bounceRays(regl, {
    outputFramebuffer,
    outputResolution,
    incidentRaysTexture,
    hitDataTexture
}){
    regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
        framebuffer: outputFramebuffer,
        uniforms:{
            outputResolution: outputResolution,
            incidentRaysTexture: incidentRaysTexture,
            rayDataResolution: [incidentRaysTexture.width, incidentRaysTexture.height],
            hitDataTexture: hitDataTexture,
            hitDataResolution: [hitDataTexture.width, hitDataTexture.height]
        },
        frag:`precision mediump float;
        uniform vec2 outputResolution;
        uniform sampler2D incidentRaysTexture;
        uniform vec2 rayDataResolution;
        uniform sampler2D hitDataTexture;
        uniform vec2 hitDataResolution;
        void main()
        {

            vec2 rayDir = texture2D(incidentRaysTexture, gl_FragCoord.xy/outputResolution.xy).zw;

            vec4 hitData = texture2D(hitDataTexture, gl_FragCoord.xy/outputResolution.xy);
            vec2 hitNormal = hitData.zw;
            vec2 hitPos = hitData.xy;

            vec2 secondaryDir = reflect(normalize(rayDir), normalize(hitNormal));
            vec2 secondaryPos = hitPos;
            gl_FragColor = vec4(secondaryPos, secondaryDir);
        }`
    })()
}

export {bounceRays}