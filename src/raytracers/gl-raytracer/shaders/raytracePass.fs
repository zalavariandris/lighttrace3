#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159
#define MAX_CIRCLES 10
#define MAX_SHAPES 10
#define EPSILON 0.001
#define LARGE_NUMBER 9999.0

#define MATERIAL_NOTHING -1
#define MATERIAL_MIRROR 1
#define MATERIAL_GLASS 2
#define MATERIAL_DIFFUSE 3

#define SHAPE_CIRCLE 0
#define SHAPE_RECTANGLE 1
#define SHAPE_SPHERICAL_LENS 2
#define SHAPE_TRIANGLE 3
#define SHAPE_LINE_SEGMENT 4

uniform float SEED;
uniform vec2 resolution;
uniform sampler2D rayTransformTexture;
uniform sampler2D rayPropertiesTexture;
uniform sampler2D randomNumberPerRay;
uniform sampler2D spectralTexture;


uniform float shapesCount;
uniform vec3 CSGTransformData[MAX_SHAPES];
uniform vec4 CSGShapeData[MAX_SHAPES];
uniform vec4 CSGMaterialData[MAX_SHAPES];

float PHI = 1.61803398874989484820459;  // Φ = Golden Ratio
float gold_noise(vec2 xy, float seed){
    return fract(tan(distance(xy*PHI, xy)*seed));
}

float rand(){
    return gold_noise(gl_FragCoord.xy, SEED+5.0);
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

HitSpan InvalidHitSpan = HitSpan(
    HitInfo(LARGE_NUMBER, vec2(0,0), vec2(0,0), MATERIAL_NOTHING), 
    HitInfo(-LARGE_NUMBER, vec2(0,0), vec2(0,0), MATERIAL_NOTHING)
);

bool IsValidSpan(HitSpan ispan){
    return ispan.enter.t < ispan.exit.t;
}

struct Circle{
    vec2 center;
    float r;
};

struct Line{
    vec2 A;
    vec2 B;
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

HitSpan hitCircle(Ray ray, Circle circle)
{
    vec2 u = ray.pos-circle.center;

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
            vec2 N2 = (I2-circle.center);
            N2*=1.0/length(N2);

            // exit info
            HitInfo exit = HitInfo(tFar, I2, N2, MATERIAL_NOTHING);

            if(tNear<0.0)
            {
                return HitSpan(
                    HitInfo(0.0, ray.pos, vec2(0.0, 1.0), MATERIAL_NOTHING), 
                    exit
                );
            }

            // enter point
            vec2 I1 = ray.pos+ray.dir*tNear;

            // enter normal
            vec2 N1 = normalize(I1-circle.center);

            //enter info
            HitInfo enter = HitInfo(tNear, I1, N1, MATERIAL_NOTHING);

            // intersection span
            return HitSpan(enter, exit);
        }
    }

    return InvalidHitSpan;
}

struct Intersection{
    float t;
    vec2 normal;
};
bool isValidIntersection(Intersection i){
    return i.t>=0.0;
}

Intersection lineIntersection(Ray ray, Line line)
{
    vec2 tangent = line.B-line.A;

    // Calculate the determinant
    float determinant = ray.dir.x * tangent.y- ray.dir.y * tangent.x;

    if (abs(determinant) < EPSILON){
        // ray and line are parallel
        return Intersection(-1.0, vec2(0.0));
    }

    // Calculate the intersection along the ray
    float tNear = ((line.A.x - ray.pos.x) * tangent.y - (line.A.y - ray.pos.y) * tangent.x) / determinant;
    // Calculate intersection along the line
    float tLine = ((line.A.x - ray.pos.x) * ray.dir.y - (line.A.y - ray.pos.y) * ray.dir.x) / determinant;

    if(0.0 < tNear && 0.0 <= tLine && tLine <=1.0)
    {
        vec2 N = vec2(-tangent.y, tangent.x);
        N = normalize(-N);
        return Intersection(tNear, N);
    }

    return Intersection(-1.0, vec2(0.0));
}

