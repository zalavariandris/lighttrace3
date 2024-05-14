import QUAD from "../QUAD.js"
import PASS_THROUGH_VERTEX_SHADER from "../shaders/PASS_THROUGH_VERTEX_SHADER.js"
/**
 * draw Scene to SignedDistanceField FBO
 * @param {FBO} framebuffer - The OUTPUT framebuffer to render SDF scene
 * @param {Array} circleData - circleData as array of circles eg.: [[centerX, centerY, radius], ...]
 * @param {Array} outputResolution [width, height] - the output resolution of the framebuffer
 */
function drawCSGToSDF(regl, {
    framebuffer,
    CSG,
    outputResolution
})
{
    regl({...QUAD,
        vert: PASS_THROUGH_VERTEX_SHADER,
        framebuffer: framebuffer,
        depth: { enable: false },
        uniforms:{
            outputResolution: outputResolution,
            circleData: CSG.flat(),
            circleCount: CSG.length
        },
        frag:`precision mediump float;
        #define e 2.71828
        #define PI 3.14159
        #define MAX_CIRCLES 10

        uniform vec3 circleData[MAX_CIRCLES];
        uniform float circleCount;
        uniform vec2 outputResolution;

        float cosh(float x) {
            return (exp(x) + exp(-x)) / 2.0;
        }
        
        float sinh(float x) {
            return (exp(x) - exp(-x)) / 2.0;
        }

        float tanh(float x) {
            return (exp(x) - exp(-x)) / (exp(x) + exp(-x));
        }

        float atanh(float x) {
            return 0.5 * log((1.0 + x) / (1.0 - x));
        }

        vec2 translate(vec2 samplePosition, vec2 offset){
            return samplePosition - offset;
        }

        float rectangle(vec2 samplePosition, vec2 halfSize){
            vec2 componentWiseEdgeDistance = abs(samplePosition) - halfSize;
            float outsideDistance = length(max(componentWiseEdgeDistance, 0.0));
            float insideDistance = min(max(componentWiseEdgeDistance.x, componentWiseEdgeDistance.y), 0.0);
            return outsideDistance + insideDistance;
        }

        float circle(vec2 samplePosition, float radius)
        {
            float d = length(samplePosition);
            return length(samplePosition)-radius;
        }

        vec2 rotate(vec2 samplePosition, float angle_in_degrees){
            float angle_in_radians = angle_in_degrees/180.0 * PI * -1.0;
            float sine = sin(angle_in_radians);
            float cosine = cos(angle_in_radians);
            return vec2(cosine * samplePosition.x + sine * samplePosition.y, cosine * samplePosition.y - sine * samplePosition.x);
        }

        float intersectSDF(float A, float B)
        {
            return max(A, B);
        }

        float unionSDF(float A, float B)
        {
            return min(A, B); 
        }

        float scene(vec2 sceneCoord)
        {
            // collect all circles
            float sceneDistance = 9999.0;
            for(int i=0;i<MAX_CIRCLES;i++)
            {
                if(i<int(circleCount)){
                    vec2 pos = circleData[i].xy;
                    float r = circleData[i].z;
                    float circleDistance = circle(translate(sceneCoord, pos), r);
                    sceneDistance = unionSDF(circleDistance, sceneDistance);
                }
            }
            return sceneDistance; 
        }

        void main()
        {   
            float d = scene(gl_FragCoord.xy);
            // d = abs(d);
            gl_FragColor = vec4(d,d,d,1.0);
        }`
    })();
}

export {drawCSGToSDF};