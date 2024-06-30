#extension GL_EXT_draw_buffers: require
precision mediump float;
#define e 2.71828
#define PI 3.14159
#define EPSILON 10.001
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

#define MAX_SHAPES 16

uniform float SEED;
uniform vec2 resolution;
uniform sampler2D rayTransformTexture;
uniform sampler2D rayPropertiesTexture;
uniform sampler2D randomNumberPerRay;
uniform sampler2D spectralTexture;

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
    float delta = texture2D(randomNumberPerRay, gl_FragCoord.xy).x;
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

/* ******** *
 * LIGHTRAY *
 * ******** */
struct Ray{
    vec2 pos;
    vec2 dir;
    float intensity;
    float wavelength;
};

const Ray NoRay = Ray(vec2(0.0), vec2(0.0), 0.0, 0.0);

bool IsValid(Ray ray){
    return dot(ray.dir, ray.dir)>0.0;
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
int unpackShapeType(int i){
    return int(texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).x);
}

struct Circle{
    vec2 center;
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

Circle unpackCircle(int i){
        vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
        float radius = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
        return Circle(
            center,
            radius
        );
}

struct Line{
    vec2 A;
    vec2 B;
};

Line unpackLine(int i){
    vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
    float angle = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).z;
    float length = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
    float x1 = center.x - cos(angle)*length/2.0;
    float y1 = center.y - sin(angle)*length/2.0;
    float x2 = center.x + cos(angle)*length/2.0;
    float y2 = center.y + sin(angle)*length/2.0;
    return Line(
        vec2(x1,y1), 
        vec2(x2,y2)
    );
}

struct Rectangle{
    vec2 center;
    float angle;
    float width;
    float height;
};

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

struct Triangle{
    vec2 center;
    float angle;
    float size;
};

Triangle unpackTriangle(int i){
    vec2 center = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).xy;
    float angle = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(i)).z;
    float size = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16+i)).y;
    return Triangle(center, 
                        angle, 
                        size);
}

struct SphericalLens{
    vec2 center;
    float angle;
    float diameter;
    float centerThickness;
    float edgeThickness;
};

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
    vec2 normal;
    int matId;
};

const Intersection NoIntersection = Intersection(-LARGE_NUMBER, vec2(0.0), -1);

bool IsValid(Intersection i){
    return i.t>=0.0;
}
struct IntersectionSpan{
    Intersection enter;
    Intersection exit;
};

const IntersectionSpan NoIntersectionSpan = IntersectionSpan(NoIntersection, NoIntersection);

bool IsValid(IntersectionSpan ispan){
    return IsValid(ispan.enter) && IsValid(ispan.exit) && ispan.enter.t < ispan.exit.t;
}

IntersectionSpan intersect(Line line, Ray ray, int matId)
{
    vec2 tangent = line.B-line.A;

    // Calculate the determinant
    float determinant = ray.dir.x * tangent.y- ray.dir.y * tangent.x;

    if (abs(determinant) < EPSILON){
        // ray and line are parallel
        return NoIntersectionSpan;
    }

    // Calculate the intersection along the ray
    float tNear = ((line.A.x - ray.pos.x) * tangent.y - (line.A.y - ray.pos.y) * tangent.x) / determinant;
    // Calculate intersection along the line
    float tLine = ((line.A.x - ray.pos.x) * ray.dir.y - (line.A.y - ray.pos.y) * ray.dir.x) / determinant;

    if(0.0 < tNear && 0.0 <= tLine && tLine <=1.0)
    {
        vec2 N = vec2(-tangent.y, tangent.x);
        N = normalize(-N);
        return IntersectionSpan(
            Intersection(tNear, N, matId),
            Intersection(tNear+1.0, N, matId)
        );
    }

    return NoIntersectionSpan;
}