HitSpan hitTriangle(Ray ray, Triangle triangle){
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

    Intersection I1 = lineIntersection(ray, segmentA);
    Intersection I2 = lineIntersection(ray, segmentB);
    Intersection I3 = lineIntersection(ray, segmentC);

    // find closest entry intersection
    float tEnter = LARGE_NUMBER;
    vec2 nEnter = vec2(0.0,0.0);
    if(isValidIntersection(I1) && I1.t<tEnter){
        tEnter=I1.t;
        nEnter=I1.normal;
    }
    if(isValidIntersection(I2) && I2.t<tEnter){
        tEnter=I2.t;
        nEnter=I2.normal;
    }
    if(isValidIntersection(I3) && I3.t<tEnter){
        tEnter=I3.t;
        nEnter=I3.normal;
    }

        // find farthest exit intersection
    float tExit = tEnter;
    vec2 nExit = vec2(0.0,0.0);
    if(isValidIntersection(I1) && I1.t>tExit){
        tExit=I1.t;
        nExit=I1.normal;
    }
    if(isValidIntersection(I2) && I2.t>tExit){
        tExit=I2.t;
        nExit=I2.normal;
    }
    if(isValidIntersection(I3) && I3.t>tExit){
        tExit=I3.t;
        nExit=I3.normal;
    }

    if(tEnter>tExit){
        return InvalidHitSpan;
    }
    if(tEnter==LARGE_NUMBER){
        return InvalidHitSpan;
    }

    if(tExit==tEnter){
        return HitSpan(
            HitInfo(0.0, ray.pos, vec2(0.0), MATERIAL_NOTHING),
            HitInfo(tEnter,  ray.pos+ray.dir*tEnter, nEnter, MATERIAL_NOTHING)
        );
    }

    return HitSpan(
        HitInfo(tEnter, ray.pos+ray.dir*tEnter, nEnter, MATERIAL_NOTHING),
        HitInfo(tExit,  ray.pos+ray.dir*tExit,  nExit, MATERIAL_NOTHING)
    );
}

HitSpan hitRectangle(Ray ray, Rectangle rect)
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
        return InvalidHitSpan;
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
        HitInfo exit = HitInfo(tFar, I2, N2, MATERIAL_NOTHING);

        if(tNear<0.0){
            // when the enter point is behind the ray's origin, 
            // then intersection span will begin at the rays origin
            HitInfo enter = HitInfo(0.0, ray.pos, vec2(0,0), MATERIAL_NOTHING);
            return HitSpan(enter,exit);
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

        HitInfo enter = HitInfo(tNear, I1, N1, MATERIAL_NOTHING);

        // return intersection span between the enter- and exit point
        return HitSpan(enter, exit);
    }
    return InvalidHitSpan;
}

HitSpan hitLine(Ray ray, Line line){
    float tangentX = line.B.x-line.A.x;
    float tangentY = line.B.y-line.A.y;

    // Calculate the determinant
    float determinant = ray.dir.x * tangentY - ray.dir.y * tangentX;

    if (abs(determinant) < EPSILON){
        return InvalidHitSpan;
    }

    if(determinant>0.0){ // from outside

    }else{ // from inside

    }

    // Calculate the intersection along the ray
    float tNear = ((line.A.x - ray.pos.x) * tangentY - (line.A.y - ray.pos.y) * tangentX) / determinant;

    // Calculate intersection along the line
    float tLine = ((line.A.x - ray.pos.x) * ray.dir.y - (line.A.y - ray.pos.y) * ray.dir.x) / determinant;
    
    if(tNear<=0.0 || tLine<=0.0 || tLine>=1.0){
        return InvalidHitSpan;
    }

    vec2 I = ray.pos+ray.dir*tNear;
    vec2 N = vec2(-tangentY, tangentX);
    N = normalize(-N);

    return HitSpan(
        HitInfo(tNear, I, N, MATERIAL_NOTHING),
        HitInfo(tNear+1.0, I, -N, MATERIAL_NOTHING)
    );
}

HitSpan intersectSpan(HitSpan a, HitSpan b)
{
    if(IsValidSpan(a) && IsValidSpan(b)){
        HitInfo enter = a.enter;
        if(a.enter.t<b.enter.t){
            enter = b.enter;
        }

        HitInfo exit = a.exit;
        if(a.exit.t>b.exit.t){
            exit = b.exit;
        }

        if(enter.t>exit.t){
            return InvalidHitSpan;
        }
        return HitSpan(enter, exit);
    }else{
        return InvalidHitSpan;
    }
}

