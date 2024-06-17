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

int CIRCLE_SHAPE = 0;
int RECTANGLE_SHAPE = 1;
int SPHERICAL_LENS_SHAPE = 2;
int TRIANGLE_SHAPE = 3;
int LINE_SEGMENT_SHAPE = 4;

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

Circle makeCircleFromThreePoints(vec2 S, vec2 M, vec2 E)
{
    float a = S.x * (M.y - E.y) - S.y * (M.x - E.x) + M.x * E.y - E.x * M.y;
    
    float b = (S.x * S.x + S.y * S.y) * (E.y - M.y) 
            + (M.x * M.x + M.y * M.y) * (S.y - E.y)
            + (E.x * E.x + E.y * E.y) * (M.y - S.y);
    
    float c = (S.x * S.x + S.y * S.y) * (M.x - E.x) 
            + (M.x * M.x + M.y * M.y) * (E.x - S.x) 
            + (E.x * E.x + E.y * E.y) * (S.x - M.x);
    
    vec2 C = vec2(-b / (2.0 * a), -c / (2.0 * a));
    float r = sqrt((C.x - S.x) * (C.x - S.x) + (C.y - S.y) * (C.y - S.y));

    return Circle(C, r);
}

struct Rectangle{
    vec2 center;
    float angle;
    float width;
    float height;
};

struct Triangle{
    vec2 center;
    float angle;
    float size;
};

struct SphericalLens{
    vec2 center;
    float angle;
    float diameter;
    float centerThickness;
    float edgeThickness;
};

vec2 rotate(vec2 pos, float radAngle, vec2 pivot)
{
    vec2 translatedPos = pos - pivot;
    float cosAngle = cos(radAngle);
    float sinAngle = sin(radAngle);
    vec2 rotatedPos = vec2(
        translatedPos.x * cosAngle - translatedPos.y * sinAngle,
        translatedPos.x * sinAngle + translatedPos.y * cosAngle
    );
    return rotatedPos + pivot;
}

vec2 rotate(vec2 pos, float radAngle){
    return rotate(pos, radAngle, vec2(0,0));
}

bool hitCircle(Ray ray, Circle circle, out HitSpan ispan)
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

