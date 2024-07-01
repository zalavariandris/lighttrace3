#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159
#define EPSILON 0.001
#define LARGE_NUMBER 9999.0

#define MATERIAL_NOTHING -1
#define MATERIAL_MIRROR 1
#define MATERIAL_GLASS 2
#define MATERIAL_DIFFUSE 3

#define MAX_SHAPES 16

uniform float SEED;
uniform vec2 resolution;
uniform sampler2D rayTransformTexture;
uniform sampler2D rayPropertiesTexture;
uniform sampler2D randomNumberPerRay;
uniform sampler2D spectralTexture;

uniform vec4 roomRect;
uniform float shapesCount;
uniform sampler2D CSGTexture;

/* ***** *
 * UTILS *
 * ***** */
float PHI = 1.61803398874989484820459;  // Φ = Golden Ratio
float gold_noise(vec2 xy, float seed){
    return fract(tan(distance(xy*PHI, xy)*seed));
}

vec4 texelFetchByIdx(sampler2D texture, vec2 resolution, float texelIdx)
{
    float pixelX = mod(texelIdx, resolution.x);
    float pixelY = floor(texelIdx / resolution.x);
    vec2 texCoords = (vec2(pixelX, pixelY) + 0.5) / resolution;
    return texture2D(texture, texCoords);
}

float rand(){
    float delta = texture2D(randomNumberPerRay, gl_FragCoord.xy/resolution).x;
    return delta;
    return gold_noise(gl_FragCoord.xy, SEED+delta);
}

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

/* ************ *
 * The Lightray *
 * ************ */
struct Ray{
    vec2 origin;
    vec2 direction;
    float intensity;
    float wavelength;
};

const Ray NoRay = Ray(vec2(0.0), vec2(0.0), 0.0, 0.0);

bool IsValid(Ray ray){
    return ray!=NoRay;
}

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

/* ****** *
 * SHAPES *
 * ****** */
struct Circle{
    vec2 center;
    float radius;
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

struct Segment{
    vec2 A;
    vec2 B;
};

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

/* ********************** *
 * UNPACK SHAPES FROM CSG *
 * ********************** */
#define SHAPE_CIRCLE 0
#define SHAPE_RECTANGLE 1
#define SHAPE_SPHERICAL_LENS 2
#define SHAPE_TRIANGLE 3
#define SHAPE_LINE_SEGMENT 4
int unpackShapeType(int i){
    return int(texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).x);
}

Circle unpackCircle(int i){
        vec2 center = texelFetchByIdx(CSGTexture, vec2(MAX_SHAPES,3.0), float(i)).xy;
        float radius = texelFetchByIdx(CSGTexture, vec2(MAX_SHAPES,3.0), float(MAX_SHAPES+i)).y;
        return Circle(
            center,
            radius
        );
}

Segment unpackSegment(int i){
    vec2 center =  texelFetchByIdx(CSGTexture, vec2(MAX_SHAPES,3.0), float(i)).xy;
    float angle =  texelFetchByIdx(CSGTexture, vec2(MAX_SHAPES,3.0), float(i)).z;
    float length = texelFetchByIdx(CSGTexture, vec2(MAX_SHAPES,3.0), float(MAX_SHAPES+i)).y;
    float x1 = center.x - cos(angle)*length/2.0;
    float y1 = center.y - sin(angle)*length/2.0;
    float x2 = center.x + cos(angle)*length/2.0;
    float y2 = center.y + sin(angle)*length/2.0;
    return Segment(
        vec2(x1,y1), 
        vec2(x2,y2)
    );
}

Rectangle unpackRectangle(int i){
    vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
    float angle = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).z;
    float width = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
    float height = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).z;
    return Rectangle(center, 
                    angle, 
                    width, 
                    height);
}

Triangle unpackTriangle(int i){
    vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
    float angle = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).z;
    float size = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
    return Triangle(center, 
                        angle, 
                        size);
}