HitSpan subtractSpan(HitSpan a, HitSpan b){
    // find the closest span after subtraction span
    // Warning!: Be carefull. intersecting two spans could result in two seperate spans.
    // here we only return the closest one

    if(IsValidSpan(a) && IsValidSpan(b))
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
        b = HitSpan(
            HitInfo(b.enter.t,b.enter.pos,-b.enter.normal, b.enter.material),
            HitInfo(b.exit.t,b.exit.pos,-b.exit.normal, b.enter.material)
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

            return HitSpan(b.exit, a.exit);
        }

        // Case 3: Span b completely covers span a
        // no span remains
        if( b.enter.t <= a.enter.t &&
            b.exit.t  >  a.exit.t ){
            return InvalidHitSpan;
        }

        // Case 4: Span b is completely within span a
        // keep the first part of span a
        if( b.enter.t >= a.enter.t &&
            b.exit.t  <  a.exit.t){
            return HitSpan(a.enter, b.enter);
        }

        // Case 5: Span b starts within span a and ends after span a
        if( b.enter.t >= a.enter.t &&
            b.enter.t <  a.exit.t &&
            b.exit.t  >  a.exit.t ){
            return HitSpan(a.enter, b.enter);
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

HitSpan hitSphericalLens(Ray ray, SphericalLens lens){
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
        HitSpan leftHitSpan = hitCircle(ray, leftCircle);
        HitSpan rightHitSpan = hitCircle(ray, rightCircle);
        HitSpan boundingSpan = hitRectangle(ray, boundingBox);

        // intersect cirlces with bunding box
        return intersectSpan(boundingSpan, intersectSpan(leftHitSpan, rightHitSpan));
    }
    else
    {
        // hitspans
        HitSpan leftHitSpan = hitCircle(ray, leftCircle);
        HitSpan rightHitSpan = hitCircle(ray, rightCircle);
        HitSpan boundingSpan = hitRectangle(ray, boundingBox);

        HitSpan ispan = boundingSpan;
        ispan = subtractSpan(ispan, leftHitSpan);
        ispan = subtractSpan(ispan, rightHitSpan);
        return ispan;
    }
}

HitSpan hitScene(Ray ray)
{
    Ray adjustedRay = Ray(ray.pos+ray.dir*EPSILON, ray.dir, ray.intensity, ray.wavelength);
    HitSpan sceneHitSpan = InvalidHitSpan;
            
    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            vec2 center = CSGTransformData[i].xy;
            float angle = CSGTransformData[i].z;
            int shapeType = int(CSGShapeData[i].x);
            int materialType = int(CSGMaterialData[i].x);

            HitSpan shapeHitSpan;
            if(shapeType==SHAPE_CIRCLE) // CIRCLE
            {

                Circle circle = Circle(
                    CSGTransformData[i].xy,
                    CSGShapeData[i].y
                );
                shapeHitSpan = hitCircle(adjustedRay, circle);
            }
            else if(shapeType==SHAPE_RECTANGLE) // RECTANGLE
            {
                // upack rectangle
                Rectangle rect = Rectangle(center, 
                                            angle, 
                                            CSGShapeData[i].y, 
                                           CSGShapeData[i].z);
                // intersect Rectangle
                shapeHitSpan = hitRectangle(adjustedRay , rect);
            }

            else if(shapeType==SHAPE_SPHERICAL_LENS) // SphericalLens
            {
                SphericalLens lens = SphericalLens(center, 
                                                    angle, 
                                                 CSGShapeData[i].y, 
                                           CSGShapeData[i].w,
                                            CSGShapeData[i].z);
                shapeHitSpan = hitSphericalLens(adjustedRay, lens);
            }
            else if(shapeType==SHAPE_TRIANGLE) // Triangle
            {
                Triangle triangle = Triangle(center, 
                                           angle, 
                                           CSGShapeData[i].y);
                shapeHitSpan = hitTriangle(adjustedRay, triangle);
            }
            else if(shapeType==SHAPE_LINE_SEGMENT) // LineSegment
            {
                float length = CSGShapeData[i].y;
                float x1 = center.x - cos(angle)*length/2.0;
                float y1 = center.y - sin(angle)*length/2.0;
                float x2 = center.x + cos(angle)*length/2.0;
                float y2 = center.y + sin(angle)*length/2.0;
                Line line = Line(
                    vec2(x1,y1), 
                    vec2(x2,y2)
                );
                shapeHitSpan = hitLine(adjustedRay, line);
            }
            else
            {
                continue;
            }

            /* Set intersection material from current shape */
            if(IsValidSpan(shapeHitSpan)){
                shapeHitSpan.enter.material = materialType;
                shapeHitSpan.exit.material = materialType;
            }

            // get closest hit
            if(IsValidSpan(shapeHitSpan) && IsValidSpan(sceneHitSpan))
            {
                if(shapeHitSpan.enter.t>sceneHitSpan.enter.t)
                {
                    sceneHitSpan = subtractSpan(sceneHitSpan, shapeHitSpan);
                }
                else
                {
                    sceneHitSpan = subtractSpan(shapeHitSpan, sceneHitSpan);
                } 
            }
            else if(IsValidSpan(shapeHitSpan))
            {
                sceneHitSpan = shapeHitSpan;
            }
        }
    }
    return sceneHitSpan;
}

