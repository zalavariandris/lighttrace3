precision mediump float;
#define e 2.71828
#define PI 3.14159
#define MAX_CIRCLES 10
#define MAX_SHAPES 10
#define EPSILON 0.001

uniform sampler2D rayDataTexture;
uniform vec2 rayDataResolution;

uniform vec4 circleData[MAX_CIRCLES];
uniform float circleCount;
uniform vec3 transformData[MAX_SHAPES];
uniform vec4 shapeData[MAX_SHAPES];
uniform float shapesCount;

struct Ray{
    vec2 origin;
    vec2 direction;
};

struct HitInfo{
    float t;
    vec2 position;
    vec2 normal;
};

vec2 rotatePoint(vec2 point, float radAngle, vec2 pivot)
{
    float x = point.x;
    float y = point.y;

    float rX = pivot.x + (x - pivot.x) * cos(radAngle) - (y - pivot.y) * sin(radAngle);
    float rY = pivot.y + (x - pivot.x) * sin(radAngle) + (y - pivot.y) * cos(radAngle);

    return vec2(rX, rY);
}

vec2 rotateVector(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, s, -s, c);
	return m * v;
}

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
HitInfo intersectCircle(Ray ray, vec2 center, float radius)
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

        float t = smallestPositive(tNear, tFar, 9999.0);

        vec2 I = ray.origin+ray.direction*t;
        vec2 N = normalize(I-center);
        return HitInfo(t, I, N);
    }
    else
    {
        return HitInfo(9999.0, vec2(0.0), vec2(0.0));
    }
}

HitInfo intersectRectangle(Ray incidentRay, vec2 center, float angle, float width, float height)
{

    Ray ray = Ray(rotatePoint(incidentRay.origin, -angle, center), rotatePoint(incidentRay.direction, -angle, vec2(0.0)));

    float tNearX = (center.x - width  / 2.0 - ray.origin.x) / ray.direction.x;
    float tNearY = (center.y - height / 2.0 - ray.origin.y) / ray.direction.y;
    float tFarX =  (center.x + width  / 2.0 - ray.origin.x) / ray.direction.x;
    float tFarY =  (center.y + height / 2.0 - ray.origin.y) / ray.direction.y;

    float tNear = max(min(tNearX, tFarX), min(tNearY, tFarY));
    float tFar = min(max(tNearX, tFarX), max(tNearY, tFarY));

    float t = smallestPositive(tNear, tFar, 9999.0);

    if (t == 9999.0) {
        return HitInfo(9999.0, vec2(ray.origin), vec2(0.0,0.0));
    }

    vec2 I = ray.origin + ray.direction * t;

    vec2 normal = vec2(0.0, 0.0);

    if (I.x+EPSILON >= center.x - width / 2.0 && I.x-EPSILON <= center.x + width / 2.0 &&
        I.y+EPSILON >= center.y - height / 2.0 && I.y-EPSILON <= center.y + height / 2.0) {
        if (abs(I.x - center.x + width / 2.0) < EPSILON) {
            normal = vec2(-1.0, 0.0);
        } else if (abs(I.x - center.x - width / 2.0) < EPSILON) {
            normal = vec2(1.0, 0.0);
        } else if (abs(I.y - center.y + height / 2.0) < EPSILON) {
            normal = vec2(0.0, -1.0);
        } else if (abs(I.y - center.y - height / 2.0) < EPSILON) {
            normal = vec2(0.0, 1.0);
        }

        return HitInfo(t, rotatePoint(I, angle, center), rotatePoint(normal, angle, vec2(0.0)));
    } else {
        return HitInfo(9999.0, I, vec2(0.0, 0.0));
    }
}

HitInfo intersectScene(Ray ray)
{
    HitInfo hitInfo = HitInfo(9999.0, vec2(ray.origin+ray.direction*9999.0), vec2(0.0));


    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            if(shapeData[i].x==0.0) // CIRCLE
            {
                // upack circle
                vec2 center = transformData[i].xy;
                float angle = transformData[i].z;
                float radius = shapeData[i].y;

                // intersect Circle
                HitInfo currentHit = intersectCircle(ray, center, radius);

                // Update ROUND
                if(currentHit.t<hitInfo.t) hitInfo = currentHit;
            }
            else if(shapeData[i].x==1.0) // RECTANGLE
            {
                // upack rectangle
                vec2 center = transformData[i].xy;
                float angle = transformData[i].z;
                float width = shapeData[i].y;
                float height = shapeData[i].z;

                // intersect Rectangle
                HitInfo currentHit = intersectRectangle(ray, center, angle, width, height);

                // Update ROUND
                if(currentHit.t<hitInfo.t) hitInfo = currentHit;
            }
            else if(shapeData[i].x==2.0) // SphericalLens
            {
                
            }
        }
    }

    return hitInfo;
}

void main()
{
    // unpack ray from data texture
    Ray incidentRay = sampleCurrentRay();
    incidentRay.origin+=incidentRay.direction*EPSILON;
    HitInfo hitPoint = intersectScene(incidentRay);
    gl_FragColor = vec4(hitPoint.position, hitPoint.normal);
}