SphericalLens unpackSphericalLens(int i){
    vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
    float angle = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).z;
    float dimeter = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
    float centerThickness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).w;
    float edgeThickness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).z;
    return SphericalLens(center, 
                        angle, 
                        dimeter, 
                        centerThickness, 
                        edgeThickness);
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
        if (tFar > EPSILON) {
            //exit point
            vec2 I2 = ray.origin+ray.direction*tFar;

            // exit normal
            vec2 N2 = (I2-circle.center);
            N2=normalize(N2);


            Intersection exit = Intersection(tFar, I2, N2, matId);

            if (tNear<EPSILON) {
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

    if (0.0 < tNear && 0.0 <= tLine && tLine <=1.0) {
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
Intersection lineIntersect(Segment line, Ray ray, int matId) {
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

    if (EPSILON <= tNear && 0.0 <= tLine && tLine <=1.0) {
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
    if (IsValid(I1) && I1.t<tEnter) {
        tEnter=I1.t;
        nEnter=I1.normal;
    }
    if (IsValid(I2) && I2.t<tEnter) {
        tEnter=I2.t;
        nEnter=I2.normal;
    }
    if (IsValid(I3) && I3.t<tEnter) {
        tEnter=I3.t;
        nEnter=I3.normal;
    }

        // find farthest exit intersection
    float tExit = tEnter;
    vec2 nExit = vec2(0.0,0.0);
    if (IsValid(I1) && I1.t>tExit) {
        tExit=I1.t;
        nExit=I1.normal;
    }
    if (IsValid(I2) && I2.t>tExit) {
        tExit=I2.t;
        nExit=I2.normal;
    }
    if (IsValid(I3) && I3.t>tExit) {
        tExit=I3.t;
        nExit=I3.normal;
    }

    if (tEnter>tExit) {
        return NoIntersectionSpan;
    }
    if (tEnter==LARGE_NUMBER) {
        return NoIntersectionSpan;
    }

    vec2 IEnter = ray.origin+ray.direction*tEnter;
    vec2 IExit = ray.origin+ray.direction*tExit;

    if (tExit==tEnter) {
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
    // ray in local space
    vec2 rayPos = rotate(ray.origin, -rect.angle, rect.center);
    vec2 rayDir = rotate(ray.direction, -rect.angle);

    // calc rectangle intersection with a ray
    float tNearX = (rect.center.x - rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tNearY = (rect.center.y - rect.height / 2.0 - rayPos.y) / rayDir.y;
    float tFarX =  (rect.center.x + rect.width  / 2.0 - rayPos.x) / rayDir.x;
    float tFarY =  (rect.center.y + rect.height / 2.0 - rayPos.y) / rayDir.y;

    float tNear = max(min(tNearX, tFarX), min(tNearY, tFarY));
    float tFar =  min(max(tNearX, tFarX), max(tNearY, tFarY));

    // if no intersection with the rectangle then return null
    if (tFar<0.0 || tNear>tFar) return NoIntersectionSpan;
    
    // Calculate Exit intersection point
    vec2 I2 = rayPos+rayDir*tFar;

    // calc exit normal
    vec2 N2 = normalize(I2-rect.center); 
    if (abs(N2.x)/abs(N2.y)>rect.width/rect.height)
        N2 = vec2(sign(N2.x), 0.0);
    else
        N2 = vec2(0.0, sign(N2.y));
    
    // create Intersection in world space
    Intersection exit = Intersection(tFar, rotate(I2, rect.angle, rect.center), rotate(N2, rect.angle), matId);

    if (tNear<EPSILON) {
        // when the enter point is behind the ray's origin, 
        // then intersection span will begin at the rays origin
        Intersection enter = Intersection(0.0, ray.origin, vec2(0,0), matId);
        return IntersectionSpan(enter,exit);
    }

    // Calculate Enter intersection point
    vec2 I1 = rayPos+rayDir*tNear;

    // calc enter normal
    vec2 N1 = normalize(I1-rect.center);
    if (abs(N1.x)/abs(N1.y) > rect.width/rect.height)
        N1 = vec2(sign(N1.x), 0.0);
    else
        N1 = vec2(0.0, sign(N1.y));
    
    // Intersection in world space
    Intersection enter = Intersection(tNear, rotate(I1, rect.angle, rect.center), rotate(N1, rect.angle), matId);

    // return intersection span between the enter- and exit points
    return IntersectionSpan(enter, exit);
}


IntersectionSpan intersectSpan(IntersectionSpan a, IntersectionSpan b)
{
    if (IsValid(a) && IsValid(b)) {
        Intersection enter = a.enter;
        if (a.enter.t<b.enter.t) {
            enter = b.enter;
        }

        Intersection exit = a.exit;
        if (a.exit.t>b.exit.t) {
            exit = b.exit;
        }

        if (enter.t>exit.t) {
            return NoIntersectionSpan;
        }
        return IntersectionSpan(enter, exit);
    }
    else {
        return NoIntersectionSpan;
    }
}

IntersectionSpan subtractSpan(IntersectionSpan a, IntersectionSpan b){
    // find the closest span after subtraction span
    // Warning!: Be carefull. intersecting two spans could result in two seperate spans.
    // here we only return the closest one

    if (IsValid(a) && IsValid(b)) {
        // Possible cases
        //           AAAAAAAAA
        //  1.    bb ---------
        //  2.    bbbbbbbbbb--
        //  3.    bbbbbbbbbbbbbbbb
        //  4.       ----bb
        //  5.       ------bbbbbbb
        //  6.       ---------  bb

        // Invert normals of span b
        b = IntersectionSpan(
            Intersection(b.enter.t, b.enter.pos, -b.enter.normal, b.enter.matId),
            Intersection(b.exit.t, b.exit.pos, -b.exit.normal, b.exit.matId)
        );

        // Case 1: Span b is completely before span a
        // no overlapp, return span a
        if (b.enter.t <= a.enter.t && 
            b.exit.t  < a.enter.t) {
            return a;
        }

        // Case 2: Span b starts before span a and ends within span a
        if (b.enter.t <= a.enter.t &&
            b.exit.t  >  a.enter.t && 
            b.exit.t  <  a.exit.t) {
            return IntersectionSpan(b.exit, a.exit);
        }

        // Case 3: Span b completely covers span a
        // no span remains
        if (b.enter.t <= a.enter.t &&
            b.exit.t  >  a.exit.t ) {
            return NoIntersectionSpan;
        }

        // Case 4: Span b is completely within span a
        // keep the first part of span a
        if (b.enter.t >= a.enter.t &&
            b.exit.t  <  a.exit.t) {
            return IntersectionSpan(a.enter, b.enter);
        }

        // Case 5: Span b starts within span a and ends after span a
        if (b.enter.t >= a.enter.t &&
            b.enter.t <  a.exit.t &&
            b.exit.t  >  a.exit.t ) {
            return IntersectionSpan(a.enter, b.enter);
        }

        // Case 6: Span b starts after span a
        // no overlapp, return span a
        if (b.enter.t >= a.enter.t &&
            b.exit.t  >  a.exit.t) {
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
    if (IsConvex) {
        // hitspans
        IntersectionSpan leftHitSpan =  intersect(leftCircle, ray, matId);
        IntersectionSpan rightHitSpan = intersect(rightCircle, ray, matId);
        IntersectionSpan boundingSpan = intersect(boundingBox, ray, matId);

        // intersect cirlces with bunding box
        return intersectSpan(boundingSpan, intersectSpan(leftHitSpan, rightHitSpan));
    }
    else {
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

IntersectionSpan intersectScene(Ray ray){
    // Ray adjustedRay = Ray(ray.pos+ray.dir*EPSILON, ray.dir, ray.intensity, ray.wavelength);
    IntersectionSpan ispan = NoIntersectionSpan;
    for(int i=0;i<MAX_SHAPES;i++)
    {
        IntersectionSpan currentSpan;
        int shapeType = unpackShapeType(i);
        if(shapeType==SHAPE_CIRCLE) {// CIRCLE
            Circle circle = unpackCircle(i);
            currentSpan = intersect(circle, ray, i);
        }
        else if(shapeType==SHAPE_RECTANGLE) {
            Rectangle rect = unpackRectangle(i);
            currentSpan = intersect(rect, ray, i);
        }
        else if(shapeType==SHAPE_SPHERICAL_LENS) {// SphericalLens
            SphericalLens lens = unpackSphericalLens(i);
            currentSpan = intersect(lens, ray, i);
        }
        else if(shapeType==SHAPE_TRIANGLE) {// Triangle
            Triangle triangle = unpackTriangle(i);
            currentSpan = intersect(triangle, ray, i);
        }
        else if(shapeType==SHAPE_LINE_SEGMENT) { // LineSegment
            Segment line = unpackSegment(i);
            currentSpan = intersect(line, ray, i);
        }
        else {
            continue;
        }

        // Reduce
        if (IsValid(ispan) && IsValid(currentSpan)) {
            if (currentSpan.enter.t > ispan.enter.t) {
                ispan = subtractSpan(ispan, currentSpan);
            }
            else {
                ispan = subtractSpan(currentSpan, ispan);
            }
        }
        else if (IsValid(currentSpan)) {
            ispan = currentSpan;
        }
    }
    return ispan;
}

/* ******** * 
 * MATERIAL *
 * ******** */
/* sample mirror material
 * @param wi[vec2]: incident ray direction in tangent space. x: perpendicular to surface tangent. y:parallel to surface tangent
 */

int unpackMaterialType(int shapeIdx){
    return int(texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).x);
}

vec2 sampleMirror(vec2 wi){
    return vec2(-wi.x, wi.y); 
}

float cauchyEquation(float A, float B, float lambda) {
    return A + (B / (lambda * lambda));
}

float sellmeierEquation(vec3 b, vec3 c, float lambda)
{
    // Calculate the square of the wavelength
    float lambdaSq = lambda * lambda;

    // Calculate the refractive index using the Sellmeier equation
    float nSq = 1.0;
    nSq += (b[0] * lambdaSq) / (lambdaSq - c[0]);
    nSq += (b[1] * lambdaSq) / (lambdaSq - c[1]);
    nSq += (b[2] * lambdaSq) / (lambdaSq - c[2]);

    // Return the square root of the refractive index squared
    return sqrt(nSq);
}

vec2 sampleDiffuse(vec2 wi)
{
    // float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    float x = rand()*2.0 - 1.0;
    float y = sqrt(1.0 - x*x);
    return vec2(x, y*sign(wi.y));
}

vec2 sampleDielectric(vec2 wi, float ior) 
{
    float eta = wi.y > 0.0 ? ior : 1.0 / ior;
    float sinThetaTSq = eta * eta * (1.0 - abs(wi.y) * abs(wi.y));

    float cosThetaT;
    float fresnell;
    if (sinThetaTSq > 1.0+EPSILON) 
    {
        cosThetaT = 0.0;
        fresnell = 1.0;
    } 
    else 
    {
        float cosThetaI = abs(wi.y);
        cosThetaT = sqrt(1.0 - sinThetaTSq);
        
        float Rs = (eta * cosThetaI - cosThetaT) / (eta * cosThetaI + cosThetaT);
        float Rp = (eta * cosThetaT - cosThetaI) / (eta * cosThetaT + cosThetaI);
    
        fresnell = (Rs * Rs + Rp * Rp) * 0.5;
    }

    // float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    if (rand() <= fresnell) 
    {
        return vec2(-wi.x, wi.y);
    }
    else 
    {
        return vec2(-wi.x * eta, -cosThetaT * sign(wi.y));
    }
}

vec2 snellsLaw(vec2 wi, float ior) 
{
    float eta = wi.y > 0.0 ? ior : 1.0 / ior;
    float sinThetaTSq = eta * eta * (1.0 - wi.y * wi.y);

    if (sinThetaTSq > 1.0) 
    {
        // Total internal reflection
        return vec2(-wi.x, wi.y);
    } 
    else 
    {
        float cosThetaT = sqrt(1.0 - sinThetaTSq);
        return vec2(-wi.x * eta, -cosThetaT * sign(wi.y));
    }
}

/* ******** *
 * RAYTRACE *
 * ******** */



Ray bounceRay(Ray ray, Intersection intersection){
    Ray secondary = NoRay;
    if(IsValid(intersection))
    {
        // int shapeIdx = intersection.

        /* ********** *
         * BOUNCE RAY *
         * ********** */
        vec2 tangent = vec2(-intersection.normal.y, intersection.normal.x); // 90deg rotation
        vec2 wiLocal = vec2(
            dot(tangent, ray.direction), 
            dot(intersection.normal, ray.direction)
        );  // tangent space exiting r\y directiuon
        
        // calculate exit direction in local space
        vec2 woLocal; // tangent space exit ray direction
        int materialType = unpackMaterialType(intersection.matId);
        if(materialType==MATERIAL_MIRROR) {
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+intersection.matId)).y;
            woLocal = sampleMirror(wiLocal);
        }
        else if(materialType==MATERIAL_GLASS) {
            // vec3 b = vec3(1.03961212, 0.231792344, 1.01046945);
            // vec3 c = vec3(0.00600069867, 0.0200179144, 103.560653);
            // float sellmeierIor =  sellmeierEquation(b, c, ray.wavelength*1e-3);
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+intersection.matId)).y;
            float ior = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+intersection.matId)).z;
            float dispersion = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+intersection.matId)).w;

            float cauchyIor =  cauchyEquation(ior, dispersion, ray.wavelength*1e-3);
            woLocal = sampleDielectric(wiLocal, cauchyIor);
        }
        else if(materialType==MATERIAL_DIFFUSE) {
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+intersection.matId)).y;
            woLocal = sampleDiffuse(wiLocal);
        }
        else {
            woLocal = -wiLocal;
        }
        
        vec2 woWorld = woLocal.y*intersection.normal + woLocal.x*tangent; // worldSpace exiting r\y directiuon

        secondary = Ray(intersection.pos, -woWorld, ray.intensity, ray.wavelength);

    }else{
        return NoRay;
        /* rayColor */     // gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        // gl_FragData[5] = vec4(ray.pos, ray.pos+ray.dir*9999.0);
    }

    return secondary;
}