/* MATERIAL */
/* sample mirror material
 * @param wi[vec2]: incident ray direction in tangent space. x: perpendicular to surface tangent. y:parallel to surface tangent
 */
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
    float eta = wi.y < 0.0 ? ior : 1.0 / ior;
    float sinThetaTSq = eta * eta * (1.0 - abs(wi.y) * abs(wi.y));

    float cosThetaT;
    float fresnell;
    if (sinThetaTSq > 1.0) 
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
    if (rand() < fresnell) 
    {
        return vec2(-wi.x, wi.y);
    }
    else 
    {
        return vec2(-wi.x * eta, -cosThetaT * sign(wi.y));
    }
}

Ray bounceRay(Ray ray, HitInfo hitInfo)
{
    vec2 tangent = vec2(-hitInfo.normal.y, hitInfo.normal.x); // 90deg rotation
    vec2 wiLocal = -vec2(dot(tangent, ray.dir), dot(hitInfo.normal, ray.dir));  // tangent space exiting r\y directiuon
    
    // calculate exit direction in local space
    vec2 woLocal; // tangent space exit ray direction
    if(hitInfo.material==MATERIAL_MIRROR)
    {
        woLocal = sampleMirror(wiLocal);
    }
    else if(hitInfo.material==MATERIAL_GLASS)
    {
        vec3 b = vec3(1.03961212, 0.231792344, 1.01046945);
        vec3 c = vec3(0.00600069867, 0.0200179144, 103.560653);
        float sellmeierIor =  sellmeierEquation(b, c, ray.wavelength*1e-3);
        float cauchyIor =  cauchyEquation(1.44, 0.02, ray.wavelength*1e-3);
        woLocal = sampleDielectric(wiLocal, cauchyIor);
    }
    else if(hitInfo.material==MATERIAL_DIFFUSE)
    {
        woLocal = sampleDiffuse(wiLocal);
    }
    else
    {
        woLocal = sampleMirror(wiLocal);
        woLocal = vec2(0.0,1.0);
    }
    
    vec2 woWorld = woLocal.y*hitInfo.normal + woLocal.x*tangent; // worldSpace exiting r\y directiuon
    return Ray(hitInfo.pos, woWorld, ray.intensity, ray.wavelength);
}

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



vec3 hueToLinearRGB(float hue) {
    // hue is expected to be in the range [0, 1]
    float r = abs(hue * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(hue * 6.0 - 2.0);
    float b = 2.0 - abs(hue * 6.0 - 4.0);
    return vec3(clamp(r, 0.0, 1.0), clamp(g, 0.0, 1.0), clamp(b, 0.0, 1.0));
}

vec3 spectralMap(float wavelength)
{
    // Calculate a random wavelength directly
    float randL = rand();
    float lambda = 360.0 + (750.0 - 360.0) * randL;
    
    // Convert wavelength to a spectrum offset assuming Spectrum texture is mapped linearly to wavelengths
    float spectrumOffset = (lambda - 360.0) / (750.0 - 360.0);

    // Sample the spectrum texture to get RGB values
    vec4 color = texture2D(spectralTexture, vec2(spectrumOffset, 0.5));
    return color.rgb;
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

    // hit scene
    HitSpan ispan = hitScene(ray);

    if(IsValidSpan(ispan))
    {
        HitInfo hitInfo = ispan.enter;
        if(hitInfo.t<EPSILON){
            hitInfo = ispan.exit;
        };


        // bounce ray
        Ray secondary = bounceRay(ray, hitInfo);

        // pack data
        /* rayTransform */  gl_FragData[0] = vec4(secondary.pos,secondary.dir);
        /* rayProperties */ gl_FragData[1] = vec4(secondary.intensity, secondary.wavelength, 0, 0);
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        /* hitPoint */      gl_FragData[3] = vec4(hitInfo.pos, hitInfo.normal);
        /* hitSpan */       gl_FragData[4] = vec4(ispan.enter.pos, ispan.exit.pos);
        /* rayPath */       gl_FragData[5] = vec4(ray.pos, hitInfo.pos);
    }else{
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        gl_FragData[5] = vec4(ray.pos, ray.pos+ray.dir*9999.0);
    }
}