bool hitRectangle(Ray ray, Rectangle rect, out HitSpan ispan)
{
    vec2 rayPos = rotate(ray.pos, -rect.angle, rect.center);
    vec2 rayDir = rotate(ray.dir, -rect.angle);

    float tNearX = (rect.center.x - rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tNearY = (rect.center.y - rect.height / 2.0 - rayPos.y) / rayDir.y;
    float tFarX =  (rect.center.x + rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tFarY =  (rect.center.y + rect.height / 2.0 - rayPos.y) / rayDir.y;

    float tNear = max(min(tNearX, tFarX), min(tNearY, tFarY));
    float tFar =  min(max(tNearX, tFarX), max(tNearY, tFarY));
    
    if(tNear>tFar){
        return false;
    }
    
    // find closest
    if(tFar>0.0)
    {
        //exit point
        vec2 I2 = rayPos+rayDir*tFar;

        // exit normal
        vec2 N2 = vec2(0.0);
        if (I2.x+EPSILON >= rect.center.x - rect.width / 2.0  && I2.x-EPSILON <= rect.center.x + rect.width / 2.0 &&
            I2.y+EPSILON >= rect.center.y - rect.height / 2.0 && I2.y-EPSILON <= rect.center.y + rect.height / 2.0) {
            if        (abs(I2.x - rect.center.x + rect.width / 2.0) < EPSILON) {
                N2 = vec2(-1.0, 0.0);
            } else if (abs(I2.x - rect.center.x - rect.width / 2.0) < EPSILON) {
                N2 = vec2(1.0, 0.0);
            } else if (abs(I2.y - rect.center.y + rect.height / 2.0) < EPSILON) {
                N2 = vec2(0.0, -1.0);
            } else if (abs(I2.y - rect.center.y - rect.height / 2.0) < EPSILON) {
                N2 = vec2(0.0, 1.0);
            }
        }

        I2 = rotate(I2, rect.angle, rect.center);
        N2 = rotate(N2, rect.angle);
        HitInfo exit = HitInfo(tFar, I2, N2, -1);

        if(tNear<0.0){
            // when the enter point is behind the ray's origin, 
            // then intersection span will begin at the rays origin
            HitInfo enter = HitInfo(0.0, ray.pos, vec2(0,0), -1);
            ispan = HitSpan(enter,exit);
            return true;
        }

        //enter point
        vec2 I1 = rayPos+rayDir*tNear;

        // enter normal
        vec2 N1 = vec2(0.0);
        if (I1.x+EPSILON >= rect.center.x - rect.width / 2.0  && I1.x-EPSILON <= rect.center.x + rect.width / 2.0 &&
            I1.y+EPSILON >= rect.center.y - rect.height / 2.0 && I1.y-EPSILON <= rect.center.y + rect.height / 2.0) {
            if        (abs(I1.x - rect.center.x + rect.width / 2.0) < EPSILON) {
                N1 = vec2(-1.0, 0.0);
            } else if (abs(I1.x - rect.center.x - rect.width / 2.0) < EPSILON) {
                N1 = vec2(1.0, 0.0);
            } else if (abs(I1.y - rect.center.y + rect.height / 2.0) < EPSILON) {
                N1 = vec2(0.0, -1.0);
            } else if (abs(I1.y - rect.center.y - rect.height / 2.0) < EPSILON) {
                vec2 N1 = vec2(0.0, 1.0);
            }
        }

        // enter hit info
        I1 = rotate(I1, rect.angle, rect.center);
        N1 = rotate(N1, rect.angle);

        HitInfo enter = HitInfo(tNear, I1, N1, -1);

        // return intersection span between the enter- and exit point
        ispan = HitSpan(enter, exit);
        return true;
    }
    return false;
}

struct Line{
    vec2 begin;
    vec2 end;
};

bool hitLine(Ray ray, Line line, out HitSpan ispan){
    float tangentX = line.end.x-line.begin.x;
    float tangentY = line.end.y-line.begin.y;

    // Calculate the determinant
    float determinant = ray.dir.x * tangentY - ray.dir.y * tangentX;

    if (abs(determinant) < EPSILON){
        return false;
    }

    if(determinant>0.0){ // from outside

    }else{ // from inside

    }

    // Calculate the intersection along the ray
    float tNear = ((line.begin.x - ray.pos.x) * tangentY - (line.begin.y - ray.pos.y) * tangentX) / determinant;

    // Calculate intersection along the line
    float tLine = ((line.begin.x - ray.pos.x) * ray.dir.y - (line.begin.y - ray.pos.y) * ray.dir.x) / determinant;
    
    if(tNear<=0.0 || tLine<=0.0 || tLine>=1.0){
        return false;
    }

    vec2 I = ray.pos+ray.dir*tNear;
    vec2 N = vec2(-tangentY, tangentX);
    N = normalize(-N);

    ispan = HitSpan(
        HitInfo(tNear, I, N, -1),
        HitInfo(tNear+1.0, I, -N, -1)
    );
    return true;
}

bool hitTriangle(Ray ray, Triangle triangle, out HitSpan ispan){
    vec2 vertices[3];
    for(int k=0; k<3; k++){
        float a = float(k)/3.0*PI*2.0-PI/2.0 + triangle.angle;
        vertices[k] = vec2(
            cos(a)*triangle.size + triangle.center.x,
            sin(a)*triangle.size + triangle.center.y
        );
    }

    Line segmentA = Line(vertices[0], vertices[1]);
    Line segmentB = Line(vertices[1], vertices[2]);
    Line segmentC = Line(vertices[2], vertices[0]);

    HitSpan segmentAHitSpan;
    HitSpan segmentBHitSpan;
    HitSpan segmentCHitSpan;

    bool IsSegmentAHit = hitLine(ray, segmentA, segmentAHitSpan);
    bool IsSegmentBHit = hitLine(ray, segmentB, segmentBHitSpan);
    bool IsSegmentCHit = hitLine(ray, segmentC, segmentCHitSpan);

    // find closest entry intersection
    bool IsEnterHit=false;
    HitSpan enterSpan;
    float enterT = 9999.0;
    if(IsSegmentAHit && segmentAHitSpan.enter.t<=enterT){
        enterT = segmentAHitSpan.enter.t;
        enterSpan = segmentAHitSpan;
        IsEnterHit = true;
    }
    if(IsSegmentBHit && segmentBHitSpan.enter.t<=enterT){
        enterT = segmentBHitSpan.enter.t;
        enterSpan = segmentBHitSpan;
        IsEnterHit = true;
    }
    if(IsSegmentCHit && segmentCHitSpan.enter.t<=enterT){
        enterT = segmentCHitSpan.enter.t;
        enterSpan = segmentCHitSpan;
        IsEnterHit = true;
    }

    // find farthest exit intersection
    bool IsExitHit = false;
    HitSpan exitSpan;
    float exitT=0.0;
    if(IsSegmentAHit && segmentAHitSpan.exit.t>=exitT){
        exitT = segmentAHitSpan.exit.t;
        exitSpan = segmentAHitSpan;
        IsExitHit = true;
    }
    if(IsSegmentBHit && segmentBHitSpan.exit.t>=exitT){
        exitT = segmentBHitSpan.exit.t;
        exitSpan = segmentBHitSpan;
        IsExitHit = true;
    }
    if(IsSegmentCHit && segmentCHitSpan.exit.t>=exitT){
        exitT = segmentCHitSpan.exit.t;
        exitSpan = segmentCHitSpan;
        IsExitHit = true;
    }

    if(!IsEnterHit && !IsExitHit){
        return false;
    }

    ispan = HitSpan(enterSpan.enter, exitSpan.exit);
    return true;
}

bool intersectSpan(HitSpan a, HitSpan b, out HitSpan ispan)
{
    HitInfo enter = a.enter;
    if(a.enter.t<b.enter.t){
        enter = b.enter;
    }

    HitInfo exit = a.exit;
    if(a.exit.t>b.exit.t){
        exit = b.exit;
    }

    if(enter.t>exit.t){
        return false;
    }
    ispan = HitSpan(enter, exit);
    return true;
}

bool hitSphericalLens(Ray ray, SphericalLens lens, out HitSpan ispan){
    // make circles
    float top =         lens.center.y + lens.diameter/2.0;
    float bottom =      lens.center.y - lens.diameter/2.0;
    float edgeLeft =    lens.center.x - lens.edgeThickness/2.0;
    float edgeRight =   lens.center.x + lens.edgeThickness/2.0;
    float centerLeft =  lens.center.x - lens.centerThickness/2.0;
    float centerRight = lens.center.x + lens.centerThickness/2.0;

    // subshapes
    Circle leftCircle =  makeCircleFromThreePoints(
        rotate(vec2(edgeLeft,  top),              lens.angle, lens.center), 
        rotate(vec2(centerLeft,  lens.center.y),  lens.angle, lens.center), 
        rotate(vec2(edgeLeft, bottom),            lens.angle, lens.center)
    );
    Circle rightCircle = makeCircleFromThreePoints(
        rotate(vec2(edgeRight, top),               lens.angle, lens.center), 
        rotate(vec2(centerRight, lens.center.y),   lens.angle, lens.center), 
        rotate(vec2(edgeRight, bottom),            lens.angle, lens.center)
    );
    Rectangle boundingBox = Rectangle(lens.center, lens.angle, max(lens.centerThickness, lens.edgeThickness), lens.diameter);

    bool IsConvex = lens.centerThickness>lens.edgeThickness;
    if(IsConvex){
        // hitspans
        HitSpan leftHitSpan;
        bool IsLeftHit = hitCircle(ray, leftCircle, leftHitSpan);
        HitSpan rightHitSpan;
        bool IsRightHit = hitCircle(ray, rightCircle, rightHitSpan);
        HitSpan boundingSpan;
        bool IsBoundingBoxHit = hitRectangle(ray, boundingBox, boundingSpan);

        if(!IsLeftHit && !IsRightHit || !IsBoundingBoxHit){
            return false;
        }
        // intersect cirlces with bunding box
        // intersectSpan(leftHitSpan, rightHitSpan, ispan);
        bool IsHit = intersectSpan(boundingSpan, rightHitSpan, ispan);
        IsHit = IsHit && intersectSpan(leftHitSpan, ispan, ispan);
        return IsHit;
    }
    else
    {
        return false;
    }
}

bool hitScene(Ray ray, out HitSpan sceneHitSpan)
{
    Ray adjustedRay = Ray(ray.pos+ray.dir*EPSILON, ray.dir, ray.intensity, ray.wavelength);
    bool IsSceneHit = false;
    sceneHitSpan = HitSpan(
                HitInfo(9999.0,vec2(0.0), vec2(0.0), -1),
                HitInfo(9999.0,vec2(0.0), vec2(0.0), -1)
    );
            
    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            bool IsShapeHit = false;
            HitSpan shapeHitSpan;

            if(CSGShapeData[i].x==0.0) // CIRCLE
            {

                Circle circle = Circle(
                    CSGTransformData[i].xy,
                    CSGShapeData[i].y
                );
                IsShapeHit = hitCircle(adjustedRay, circle, shapeHitSpan);

            }
            else if(CSGShapeData[i].x==1.0) // RECTANGLE
            {
                // upack rectangle
                Rectangle rect = Rectangle(CSGTransformData[i].xy, 
                                            CSGTransformData[i].z, 
                                            CSGShapeData[i].y, 
                                           CSGShapeData[i].z);
                // intersect Rectangle
                IsShapeHit = hitRectangle(adjustedRay , rect, shapeHitSpan);
            }

            else if(CSGShapeData[i].x==2.0) // SphericalLens
            {
                SphericalLens lens = SphericalLens(CSGTransformData[i].xy, 
                                                    CSGTransformData[i].z, 
                                                 CSGShapeData[i].y, 
                                           CSGShapeData[i].w,
                                            CSGShapeData[i].z);
                IsShapeHit = hitSphericalLens(adjustedRay, lens, shapeHitSpan);
            }
            else if(CSGShapeData[i].x==3.0) // Triangle
            {
                Triangle triangle = Triangle(CSGTransformData[i].xy, 
                                           CSGTransformData[i].z, 
                                           CSGShapeData[i].y);
                IsShapeHit = hitTriangle(adjustedRay, triangle, shapeHitSpan);
            }
            else if(CSGShapeData[i].x==4.0) // LineSegment
            {
                vec2 center = CSGTransformData[i].xy;
                float angle = CSGTransformData[i].z;
                float length = CSGShapeData[i].y;
                float x1 = center.x - cos(angle)*length/2.0;
                float y1 = center.y - sin(angle)*length/2.0;
                float x2 = center.x + cos(angle)*length/2.0;
                float y2 = center.y + sin(angle)*length/2.0;
                Line line = Line(
                    vec2(x1,y1), 
                    vec2(x2,y2)
                );
                IsShapeHit = hitLine(adjustedRay, line, shapeHitSpan);
            }
            else
            {
                IsShapeHit = false;
                continue;
            }

            // set intersection material from current shape

            // IsSceneHit = IsShapeHit;
            // sceneHitSpan = shapeHitSpan;
            
            if(IsShapeHit){
                shapeHitSpan.enter.material = int(CSGMmaterialData[i]);
                shapeHitSpan.exit.material = int(CSGMmaterialData[i]);
                IsSceneHit = IsShapeHit;
            }

            // get closes hit
            if(IsShapeHit && IsSceneHit)
            {
                /* find closest intersection enter- and exit points */

                // Find the closest enter point
                if(shapeHitSpan.enter.t>0.0 && shapeHitSpan.enter.t<sceneHitSpan.enter.t){
                    sceneHitSpan.enter = shapeHitSpan.enter;
                }
                if(shapeHitSpan.exit.t>0.0 && shapeHitSpan.exit.t < sceneHitSpan.enter.t){
                    sceneHitSpan.enter = shapeHitSpan.exit;
                }

                // find the closest exit point right after the enter point
                if(shapeHitSpan.enter.t>sceneHitSpan.enter.t && shapeHitSpan.enter.t < sceneHitSpan.exit.t){
                    sceneHitSpan.exit = shapeHitSpan.enter;
                }

                if(shapeHitSpan.exit.t>sceneHitSpan.enter.t && shapeHitSpan.exit.t < sceneHitSpan.exit.t){
                    sceneHitSpan.exit = shapeHitSpan.exit;
                }
                IsSceneHit = IsShapeHit;
            }else if(IsShapeHit){
                sceneHitSpan = shapeHitSpan;
                IsSceneHit = IsShapeHit;
            }
        }
    }
    return IsSceneHit;
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
        gl_FragData[0] = vec4(secondary.pos,secondary.dir);
        gl_FragData[1] = vec4(secondary.intensity, secondary.wavelength, 0, 0);
        gl_FragData[2] = vec4(1,1,1,1);
        gl_FragData[3] = vec4(hitInfo.pos, hitInfo.normal);
        gl_FragData[4] = vec4(ispan.enter.pos, ispan.exit.pos);
        gl_FragData[5] = vec4(ray.pos, hitInfo.pos);
    }else{
        gl_FragData[5] = vec4(ray.pos, ray.pos+ray.dir*9999.0);
    }
}