/* ************** *
 * SPECTRAL COLOR *
 * ************** */
// Wavelength to RGB
// Created by Alan Zucconi
// spurce: https://www.alanzucconi.com/2017/07/15/improving-the-rainbow-2/
float saturate (float x)
{
    return min(1.0, max(0.0,x));
}
vec3 saturate (vec3 x)
{
    return min(vec3(1.,1.,1.), max(vec3(0.,0.,0.),x));
}
vec3 bump3y (vec3 x, vec3 yoffset)
{
	vec3 y = vec3(1.,1.,1.) - x * x;
    y = y-yoffset;
	y = saturate(y);
	return y;
}
vec3 spectral_zucconi6 (float w)
{
    // w: [400, 700]
    // x: [0,   1]
    float x = saturate((w - 400.0)/ 300.0);

    vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
    vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
    vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);

    vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
    vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
    vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);

    return
        bump3y(c1 * (x - x1), y1) +
        bump3y(c2 * (x - x2), y2) ;
}

    // vec3 hueToLinearRGB(float hue) {
    //     // hue is expected to be in the range [0, 1]
    //     float r = abs(hue * 6.0 - 3.0) - 1.0;
    //     float g = 2.0 - abs(hue * 6.0 - 2.0);
    //     float b = 2.0 - abs(hue * 6.0 - 4.0);
    //     return vec3(clamp(r, 0.0, 1.0), clamp(g, 0.0, 1.0), clamp(b, 0.0, 1.0));
    // }

