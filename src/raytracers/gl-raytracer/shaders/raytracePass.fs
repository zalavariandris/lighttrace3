#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159
#define MAX_CIRCLES 10
#define MAX_SHAPES 10
#define EPSILON 0.001

uniform vec2 resolution;
uniform sampler2D rayTransformTexture;
uniform sampler2D rayPropertiesTexture;
uniform float shapesCount;
uniform vec3 CSGTransformData[MAX_SHAPES];
uniform vec4 CSGShapeData[MAX_SHAPES];
uniform vec4 CSGMmaterialData[MAX_SHAPES];

int MIRROR = 1;
int GLASS = 2;
int DIFFUSE = 3;

struct Ray{
    vec2 pos;
    vec2 dir;
    float intensity;
    float wavelength;
};

Ray getCurrentRay()
{
    vec2 texCoord = gl_FragCoord.xy / resolution;
    vec4 rayTransform = texture2D(rayTransformTexture, texCoord);
    vec2 rayPos = rayTransform.xy;
    vec2 rayDir = rayTransform.zw;
    vec4 rayProperties = texture2D(rayPropertiesTexture, texCoord);
    float intensity = rayProperties.x;
    float wavelength = rayProperties.y;
    return Ray(rayPos, rayDir, intensity, wavelength);
}

struct HitInfo{
    float t;
    vec2 pos;
    vec2 normal;
    int material;
};

struct HitSpan{
    HitInfo enter;
    HitInfo exit;
};

struct Circle{
    vec2 pos;
    float r;
};

bool hitCircle(Ray ray, Circle circle, inout HitSpan ispan)
{
    vec2 u = ray.pos-circle.pos;

    float B = dot(u, ray.dir);
    float C = dot(u, u) - circle.r*circle.r;
    float detSq = B*B - C;

    if (detSq >= 0.0)
    {
        float det = sqrt(detSq);
        float tNear = -B - det;
        float tFar  = -B + det;

        // If t far is greater than 0 than ther is an exit point
        // If enter point is negative we are inside the shape, 
        // then Let the intersection span begin at the origin of ray
        if(tFar>0.0)
        {
            //exit point
            vec2 I2 = ray.pos+ray.dir*tFar;

            // exit normal
            vec2 N2 = normalize(I2-circle.pos);

            // exit info
            HitInfo exit = HitInfo(tFar, I2, N2, -1);

            if(tNear<0.0)
            {
                ispan = HitSpan(
                    HitInfo(0.0, ray.pos, vec2(0.0), -1), 
                    exit
                );
                return true;
            }

            // enter point
            vec2 I1 = ray.pos+ray.dir*tNear;

            // enter normal
            vec2 N1 = normalize(I1-circle.pos);

            //enter info
            HitInfo enter = HitInfo(tNear, I1, N1, -1);

            // intersection span
            ispan = HitSpan(enter, exit);
            return true;

        }
    }

    return false;
}

bool hitScene(Ray ray, inout HitSpan ispan)
{
    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            if(CSGShapeData[i].x==0.0) // CIRCLE
            {
                vec2 center = CSGTransformData[i].xy;
                float angle = CSGTransformData[i].z;
                float radius = CSGShapeData[i].y;
                return hitCircle(ray, Circle(center, radius), ispan);
            }
        }
    }
    return false;
}



Ray sampleScene(Ray ray, HitInfo hitInfo)
{
    return ray;
}

void main()
{
    // unpack ray from data texture
    Ray ray = getCurrentRay();

    // hit scene
    HitSpan ispan;
    bool IsSceneHit = hitScene(ray, ispan);

    if(IsSceneHit)
    {
        HitInfo hitInfo = ispan.enter;

        // bounce ray
        Ray secondary = sampleScene(ray, hitInfo);

        // pack data
        vec4 rayTransform = vec4(secondary.pos,secondary.dir);
        vec2 rayProperties = vec2(secondary.intensity, secondary.wavelength);
        vec4 rayColor = vec4(1,1,1,1);
        vec4 hitTransform = vec4(0,0,0,0);
        gl_FragData[0] = rayTransform;
        gl_FragData[1] = vec4(rayProperties, 0, 0);
        gl_FragData[2] = rayColor;
        gl_FragData[3] = hitTransform;
    }
}

