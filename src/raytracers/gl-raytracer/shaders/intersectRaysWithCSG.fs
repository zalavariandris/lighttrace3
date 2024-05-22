#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159
#define MAX_CIRCLES 10
#define MAX_SHAPES 10
#define EPSILON 0.001

uniform sampler2D rayDataTexture;
uniform vec2 rayDataResolution;

uniform vec3 transformData[MAX_SHAPES];
uniform vec4 shapeData[MAX_SHAPES];
uniform vec2 materialData[MAX_SHAPES];
uniform float shapesCount;

struct Ray{
    vec2 origin;
    vec2 direction;
};

struct HitInfo{
    float t;
    vec2 position;
    vec2 normal;
    int matID;
};

struct Circle{
    vec2 center;
    float radius;
};

struct Triangle{
    vec2 center;
    float angle;
    float size;
};

struct Rectangle{
    vec2 center;
    float angle;
    float width;
    float height;
};

struct SphericalLens{
    vec2 center;
    float angle;
    float diameter;
    float centerThickness;
    float edgeThickness;
};

struct Segment{
    vec2 P1;
    vec2 P2;
};

vec2 rotate(vec2 point, float radAngle, vec2 pivot)
{
    float x = point.x;
    float y = point.y;

    float rX = pivot.x + (x - pivot.x) * cos(radAngle) - (y - pivot.y) * sin(radAngle);
    float rY = pivot.y + (x - pivot.x) * sin(radAngle) + (y - pivot.y) * cos(radAngle);

    return vec2(rX, rY);
}