IntersectionSpan intersect(Circle circle, Ray ray, int matId){
    vec2 u = ray.pos-circle.center;

    float B = dot(u, ray.dir);
    float C = dot(u, u) - circle.r*circle.r;
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
            vec2 I2 = ray.pos+ray.dir*tFar;

            // exit normal
            vec2 N2 = (I2-circle.center);
            N2=normalize(N2);

            // exit info
            Intersection exit = Intersection(tFar, N2, matId);

            if(tNear<EPSILON)
            {
                return IntersectionSpan(
                    Intersection(0.0, vec2(0.0, 0.0), matId), 
                    exit
                );
            }

            // enter point
            vec2 I1 = ray.pos+ray.dir*tNear;

            // enter normal
            vec2 N1 = normalize(I1-circle.center);

            //enter info
            Intersection enter = Intersection(tNear, N1, matId);

            // intersection span
            return IntersectionSpan(enter, exit);
        }
    }

    return NoIntersectionSpan;
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

    Line segmentA = Line(vertices[0], vertices[1]);
    Line segmentB = Line(vertices[1], vertices[2]);
    Line segmentC = Line(vertices[2], vertices[0]);

    Intersection I1 = intersect(segmentA, ray, matId).enter;
    Intersection I2 = intersect(segmentB, ray, matId).enter;
    Intersection I3 = intersect(segmentC, ray, matId).enter;

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

    if(tExit==tEnter){
        return IntersectionSpan(
            Intersection(0.0, vec2(0.0), matId),
            Intersection(tEnter, nEnter, matId)
        );
    }

    return IntersectionSpan(
        Intersection(tEnter, nEnter, matId),
        Intersection(tExit, nExit, matId)
    );
}

IntersectionSpan intersect(Rectangle rect, Ray ray, int matId){
    vec2 rayPos = rotate(ray.pos, -rect.angle, rect.center);
    vec2 rayDir = rotate(ray.dir, -rect.angle);

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
        Intersection exit = Intersection(tFar, N2, matId);

        if(tNear<EPSILON){
            // when the enter point is behind the ray's origin, 
            // then intersection span will begin at the rays origin
            Intersection enter = Intersection(0.0, vec2(0,0), matId);
            return IntersectionSpan(enter,exit);
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

        Intersection enter = Intersection(tNear, N1, matId);

        // return intersection span between the enter- and exit point
        return IntersectionSpan(enter, exit);
    }
    return NoIntersectionSpan;
}

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
            Intersection(b.enter.t, -b.enter.normal, b.enter.matId),
            Intersection(b.exit.t, -b.exit.normal, b.exit.matId)
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
    if (1.0 < fresnell) 
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

