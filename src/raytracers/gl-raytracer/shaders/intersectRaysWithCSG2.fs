#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159

#define MAX_SHAPES 16
#define EPSILON 0.001
#define LARGE_NUMBER 9999.0

uniform sampler2D rayDataTexture;
uniform vec2 rayDataResolution;

uniform vec4 roomRect;
uniform float shapesCount;
uniform sampler2D CSGTexture;
uniform vec4 transformData[MAX_SHAPES];
uniform vec4 shapeData[MAX_SHAPES];
uniform vec4 materialData[MAX_SHAPES];

struct Ray{
    vec2 origin;
    vec2 direction;
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
    vec2 A;
    vec2 B;
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


int unpackShapeType(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    return int(texture2D(CSGTexture, vec2(k, 1.5/3.0)).x);
}

Circle unpackCircle(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    vec2 center = texture2D(CSGTexture, vec2(k, 0.5/3.0)).xy;
    float radius = texture2D(CSGTexture, vec2(k, 1.5/3.0)).y;
    return Circle(
        center,
        radius
    );
}

Triangle unpackTriangle(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    vec2 center = texture2D(CSGTexture, vec2(k, 0.5/3.0)).xy;
    float angle = texture2D(CSGTexture, vec2(k, 0.5/3.0)).z;
    float size = texture2D(CSGTexture, vec2(k, 1.5/3.0)).y;
    return Triangle(center, angle, size);
}

SphericalLens unpackSphericalLens(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    vec2 center = texture2D(CSGTexture, vec2(k, 0.5/3.0)).xy;
    float angle = texture2D(CSGTexture, vec2(k, 0.5/3.0)).z;
    float dimeter = texture2D(CSGTexture, vec2(k, 1.5/3.0)).y;
    float centerThickness = texture2D(CSGTexture, vec2(k, 1.5/3.0)).w;
    float edgeThickness = texture2D(CSGTexture, vec2(k, 1.5/3.0)).z;

    return SphericalLens(center, 
                        angle, 
                        dimeter, 
                        centerThickness, 
                        edgeThickness);
}

Rectangle unpackRectangle(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    vec2 center = texture2D(CSGTexture, vec2(k, 0.5/3.0)).xy;
    float angle = texture2D(CSGTexture, vec2(k, 0.5/3.0)).z;
    float width = texture2D(CSGTexture, vec2(k, 1.5/3.0)).y;
    float height = texture2D(CSGTexture, vec2(k, 1.5/3.0)).z;
    return Rectangle(center, angle, width, height);
}

Segment unpackSegment(int i){
    float k = (float(i)+0.5)/float(MAX_SHAPES);
    vec2 C = texture2D(CSGTexture, vec2(k, 0.5/3.0)).xy;
    float angle = texture2D(CSGTexture, vec2(k, 0.5/3.0)).z;
    float segmentLength = texture2D(CSGTexture, vec2(k, 1.5/3.0)).y;
    
    vec2 tangent = vec2(cos(angle), sin(angle));
    vec2 P1 = C-tangent*segmentLength/2.0;
    vec2 P2 = C+tangent*segmentLength/2.0;
    return Segment(P1, P2);
}

/* ************ *
 * INTERSECTION *
 * ************ */
struct Intersection{
    float t;
    vec2 pos;
    vec2 normal;
    int matId;
};

const Intersection NoIntersection = Intersection(LARGE_NUMBER, vec2(0.0), vec2(0.5), -1);

bool IsValid(Intersection intersection){
    return intersection!=NoIntersection;
}
struct IntersectionSpan{
    Intersection enter;
    Intersection exit;
};

const IntersectionSpan NoIntersectionSpan = IntersectionSpan(NoIntersection, NoIntersection);

bool IsValid(IntersectionSpan ispan){
    return ispan!=NoIntersectionSpan;
}

IntersectionSpan intersect(Circle circle, Ray ray, int matId){
    vec2 u = ray.origin-circle.center;

    float B = dot(u, ray.direction);
    float C = dot(u, u) - circle.radius*circle.radius;
    float detSq = B*B - C;

    if (detSq >= -EPSILON)
    {
        float det = sqrt(detSq);
        float tNear = -B - det;
        float tFar  = -B + det;

        // If t far is greater than 0 than ther is an exit point
        // If enter point is negative we are inside the shape, 
        // then Let the intersection span begin at the origin of ray
        if(tFar>EPSILON)
        {
            //exit point
            vec2 I2 = ray.origin+ray.direction*tFar;

            // exit normal
            vec2 N2 = (I2-circle.center);
            N2=normalize(N2);


            Intersection exit = Intersection(tFar, I2, N2, matId);

            if(tNear<EPSILON)
            {
                return IntersectionSpan(
                    Intersection(0.0, ray.origin, vec2(0.0, 0.0), matId), 
                    exit
                );
            }

            // enter point
            vec2 I1 = ray.origin+ray.direction*tNear;

            // enter normal
            vec2 N1 = normalize(I1-circle.center);

            //enter info
            Intersection enter = Intersection(tNear, I1, N1, matId);

            // intersection span
            return IntersectionSpan(enter, exit);
        }
    }

    return NoIntersectionSpan;
}

IntersectionSpan intersect(Segment line, Ray ray, int matId)
{
    vec2 tangent = line.B-line.A;

    // Calculate the determinant
    float determinant = ray.direction.x * tangent.y- ray.direction.y * tangent.x;

    if (abs(determinant) < EPSILON){
        // ray and line are parallel
        return NoIntersectionSpan;
    }

    // Calculate the intersection along the ray
    float tNear = ((line.A.x - ray.origin.x) * tangent.y - (line.A.y - ray.origin.y) * tangent.x) / determinant;
    // Calculate intersection along the line
    float tLine = ((line.A.x - ray.origin.x) * ray.direction.y - (line.A.y - ray.origin.y) * ray.direction.x) / determinant;

    if(0.0 < tNear && 0.0 <= tLine && tLine <=1.0)
    {
        vec2 N = vec2(-tangent.y, tangent.x);
        N = normalize(-N);
        vec2 I1 = ray.origin+ray.direction*tNear;
        float tFar = tNear+EPSILON;
        vec2 I2 = ray.origin+ray.direction*tFar;
        return IntersectionSpan(
            Intersection(tNear, I1, N, matId),
            Intersection(tFar,I2, N, matId)
        );
    }

    return NoIntersectionSpan;
}


// HELPER for triangle intersection
Intersection lineIntersect(Segment line, Ray ray, int matId){
    vec2 tangent = line.B-line.A;

    // Calculate the determinant
    float determinant = ray.direction.x * tangent.y- ray.direction.y * tangent.x;

    if (abs(determinant) < 0.0){
        // ray and line are parallel
        return NoIntersection;
    }

    // Calculate the intersection along the ray
    float tNear = ((line.A.x - ray.origin.x) * tangent.y - (line.A.y - ray.origin.y) * tangent.x) / determinant;
    // Calculate intersection along the line
    float tLine = ((line.A.x - ray.origin.x) * ray.direction.y - (line.A.y - ray.origin.y) * ray.direction.x) / determinant;

    if(EPSILON <= tNear && 0.0 <= tLine && tLine <=1.0)
    {
        vec2 N = vec2(-tangent.y, tangent.x);
        N = normalize(-N);
        vec2 I1 = ray.origin+ray.direction*tNear;
        float tFar = tNear+EPSILON;
        vec2 I2 = ray.origin+ray.direction*tFar;
        return Intersection(tNear, I1, N, matId);
    }

    return NoIntersection;
}

IntersectionSpan intersect(Triangle triangle, Ray ray, int matId){
    vec2 vertices[3];
    for(int k=0; k<3; k++){
        float a = float(k)/3.0*PI*2.0-PI/2.0 + triangle.angle;
        vertices[k] = vec2(
            cos(a)*triangle.size + triangle.center.x,
            sin(a)*triangle.size + triangle.center.y
        );
    }

    Segment segmentA = Segment(vertices[0], vertices[1]);
    Segment segmentB = Segment(vertices[1], vertices[2]);
    Segment segmentC = Segment(vertices[2], vertices[0]);

    Intersection I1 = lineIntersect(segmentA, ray, matId);
    Intersection I2 = lineIntersect(segmentB, ray, matId);
    Intersection I3 = lineIntersect(segmentC, ray, matId);

    // find closest entry intersection
    float tEnter = LARGE_NUMBER;
    vec2 nEnter = vec2(0.0,0.0);
    if(IsValid(I1) && I1.t<tEnter){
        tEnter=I1.t;
        nEnter=I1.normal;
    }
    if(IsValid(I2) && I2.t<tEnter){
        tEnter=I2.t;
        nEnter=I2.normal;
    }
    if(IsValid(I3) && I3.t<tEnter){
        tEnter=I3.t;
        nEnter=I3.normal;
    }

        // find farthest exit intersection
    float tExit = tEnter;
    vec2 nExit = vec2(0.0,0.0);
    if(IsValid(I1) && I1.t>tExit){
        tExit=I1.t;
        nExit=I1.normal;
    }
    if(IsValid(I2) && I2.t>tExit){
        tExit=I2.t;
        nExit=I2.normal;
    }
    if(IsValid(I3) && I3.t>tExit){
        tExit=I3.t;
        nExit=I3.normal;
    }

    if(tEnter>tExit){
        return NoIntersectionSpan;
    }
    if(tEnter==LARGE_NUMBER){
        return NoIntersectionSpan;
    }

    vec2 IEnter = ray.origin+ray.direction*tEnter;
    vec2 IExit = ray.origin+ray.direction*tExit;

    if(tExit==tEnter){
        return IntersectionSpan(
            Intersection(0.0, ray.origin, vec2(0.0), matId),
            Intersection(tEnter, IEnter, nEnter, matId)
        );
    }

    return IntersectionSpan(
        Intersection(tEnter, IEnter, nEnter, matId),
        Intersection(tExit, IExit,nExit, matId)
    );
}

IntersectionSpan intersect(Rectangle rect, Ray ray, int matId){
    vec2 rayPos = rotate(ray.origin, -rect.angle, rect.center);
    vec2 rayDir = rotate(ray.direction, -rect.angle);

    float tNearX = (rect.center.x - rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tNearY = (rect.center.y - rect.height / 2.0 - rayPos.y) / rayDir.y;
    float tFarX =  (rect.center.x + rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tFarY =  (rect.center.y + rect.height / 2.0 - rayPos.y) / rayDir.y;

    float tNear = max(min(tNearX, tFarX), min(tNearY, tFarY));
    float tFar =  min(max(tNearX, tFarX), max(tNearY, tFarY));
    
    if(tNear>tFar){
        return NoIntersectionSpan;
    }

    // find closest
    if(tFar>0.0)
    {
        //exit point
        vec2 I2 = rayPos+rayDir*tFar;

        // exit normal
        vec2 N2 = vec2(0);
        if (I2.x + EPSILON >= rect.center.x - rect.width / 2.0 && I2.x - EPSILON <= rect.center.x + rect.width / 2.0 &&
            I2.y + EPSILON >= rect.center.y - rect.height / 2.0 && I2.y - EPSILON <= rect.center.y + rect.height / 2.0) {

            // Determine the normal vector based on proximity to the edges
            if (abs(I2.x - (rect.center.x - rect.width / 2.0)) < EPSILON) {
                N2 = vec2(-1.0, 0.0); // Left edge
            } else if (abs(I2.x - (rect.center.x + rect.width / 2.0)) < EPSILON) {
                N2 = vec2(1.0, 0.0); // Right edge
            } else if (abs(I2.y - (rect.center.y - rect.height / 2.0)) < EPSILON) {
                N2 = vec2(0.0, -1.0); // Bottom edge
            } else if (abs(I2.y - (rect.center.y + rect.height / 2.0)) < EPSILON) {
                N2 = vec2(0.0, 1.0); // Top edge
            }
        }

        I2 = rotate(I2, rect.angle, rect.center);
        N2 = rotate(N2, rect.angle);

        Intersection exit = Intersection(tFar, I2, N2, matId);

        if(tNear<EPSILON){
            // when the enter point is behind the ray's origin, 
            // then intersection span will begin at the rays origin
            Intersection enter = Intersection(0.0, ray.origin, vec2(0,0), matId);
            return IntersectionSpan(enter,exit);
        }

        //enter point
        vec2 I1 = rayPos+rayDir*tNear;

        // enter normal
        vec2 N1 = vec2(0.0);
        if (I1.x >= rect.center.x - rect.width / 2.0  && I1.x <= rect.center.x + rect.width / 2.0 &&
            I1.y >= rect.center.y - rect.height / 2.0 && I1.y <= rect.center.y + rect.height / 2.0) {
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

        Intersection enter = Intersection(tNear, I1, N1, matId);

        // return intersection span between the enter- and exit point
        return IntersectionSpan(enter, exit);
    }
    return NoIntersectionSpan;
}
// IntersectionSpan intersect(Rectangle rect, Ray ray, int matId) {
//     IntersectionSpan span;

//     // Translate ray to rectangle's local space
//     vec2 localRayOrigin = ray.origin - rect.center;

//     // Rotate the ray origin and direction to rectangle's local space
//     localRayOrigin = rotate(localRayOrigin, -rect.angle);
//     vec2 localRayDir = rotate(ray.direction, -rect.angle);

//     // Rectangle's half extents
//     vec2 halfExtents = vec2(rect.width * 0.5, rect.height * 0.5);

//     // Compute intersection with AABB
//     vec2 invDir = 1.0 / localRayDir;
//     vec2 tMin = (vec2(-halfExtents) - localRayOrigin) * invDir;
//     vec2 tMax = (vec2(halfExtents) - localRayOrigin) * invDir;

//     vec2 t1 = min(tMin, tMax);
//     vec2 t2 = max(tMin, tMax);

//     float tEnter = max(t1.x, t1.y);
//     float tExit = min(t2.x, t2.y);

//     if (tEnter > tExit || tExit < 0.0) {
//         // No intersection
//         return NoIntersectionSpan;
//     }

//     // Calculate intersection points and normals
//     vec2 localEnterPos = localRayOrigin + tEnter * localRayDir;
//     vec2 localExitPos = localRayOrigin + tExit * localRayDir;

//     vec2 enterNormal = normalize(localEnterPos-rect.center);
//     vec2 exitNormal = normalize(localExitPos-rect.center);

//     if(enterNormal.x>enterNormal.y){
//         enterNormal = vec2(sign(enterNormal.x),0.0);
//     }else{
//         enterNormal = vec2(0.0,sign(enterNormal.y));
//     }

//     if(exitNormal.x>exitNormal.y){
//         exitNormal = vec2(sign(exitNormal.x),0.0);
//     }else{
//         exitNormal = vec2(0.0,sign(exitNormal.y));
//     }
//     // if (abs(localEnterPos.x) > halfExtents.x - EPSILON) {
//     //     enterNormal.x = sign(localEnterPos.x);
//     // } else {
//     //     enterNormal.y = sign(localEnterPos.y);
//     // }

//     // if (abs(localExitPos.x) > halfExtents.x - EPSILON) {
//     //     exitNormal.x = sign(localExitPos.x);
//     // } else {
//     //     exitNormal.y = sign(localExitPos.y);
//     // }

//     // Transform intersection points and normals back to world space
//     span.enter.pos = rect.center + rotate(localEnterPos, rect.angle);
//     span.exit.pos = rect.center + rotate(localExitPos, rect.angle);
//     span.enter.normal = rotate(enterNormal, rect.angle);
//     span.exit.normal = rotate(exitNormal, rect.angle);

//     span.enter.t = tEnter;
//     span.exit.t = tExit;
//     span.enter.matId = matId;
//     span.exit.matId = matId;

//     // Assign material ID if needed, here we just set it to a default value
//     return span;
// }

IntersectionSpan intersectSpan(IntersectionSpan a, IntersectionSpan b)
{
    if(IsValid(a) && IsValid(b)){
        Intersection enter = a.enter;
        if(a.enter.t<b.enter.t){
            enter = b.enter;
        }

        Intersection exit = a.exit;
        if(a.exit.t>b.exit.t){
            exit = b.exit;
        }

        if(enter.t>exit.t){
            return NoIntersectionSpan;
        }
        return IntersectionSpan(enter, exit);
    }else{
        return NoIntersectionSpan;
    }
}

IntersectionSpan subtractSpan(IntersectionSpan a, IntersectionSpan b){
    // find the closest span after subtraction span
    // Warning!: Be carefull. intersecting two spans could result in two seperate spans.
    // here we only return the closest one

    if(IsValid(a) && IsValid(b))
    {
        // Possible cases
        //           AAAAAAAAA
        //  1.    bb ---------
        //  2.    bbbbbbbbbb--
        //  3.    bbbbbbbbbbbbbbbbbb
        //  4.       ----bb
        //  5.       ------bbbbbbbbb
        //  6.       --------   bb

        // Invert normals of span b
        b = IntersectionSpan(
            Intersection(b.enter.t, b.enter.pos, -b.enter.normal, b.enter.matId),
            Intersection(b.exit.t, b.exit.pos, -b.exit.normal, b.exit.matId)
        );

        // Case 1: Span b is completely before span a
        // no overlapp, return span a
        if( b.enter.t <= a.enter.t && 
            b.exit.t  < a.enter.t){
                return a;
        }

        // Case 2: Span b starts before span a and ends within span a
        if( b.enter.t <= a.enter.t &&
            b.exit.t  >  a.enter.t && 
            b.exit.t  <  a.exit.t){

            return IntersectionSpan(b.exit, a.exit);
        }

        // Case 3: Span b completely covers span a
        // no span remains
        if( b.enter.t <= a.enter.t &&
            b.exit.t  >  a.exit.t ){
            return NoIntersectionSpan;
        }

        // Case 4: Span b is completely within span a
        // keep the first part of span a
        if( b.enter.t >= a.enter.t &&
            b.exit.t  <  a.exit.t){
            return IntersectionSpan(a.enter, b.enter);
        }

        // Case 5: Span b starts within span a and ends after span a
        if( b.enter.t >= a.enter.t &&
            b.enter.t <  a.exit.t &&
            b.exit.t  >  a.exit.t ){
            return IntersectionSpan(a.enter, b.enter);
        }

        // Case 6: Span b starts after span a
        // no overlapp, return span a
        if( b.enter.t >= a.enter.t &&
            b.exit.t  >  a.exit.t
        ){
            return a;
        }
    }
    // Default return if no conditions are met
    return a;
}

IntersectionSpan intersect(SphericalLens lens, Ray ray, int matId){
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
        IntersectionSpan leftHitSpan =  intersect(leftCircle, ray, matId);
        IntersectionSpan rightHitSpan = intersect(rightCircle, ray, matId);
        IntersectionSpan boundingSpan = intersect(boundingBox, ray, matId);

        // intersect cirlces with bunding box
        return intersectSpan(boundingSpan, intersectSpan(leftHitSpan, rightHitSpan));
    }
    else
    {
        // hitspans
        IntersectionSpan leftHitSpan  = intersect(leftCircle, ray, matId);
        IntersectionSpan rightHitSpan = intersect(rightCircle, ray, matId);
        IntersectionSpan boundingSpan = intersect(boundingBox, ray, matId);

        IntersectionSpan ispan = boundingSpan;
        ispan = subtractSpan(ispan, leftHitSpan);
        ispan = subtractSpan(ispan, rightHitSpan);
        return ispan;
    }
}

IntersectionSpan intersectScene(Ray ray)
{
    IntersectionSpan ispan = NoIntersectionSpan;// HitInfo(9999.0, vec2(ray.origin+ray.direction*9999.0), vec2(0.0), -1);


    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            IntersectionSpan currentSpan;
            int matId = int(materialData[i].x);
            if(shapeData[i].x==0.0) // CIRCLE
            {
                // upack circle
                Circle circle = unpackCircle(i);
                currentSpan = intersect(circle, ray, matId);
            }
            else if(shapeData[i].x==1.0) // RECTANGLE
            {
                Rectangle rect = unpackRectangle(i);
                currentSpan = intersect(rect, ray, matId);
            }
            else if(shapeData[i].x==2.0) // SphericalLens
            {
                SphericalLens lens = unpackSphericalLens(i);
                currentSpan = intersect(lens, ray, matId);
            }
            else if(shapeData[i].x==3.0) // Triangle
            {
                Triangle triangle = unpackTriangle(i);
                currentSpan = intersect(triangle, ray, matId);
            }
            else if(shapeData[i].x==4.0) // LineSegment
            {
                Segment segment = unpackSegment(i);
                currentSpan = intersect(segment, ray, matId);
            }
            else
            {
                continue;
            }

            // Update ROUND
            if(IsValid(ispan) && IsValid(currentSpan)){
                if(currentSpan.enter.t > ispan.enter.t){
                    ispan = subtractSpan(ispan, currentSpan);
                }else{
                    ispan = subtractSpan(currentSpan, ispan);
                }
            }else if(IsValid(currentSpan)){
                ispan = currentSpan;
            }
        }
    }

    return ispan;
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
    IntersectionSpan ispan = intersectScene(incidentRay);
    Intersection hit = ispan.enter;
    if(hit.t<EPSILON){
        hit = ispan.exit;
    }

    if(hit.matId<0){
        Rectangle rect = Rectangle( roomRect.xy, 0.0, roomRect.z, roomRect.w);
        
        IntersectionSpan rectSpan = intersect(rect, incidentRay, -1);
        hit.pos = incidentRay.origin+incidentRay.direction*LARGE_NUMBER;
        hit.normal = vec2(0.0);
        // hit.pos = rectSpan.exit.pos;
        // hit.normal = rectSpan.exit.normal;
        // hit.matId = 2;
    }

    gl_FragData[0] = vec4(hit.pos, hit.normal);
    gl_FragData[1] = vec4(float(hit.matId), 0.0,0.0,0.0);

}