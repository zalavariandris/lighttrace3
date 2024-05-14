import QUAD from "../QUAD.js"
import PASS_THROUGH_VERTEX_SHADER from "../shaders/PASS_THROUGH_VERTEX_SHADER.js"

/**
 * Intersect rays with an sdf
 * @param {FBO} framebuffer - The OUTPUT framebuffer to render HitPoint as data vec4(pos, normal)
 * @param {Texture} rayDataTexture - Rays encoded into a texture as data vec4(pos.xy, dir.xy)
 * @param {Texture} sdfTexture - The scene encoded to a signed distance field.
 */
function intersectRaysWithSDF(regl, {
    framebuffer, 
    outputResolution,
    rayDataTexture, 
    sdfTexture,
})
{
    regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
        framebuffer: framebuffer,
        uniforms:{
            outputResolution: outputResolution,
            rayDataTexture: rayDataTexture,
            rayDataResolution: [rayDataTexture.width, rayDataTexture.height],
            sdfTexture: sdfTexture,
            sdfResolution: [sdfTexture.width, sdfTexture.height]
        },
        frag:`precision mediump float;
        uniform sampler2D rayDataTexture;
        uniform vec2 rayDataResolution;
        uniform sampler2D sdfTexture;
        uniform vec2 sdfResolution;
        uniform vec2 outputResolution;

        #define MAX_RAYMARCH_STEPS 30
        #define MIN_HIT_DISTANCE 1.0
        #define MAX_TRACE_DISTANCE 2048.0

        vec2 sdfNormalAtPoint(vec2 P, sampler2D sdfTexture)
        {
            // Sample distance field texture and neighboring texels
            vec2 texelSize = vec2(1.0/sdfResolution.x, 1.0/sdfResolution.y); 
            vec2 UV = P/sdfResolution;
            float distance = texture2D(sdfTexture, UV).r;
            float distanceRight = texture2D(sdfTexture, UV + vec2(texelSize.x, 0.0)).r;
            float distanceUp = texture2D(sdfTexture, UV + vec2(0.0, texelSize.y)).r;
        
            // Calculate gradients in x and y directions
            float dx = distanceRight - distance;
            float dy = distanceUp - distance;
        
            // Calculate normal vector
            return normalize(vec3(dx, dy, 1.0)).xy; // Negate the gradient and normalize
        }

        vec2 rayMarch(vec2 rayPos, vec2 rayDir, sampler2D sdfTexture)
        {
            vec2 pos = rayPos;
            float totalDistanceTraveled = 0.0;
            for(int i=0; i<MAX_RAYMARCH_STEPS; i++)
            {
                vec2 texCoord = pos/outputResolution;
                float currentDistance = texture2D(sdfTexture, texCoord).r;
                totalDistanceTraveled+=currentDistance;

                // ray did not hit anything within distance threshold
                if(totalDistanceTraveled>MAX_TRACE_DISTANCE)
                {
                    rayDir = normalize(rayDir) * MAX_TRACE_DISTANCE;
                    return rayPos+rayDir;
                }

                // ray hit surface
                if(currentDistance<1.0)
                {
                    rayDir = normalize(rayDir)*distance(pos, rayPos);
                    return rayPos+rayDir;
                }
                pos+=normalize(rayDir)*currentDistance;
            }

            // ray did not hit anythin while raymarching.
            rayDir = normalize(rayDir) * MAX_TRACE_DISTANCE;
            vec2 hitPos = rayPos+rayDir;
            return vec2(hitPos);
        }

        void main()
        {
            // float rayIdx = gl_FragCoord.y*rayDataResolution.x+gl_FragCoord.y;

            // unpack ray from data texture
            vec2 texCoord = gl_FragCoord.xy / rayDataResolution;
            vec4 rayData = texture2D(rayDataTexture, texCoord);
            vec2 rayPos = rayData.xy;
            vec2 rayDir = rayData.zw;

            // intersect ray with signed distance field
            vec2 hitPos = rayMarch(rayPos+normalize(rayDir)*MIN_HIT_DISTANCE*2.0, rayDir, sdfTexture);

            // calculate normal at intersection point
            vec2 hitNormal = sdfNormalAtPoint(hitPos, sdfTexture);

            // output hitData
            gl_FragColor = vec4(hitPos, hitNormal);
        }`
    })();
}

export {intersectRaysWithSDF}