vec3 spectralMap(float wavelength)
{
    // Calculate a random wavelength directly
    // float randL = rand();
    // float lambda = 360.0 + (750.0 - 360.0) * randL;
    
    // Convert wavelength to a spectrum offset assuming Spectrum texture is mapped linearly to wavelengths
    float spectrumOffset = (wavelength - 360.0) / (750.0 - 360.0);

    // Sample the spectrum texture to get RGB values
    vec3 color = texture2D(spectralTexture, vec2(spectrumOffset, 0.5)).rgb;
    return color;
    // float x = saturate((wavelength - 400.0)/ 300.0);
    // vec4 rgba = texture2D(spectralTexture, vec2(x, 0.5));
    // return rgba;
}

// Convert wavelength in nanometers to RGB using a perceptually accurate method
vec3 RGBFromWavelength(float wavelength) {
    return spectralMap(wavelength);
    vec3 RGB = spectral_zucconi6(wavelength);
    return RGB;
}

void main()
{
    // unpack ray from data texture
    Ray ray = getCurrentRay();


    IntersectionSpan ispan = intersectScene(ray);

    if(!IsValid(ispan)){
        Rectangle room = Rectangle( roomRect.xy, 0.0, roomRect.z, roomRect.w);
        ispan = intersect(room, ray, -1);

    }

    if(IsValid(ispan))
    {
        Intersection intersection;
        if(ispan.enter.t>EPSILON){
            intersection = ispan.enter;
        }else{
            intersection = ispan.exit;
        };

        Ray secondary = bounceRay(ray, intersection);

        // pack data
        /* rayTransform */  gl_FragData[0] = vec4(secondary.origin,secondary.direction);
        /* rayProperties */ gl_FragData[1] = vec4(secondary.intensity, secondary.wavelength, 0, 0);
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        /* hitPoint */      gl_FragData[3] = vec4(intersection.pos, intersection.normal);
        /* hitSpan */       gl_FragData[4] = vec4(ispan.enter.pos, ispan.exit.pos);
        /* rayPath */       gl_FragData[5] = vec4(ray.origin, intersection.pos);
    }else{
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
         /* rayPath */  gl_FragData[5] = vec4(ray.origin, ray.origin+ray.direction*9999.0);
    }
}

