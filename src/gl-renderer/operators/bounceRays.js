import QUAD from "../QUAD.js"
// import PASS_THROUGH_VERTEX_SHADER from "../shaders/PASS_THROUGH_VERTEX_SHADER.js"
import { loadShader } from "../shaders/load-shader.js"
/**
* Create secondary rays 
* 
* @param {Framebuffer} params.outputFramebuffer - Trget framebuffer to render secondary rays in vec4(pos, dir).
* @param {[Array]} params.outputResolution - Resolution of the output [width, height].
* @param {Texture} params.incidentRaysTexture - Texture containing ray data in vec4(pos, dir).
* @param {Texture} params.hitDataTexture - Texture containing hit data in vec4(pos, normal).
*/


const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs")

function bounceRays(regl, {
    outputFramebuffer,
    outputResolution,
    incidentRaysTexture,
    incidentLightDataTexture,
    hitDataTexture
}){
    regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
        framebuffer: outputFramebuffer,
        uniforms:{
            outputResolution: outputResolution,
            incidentRaysTexture: incidentRaysTexture,
            rayDataResolution: [incidentRaysTexture.width, incidentRaysTexture.height],
            incidentLightsTexture: incidentLightDataTexture,
            hitDataTexture: hitDataTexture,
            hitDataResolution: [hitDataTexture.width, hitDataTexture.height]
        },
        frag:`precision mediump float;
        uniform vec2 outputResolution;
        uniform sampler2D incidentRaysTexture;
        uniform sampler2D incidentLightsTexture;
        uniform vec2 rayDataResolution;
        uniform sampler2D hitDataTexture;
        uniform vec2 hitDataResolution;

        vec2 sampleMirror(vec2 V, vec2 N)
        {
            return reflect(V, N);
        }

        float sellmeierIor(vec3 b, vec3 c, float lambda)
        {
            // Calculate the square of the wavelength
            float lSq = (lambda * 1e-3) * (lambda * 1e-3);

            // Calculate the contribution of each Sellmeier term and sum them up
            float sum = 0.0;
            sum += (b.x * lSq) / (lSq - c.x);
            sum += (b.y * lSq) / (lSq - c.y);
            sum += (b.z * lSq) / (lSq - c.z);

            // Add 1.0 to the sum to get the refractive index squared
            return 1.0 + sum;
        }

        vec2 sampleTransparent(vec2 V, vec2 N, float ior)
        {
         
            float cosI = -dot(V, N); // Corrected to ensure cosI is always positive
            
            float refractiveIndexRatio = cosI < 0.0 ? ior : 1.0 / ior; // Adjust ratio based on entering or exiting
        
            // Corrected to flip the normal vector when exiting
            vec2 normal = cosI < 0.0 ? -N : N;
            cosI = abs(cosI); // cosI should be positive after adjustment
        
            float sinT2 = refractiveIndexRatio * refractiveIndexRatio * (1.0 - cosI * cosI);
            if (sinT2 > 1.0) {
                // angle is greater the the critical angle.
                // Total internal reflection
                vec2 exitVector = reflect(V, normal);
                return exitVector;
            } else {
                float cosT = sqrt(1.0 - sinT2);
                // Corrected formula for exit vector
                vec2 exitVector = V*refractiveIndexRatio + normal*(refractiveIndexRatio * cosI - cosT);
                return exitVector;
            }
        }

        void main()
        {
            vec2 rayDir = texture2D(incidentRaysTexture, gl_FragCoord.xy/outputResolution.xy).zw;
            vec4 hitData = texture2D(hitDataTexture, gl_FragCoord.xy/outputResolution.xy);
            vec2 hitNormal = hitData.zw;
            vec2 hitPos = hitData.xy;
            float wavelength = texture2D(incidentLightsTexture, gl_FragCoord.xy/outputResolution.xy).r;


            // vec2 secondaryDir = sampleMirror(rayDir, hitNormal);
            vec3 b = vec3(1.6215, 0.2563, 1.6445);
            vec3 c = vec3(0.0122, 0.0596, 147.4688);
            float dispersiveIor =  sellmeierIor(b, c, wavelength)/1.44;
            vec2 secondaryDir = sampleTransparent(rayDir, hitNormal, dispersiveIor);
            vec2 secondaryPos = hitPos;
            gl_FragColor = vec4(secondaryPos, secondaryDir);
        }`
    })()
}

export {bounceRays}