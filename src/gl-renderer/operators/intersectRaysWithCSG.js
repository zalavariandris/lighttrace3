
import QUAD from "../QUAD.js"
import { loadShader } from "../shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/gl-renderer/shaders/PASS_THROUGH_VERTEX_SHADER.fs")

function intersectRaysWithCSG(regl, {
    framebuffer, 
    incidentRayDataTexture,
    CSG
})
{
    regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
        framebuffer: framebuffer,
        uniforms: {
            rayDataTexture: incidentRayDataTexture,
            rayDataResolution: [incidentRayDataTexture.width, incidentRayDataTexture.height],
            circleData: CSG.flat(),
            circleCount: CSG.length
        },
        frag: `precision mediump float;
        #define e 2.71828
        #define PI 3.14159
        #define MAX_CIRCLES 10
        #define EPSILON 0.001

        uniform sampler2D rayDataTexture;
        uniform vec2 rayDataResolution;

        uniform vec3 circleData[MAX_CIRCLES];
        uniform float circleCount;

        struct Ray{
            vec2 origin;
            vec2 direction;
        };

        struct HitPoint{
            vec2 position;
            vec2 normal;
        };

        Ray sampleCurrentRay()
        {
            vec2 texCoord = gl_FragCoord.xy / rayDataResolution;
            vec4 rayData = texture2D(rayDataTexture, texCoord);
            vec2 rayPos = rayData.xy;
            vec2 rayDir = rayData.zw;

            return Ray(rayPos, rayDir);
        }

        /*return smallest number but ignore negative ones*/
        float smallestPositive(float a, float b, float value)
        {
            if(a<0.0 && b<0.0)
            {
                return value;
            }
            else if(a<0.0)
            {
                return b;
            }
            else
            {
                return min(a, b);
            }
        }

        /*return closest intersection along the ray*/
        float intersectCircle(Ray ray, vec2 center, float radius)
        {
            vec2 p = ray.origin - center;
            float B = dot(p, ray.direction);
            float C = dot(p, p) - radius*radius;
            float detSq = B*B - C;
            if (detSq >= 0.0)
            {
                float det = sqrt(detSq);
                float tNear = -B - det;
                float tFar  = -B + det;

                return smallestPositive(tNear, tFar, 9999.0);
            }
            else
            {
                return 9999.0;
            }
        }
        
        HitPoint intersectScene(Ray ray)
        {
            float t = 9999.0;
            vec2 N = vec2(0.0,0.0);
            
            vec2 hitPos = vec2(ray.origin+ray.direction*9999.0);
            vec2 hitNormal = vec2(0.0,0.0);


            for(int i=0;i<MAX_CIRCLES;i++)
            {
                if(i<int(circleCount))
                {
                    // upack circle
                    vec2 center = circleData[i].xy;
                    float radius = circleData[i].z;

                    //
                    float currentT = intersectCircle(ray, center, radius);

                    if(currentT<t)
                    {
                        t = currentT;
                        hitPos = ray.origin+ray.direction*t;
                        hitNormal = normalize(hitPos - center);
                    }
                }
            }

            if(t>0.0)
            {
                return HitPoint(hitPos, hitNormal);
            }
            return HitPoint(vec2(0.0,0.0), vec2(0.0,0.0));
        }

        void main()
        {
            // unpack ray from data texture

            Ray incidentRay = sampleCurrentRay();
            incidentRay.origin+=incidentRay.direction*EPSILON;
            HitPoint hitPoint = intersectScene(incidentRay);
            gl_FragColor = vec4(hitPoint.position, hitPoint.normal);
        }
        `
    })();
};

export {intersectRaysWithCSG};