vec2 rotate(vec2 vector, float radAngle) {
	float s = sin(radAngle);
	float c = cos(radAngle);
	mat2 m = mat2(c, s, -s, c);
	return m * vector;
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
HitInfo intersect(Ray ray, Circle circle)//vec2 center, float radius)
{
    vec2 p = ray.origin - circle.center;
    float B = dot(p, ray.direction);
    float C = dot(p, p) - circle.radius*circle.radius;
    float detSq = B*B - C;
    if (detSq >= 0.0)
    {
        float det = sqrt(detSq);
        float tNear = -B - det;
        float tFar  = -B + det;

        float t = smallestPositive(tNear, tFar, 9999.0);

        vec2 I = ray.origin+ray.direction*t;
        vec2 N = normalize(I-circle.center);
        return HitInfo(t, I, N, -1);
    }
    else
    {
        return HitInfo(9999.0, vec2(0.0), vec2(0.0), -1);
    }
}

HitInfo intersect(Ray ray, Segment segment)
{
    HitInfo hit = HitInfo(9999.0, vec2(0.0, 0.0), vec2(0.0, 0.0), -1);

    vec2 lineTangent = segment.P2-segment.P1;
    // Calculate the determinant
    float determinant = ray.direction.x * lineTangent.y - ray.direction.y * lineTangent.x;

    if (abs(determinant) < EPSILON){
        return hit;
    }

    // Calculate the intersection along the ray
    float t1 = ((segment.P1.x - ray.origin.x) * lineTangent.y - (segment.P1.y - ray.origin.y) * lineTangent.x) / determinant;

    // calculate intersection along the line
    float t2 = ((segment.P1.x - ray.origin.x) * ray.direction.y - (segment.P1.y - ray.origin.y) * ray.direction.x) / determinant;
    
    bool IntersectionWithinRay = t1>EPSILON;
    bool IntersectinWithinLinesegment = t2>EPSILON && t2<(1.0+EPSILON);

    if(IntersectionWithinRay && IntersectinWithinLinesegment)
    {
        vec2 I = ray.origin+ray.direction*t1;
        vec2 N = -normalize(vec2(-lineTangent.y, lineTangent.x));
        return HitInfo(t1, I, N, -1);
    }

    return hit;
}



HitInfo intersect(Ray ray, Triangle triangle)
{
    // make vertices from triangle size and transform
    vec2 vertices[3];
    for(int i=0;i<3;i++)
    {
        float angle = float(i)/3.0*PI*2.0-PI/2.0;
        angle+=triangle.angle;
        vertices[i] = vec2(cos(angle)*triangle.size, sin(angle)*triangle.size);
        vertices[i]+=triangle.center;
    }

    // create triangle sides
    Segment a = Segment(vertices[0], vertices[1]);
    Segment b = Segment(vertices[1], vertices[2]);
    Segment c = Segment(vertices[2], vertices[0]);

    // intersect each side
    HitInfo hitA = intersect(ray, a);
    HitInfo hitB = intersect(ray, b);
    HitInfo hitC = intersect(ray, c);

    // find closest
    HitInfo hit = hitA;
    if(hitB.t<hit.t) hit = hitB;
    if(hitC.t<hit.t) hit = hitC;
    return hit;
}

Circle makeCircleFromThreePoints(vec2 S, vec2 M, vec2 E)
{
    float a = S.x * (M.y - E.y) - S.y * (M.x - E.x) + M.x * E.y - E.x * M.y;
    
    float b = (S.x * S.x + S.y * S.y) * (E.y - M.y) 
            + (M.x * M.x + M.y * M.y) * (S.y - E.y)
            + (E.x * E.x + E.y * E.y) * (M.y - S.y);
    
    float c = (S.x * S.x + S.y * S.y) * (M.x - E.x) 
          + (M.x * M.x + M.y * M.y) * (E.x - S.x) 
          + (E.x * E.x + E.y * E.y) * (S.x - M.x);
    
    vec2 C = vec2(-b / (2.0 * a), -c / (2.0 * a) );
    float r = sqrt((C.x - S.x)*(C.x - S.x) + (C.y - S.y)*(C.y - S.y));
    return Circle(C, r);
}

bool contains(Circle circle, vec2 P)
{
    vec2 V = circle.center-P;
    return dot(V, V) < pow(circle.radius+EPSILON, 2.0);
}

bool contains(Rectangle bbox, vec2 P){
    return bbox.center.x-bbox.width/2.0  < P.x && P.x < bbox.center.x+bbox.width/2.0 && 
           bbox.center.y-bbox.height/2.0 < P.y && P.y < bbox.center.y+bbox.height/2.0;
}

HitInfo intersect(Ray incidentRay, Rectangle rectangle)
{
    Ray ray = Ray(rotate(incidentRay.origin, -rectangle.angle, rectangle.center), rotate(incidentRay.direction, -rectangle.angle));

    float tNearX = (rectangle.center.x - rectangle.width  / 2.0 - ray.origin.x) / ray.direction.x;
    float tNearY = (rectangle.center.y - rectangle.height / 2.0 - ray.origin.y) / ray.direction.y;
    float tFarX =  (rectangle.center.x + rectangle.width  / 2.0 - ray.origin.x) / ray.direction.x;
    float tFarY =  (rectangle.center.y + rectangle.height / 2.0 - ray.origin.y) / ray.direction.y;

    float tNear = max(min(tNearX, tFarX), min(tNearY, tFarY));
    float tFar = min(max(tNearX, tFarX), max(tNearY, tFarY));

    float t = smallestPositive(tNear, tFar, 9999.0);

    if (t == 9999.0) {
        return HitInfo(9999.0, vec2(ray.origin), vec2(0.0,0.0), -1);
    }

    vec2 I = ray.origin + ray.direction * t;

    vec2 normal = vec2(0.0, 0.0);

    if (I.x+EPSILON >= rectangle.center.x - rectangle.width / 2.0  && I.x-EPSILON <= rectangle.center.x + rectangle.width / 2.0 &&
        I.y+EPSILON >= rectangle.center.y - rectangle.height / 2.0 && I.y-EPSILON <= rectangle.center.y + rectangle.height / 2.0) {
        if (abs(I.x - rectangle.center.x + rectangle.width / 2.0) < EPSILON) {
            normal = vec2(-1.0, 0.0);
        } else if (abs(I.x - rectangle.center.x - rectangle.width / 2.0) < EPSILON) {
            normal = vec2(1.0, 0.0);
        } else if (abs(I.y - rectangle.center.y + rectangle.height / 2.0) < EPSILON) {
            normal = vec2(0.0, -1.0);
        } else if (abs(I.y - rectangle.center.y - rectangle.height / 2.0) < EPSILON) {
            normal = vec2(0.0, 1.0);
        }

        return HitInfo(t, rotate(I, rectangle.angle, rectangle.center), rotate(normal, rectangle.angle), -1);
    } else {
        return HitInfo(9999.0, I, vec2(0.0, 0.0), -1);
    }
}

HitInfo intersect(Ray incidentRay, SphericalLens lens){

    Ray ray = Ray(rotate(incidentRay.origin, -lens.angle, lens.center), rotate(incidentRay.direction, -lens.angle));
    HitInfo hit = HitInfo(9999.0, vec2(0.0, 0.0), vec2(0.0, 0.0), -1);
    // make left cirlce
    vec2 topLeft =    vec2(lens.center.x -   lens.edgeThickness/2.0, lens.center.y+lens.diameter/2.0);
    vec2 middleLeft = vec2(lens.center.x - lens.centerThickness/2.0, lens.center.y+0.0         );
    vec2 bottomLeft = vec2(lens.center.x -   lens.edgeThickness/2.0, lens.center.y-lens.diameter/2.0);
    Circle leftCircle = makeCircleFromThreePoints(topLeft, middleLeft, bottomLeft);

    // make right cirlce
    vec2 topRight =    vec2(lens.center.x +   lens.edgeThickness/2.0, lens.center.y+lens.diameter/2.0);
    vec2 middleRight = vec2(lens.center.x + lens.centerThickness/2.0, lens.center.y+0.0         );
    vec2 bottomRight = vec2(lens.center.x +   lens.edgeThickness/2.0, lens.center.y-lens.diameter/2.0);
    Circle rightCircle = makeCircleFromThreePoints(topRight, middleRight, bottomRight);

    HitInfo leftHit = intersect(ray, leftCircle);
    HitInfo rightHit = intersect(ray, rightCircle);

    bool IsConvex = lens.centerThickness>lens.edgeThickness;

    if(!IsConvex)
    {
        leftHit.normal *= -1.0;
        rightHit.normal *=-1.0;
    }

    if(IsConvex)
    {
        if (contains(leftCircle,  rightHit.position) && contains(rightCircle, leftHit.position))
        {
            // Return closest hitpoint that is inside the circles intersection
            if (leftHit.t < rightHit.t) {hit = leftHit;} else {hit = rightHit;}
        }
        else if (contains(leftCircle,  rightHit.position))
        {
            hit = HitInfo(rightHit.t, rightHit.position, rightHit.normal, rightHit.matID);
        }
        else if (contains(rightCircle,  leftHit.position))
        {
            hit = leftHit;
        }
    }
    else
    {
        Rectangle bbox = Rectangle(lens.center, 0.0, max(lens.edgeThickness, lens.centerThickness), lens.diameter);
        if(contains(bbox, leftHit.position) && contains(bbox, rightHit.position))
        {
            if(leftHit.t < rightHit.t) {hit = leftHit;} else {hit = rightHit;};
        }
        else if(contains(bbox, leftHit.position))
        {
            hit = leftHit;
        }

    }

    return HitInfo(hit.t, rotate(hit.position, lens.angle, lens.center), rotate(hit.normal, lens.angle), hit.matID);
}

HitInfo intersectScene(Ray ray)
{
    HitInfo hitInfo = HitInfo(9999.0, vec2(ray.origin+ray.direction*9999.0), vec2(0.0), -1);


    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            HitInfo currentHit;
            if(shapeData[i].x==0.0) // CIRCLE
            {
                // upack circle
                vec2 center = transformData[i].xy;
                float angle = transformData[i].z;
                float radius = shapeData[i].y;

                // intersect Circle
                currentHit = intersect(ray, Circle(center, radius));
            }
            else if(shapeData[i].x==1.0) // RECTANGLE
            {
                // upack rectangle
                Rectangle rect = Rectangle(transformData[i].xy, 
                                           transformData[i].z, 
                                           shapeData[i].y, 
                                           shapeData[i].z);
                // intersect Rectangle
                currentHit = intersect(ray, rect);
            }
            else if(shapeData[i].x==2.0) // SphericalLens
            {
                // Unpack Spherical Lens
                SphericalLens lens = SphericalLens(transformData[i].xy, 
                                                   transformData[i].z, 
                                                   shapeData[i].y, 
                                                   shapeData[i].w,
                                                   shapeData[i].z);
                // intersect Lens
                currentHit = intersect(ray, lens);

            }
            else if(shapeData[i].x==3.0) // Triangle
            {
                // Unpack Spherical Lens
                Triangle triangle = Triangle(transformData[i].xy, 
                                           transformData[i].z, 
                                           shapeData[i].y);
                // intersect Lens
                currentHit = intersect(ray, triangle);
            }
            else if(shapeData[i].x==4.0) // LineSegment
            {
                // Unpack Spherical Lens
                vec2 C = transformData[i].xy;
                float angle = transformData[i].z;
                float segmentLength = shapeData[i].y;
                vec2 tangent = vec2(cos(angle), sin(angle));
                vec2 P1 = C-tangent*segmentLength/2.0;
                vec2 P2 = C+tangent*segmentLength/2.0;
                Segment segment = Segment(P1, P2);
                // intersect Lens
                currentHit = intersect(ray, segment);
            }
            else
            {
                continue;
            }

            // Update ROUND
            if(currentHit.t<hitInfo.t)
            {
                hitInfo = currentHit;
                hitInfo.matID = int(materialData[i].x);
            }
        }
    }

    return hitInfo;
}

Ray sampleCurrentRay()
{
    vec2 texCoord = gl_FragCoord.xy / rayDataResolution;
    vec4 rayData = texture2D(rayDataTexture, texCoord);
    vec2 rayPos = rayData.xy;
    vec2 rayDir = rayData.zw;

    return Ray(rayPos, rayDir);
}
void main()
{
    // unpack ray from data texture
    Ray incidentRay = sampleCurrentRay();
    incidentRay.origin+=incidentRay.direction*EPSILON;
    HitInfo hitInfo = intersectScene(incidentRay);
    gl_FragData[0] = vec4(hitInfo.position, hitInfo.normal);
    gl_FragData[1] = vec4(float(hitInfo.matID), 0.0,0.0,0.0);
}