Ray raytraceScene(Ray ray, out IntersectionSpan sceneIntersectionSpan){
/* *************** *
     * intersect scene
     * *************** */
    Ray adjustedRay = Ray(ray.pos+ray.dir*EPSILON, ray.dir, ray.intensity, ray.wavelength);
    sceneIntersectionSpan = NoIntersectionSpan;
    int shapeIdx;

    for(int i=0;i<MAX_SHAPES;i++)
    {
        if(i<int(shapesCount))
        {
            IntersectionSpan shapeIntersectionSpan=NoIntersectionSpan;
            int shapeType = unpackShapeType(i);
            if(shapeType==SHAPE_CIRCLE) // CIRCLE
            {
                Circle circle = unpackCircle(i);
                shapeIntersectionSpan = intersect(circle, ray, i);
            }
            else if(shapeType==SHAPE_RECTANGLE){
                Rectangle rect = unpackRectangle(i);
                shapeIntersectionSpan = intersect(rect, ray, i);
            }
            else if(shapeType==SHAPE_SPHERICAL_LENS) // SphericalLens
            {
                SphericalLens lens = unpackSphericalLens(i);
                shapeIntersectionSpan = intersect(lens, ray, i);
            }
            else if(shapeType==SHAPE_TRIANGLE) // Triangle
            {
                Triangle triangle = unpackTriangle(i);
                shapeIntersectionSpan = intersect(triangle, ray, i);
            }
            else if(shapeType==SHAPE_LINE_SEGMENT) // LineSegment
            {
                Line line = unpackLine(i);
                shapeIntersectionSpan = intersect(line, ray, i);
            }
            else
            {
                continue;
            }

            if(IsValid(sceneIntersectionSpan) && IsValid(shapeIntersectionSpan)){
                if(shapeIntersectionSpan.enter.t > sceneIntersectionSpan.enter.t){
                    sceneIntersectionSpan = subtractSpan(sceneIntersectionSpan, shapeIntersectionSpan);
                }else{
                    sceneIntersectionSpan = subtractSpan(shapeIntersectionSpan, sceneIntersectionSpan);
                }
            }else if(IsValid(shapeIntersectionSpan)){
                sceneIntersectionSpan = shapeIntersectionSpan;
            }
            
        }
    }
    
    Ray secondary = NoRay;
    if(IsValid(sceneIntersectionSpan))
    {
        Intersection intersection = sceneIntersectionSpan.enter;
        if(intersection.t<=0.0){
            intersection = sceneIntersectionSpan.exit;
        };

        // int shapeIdx = intersection.

        /* ********** *
         * BOUNCE RAY *
         * ********** */
        vec2 tangent = vec2(-intersection.normal.y, intersection.normal.x); // 90deg rotation
        vec2 wiLocal = vec2(
            dot(tangent, ray.dir), 
            dot(intersection.normal, ray.dir)
        );  // tangent space exiting r\y directiuon
        
        // calculate exit direction in local space
        vec2 woLocal; // tangent space exit ray direction
        int materialType = unpackMaterialType(intersection.matId);
        if(materialType==MATERIAL_MIRROR)
        {
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).y;
            woLocal = sampleMirror(wiLocal);
        }
        else if(materialType==MATERIAL_GLASS)
        {
            // vec3 b = vec3(1.03961212, 0.231792344, 1.01046945);
            // vec3 c = vec3(0.00600069867, 0.0200179144, 103.560653);
            // float sellmeierIor =  sellmeierEquation(b, c, ray.wavelength*1e-3);
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).y;
            float ior = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).z;
            float dispersion = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).w;

            float cauchyIor =  cauchyEquation(1.44, 0.02, 550.0*1e-3);
            woLocal = snellsLaw(wiLocal, cauchyIor);
        }
        else if(materialType==MATERIAL_DIFFUSE)
        {
            float roughness = texelFetchByIdx(CSGTexture, vec2(16.0,3.0), float(16*2+shapeIdx)).y;
            woLocal = sampleDiffuse(wiLocal);
        }
        else
        {
            woLocal = wiLocal;
        }
        
        vec2 woWorld = woLocal.y*intersection.normal + woLocal.x*tangent; // worldSpace exiting r\y directiuon

        secondary = Ray(ray.pos+intersection.t*ray.dir, -woWorld, ray.intensity, ray.wavelength);

    }else{
        return NoRay;
        /* rayColor */     // gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        // gl_FragData[5] = vec4(ray.pos, ray.pos+ray.dir*9999.0);
    }

    return secondary;
}


void main()
{
    // unpack ray from data texture
    Ray ray = getCurrentRay();

    IntersectionSpan ispan;
    Ray secondary = raytraceScene(ray, ispan);

    if(IsValid(ispan))
    {
        Intersection intersection = ispan.enter;
        if(intersection.t<0.0){
            intersection = ispan.exit;
        };

        vec2 intersectionPoint = ray.pos+ray.dir*intersection.t;


        // bounce ray
        // Ray secondary = bounceRay(ray, hitInfo);

        // pack data
        /* rayTransform */  gl_FragData[0] = vec4(secondary.pos,secondary.dir);
        /* rayProperties */ gl_FragData[1] = vec4(secondary.intensity, secondary.wavelength, 0, 0);
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
        /* hitPoint */      gl_FragData[3] = vec4(intersectionPoint, intersection.normal);
        /* hitSpan */       gl_FragData[4] = vec4(ray.pos+ray.dir*ispan.enter.t, ray.pos+ray.dir*ispan.exit.t);
        /* rayPath */       gl_FragData[5] = vec4(ray.pos, intersectionPoint);
    }else{
        /* rayColor */      gl_FragData[2] = vec4(RGBFromWavelength(ray.wavelength), ray.intensity);
         /* rayPath */ gl_FragData[5] = vec4(ray.pos, ray.pos+ray.dir*9999.0);
    }
}

