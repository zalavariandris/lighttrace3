precision mediump float;
uniform vec2 outputResolution;
uniform sampler2D incidentRaysTexture;
uniform sampler2D incidentLightsTexture;
uniform vec2 rayDataResolution;
uniform sampler2D hitDataTexture;
uniform sampler2D hitMaterialTexture;
uniform vec2 hitDataResolution;
uniform float SEED;

#define PI 3.14159
float PHI = 1.61803398874989484820459;  // Φ = Golden Ratio
float gold_noise(vec2 xy, float seed){
       return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
}

vec2 rotate(vec2 vector, float radAngle)
{
	float s = sin(radAngle);
	float c = cos(radAngle);
	mat2 m = mat2(c, s, -s, c);
	return m * vector;
}

/* MATERIAL */
vec2 sampleDiffuse(vec2 V, vec2 N)
{
    bool IsEntering = -dot(V, N) > 0.0;
    float radAngle = gold_noise(gl_FragCoord.xy+vec2(SEED), 1.0)*PI-PI/2.0;
    return rotate(N, IsEntering ? radAngle : radAngle+PI);
}

vec2 sampleMirror(vec2 V, vec2 N)
{
    return reflect(V, N);
}

vec2 sampleMirror2(vec2 V, vec2 N)
{
    float surfaceAngle = atan(N.y, N.x);
    vec2 w0 = rotate(V, -surfaceAngle);

    // in surface normal space
    vec2 w1 = vec2(w0.x, -w0.y);

    // back to worldspace
    return -rotate(w1, surfaceAngle);
}

float sellmeierIor(vec3 b, vec3 c, float lambda)
{
    // Calculate the square of the wavelength
    float lSq = (lambda * 1e-3) * (lambda * 1e-3);

    // Calculate the contribution of each Sellmeier term and sum them up
    float sum = 0.0;
    sum += (b.x * lSq) / (lSq - c.x);
    sum += (b.y * lSq) / (lSq - c.y);
    sum += (b.z * lSq) / (lSq - c.z);

    // Add 1.0 to the sum to get the refractive index squared
    return 1.0 + sum;
}

vec2 sampleTransparent(vec2 V, vec2 N, float ior)
{
    // version 1
    float cosI = -dot(V, N); // Corrected to ensure cosI is always positive
    bool IsEntering = cosI < 0.0;
    float refractiveIndexRatio = IsEntering ? 1.0 / ior : ior ; // Adjust ratio based on entering or exiting

    // Corrected to flip the normal vector when exiting
    vec2 normal = IsEntering ? N : -N;
    cosI = abs(cosI); // cosI should be positive after adjustment

    float sinT2 = refractiveIndexRatio * refractiveIndexRatio * (1.0 - cosI * cosI);
    if (sinT2 > 1.0) {
        // angle is greater the the critical angle.
        // Total internal reflection
        vec2 exitVector = reflect(V, normal);
        return exitVector;
    } else {
        float cosT = sqrt(1.0 - sinT2);
        // Corrected formula for exit vector
        vec2 exitVector = V*refractiveIndexRatio + normal*(refractiveIndexRatio * cosI - cosT);
        return exitVector;
    }
}

/* sample mirror material
 * @param wi[vec2]: incident ray direction in tangent space. x: perpendicular to surface tangent. y:parallel to surface tangent
 */
vec2 sampleMirror(vec2 wi){
    return vec2(-wi.x, wi.y); 
}

vec2 sampleDiffuse(vec2 wi)
{
    float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    float x = randomNumber*2.0 - 1.0;
    float y = sqrt(1.0 - x*x);
    return vec2(x, y*sign(wi.y));
}

float dielectricReflectance(float eta, float cosThetaI, out float cosThetaT) {
    float sinThetaTSq = eta*eta*(1.0 - cosThetaI*cosThetaI);
    if (sinThetaTSq > 1.0) {
        cosThetaT = 0.0;
        return 1.0;
    }
    cosThetaT = sqrt(1.0 - sinThetaTSq);

    float Rs = (eta*cosThetaI - cosThetaT)/(eta*cosThetaI + cosThetaT);
    float Rp = (eta*cosThetaT - cosThetaI)/(eta*cosThetaT + cosThetaI);

    return (Rs*Rs + Rp*Rp)*0.5;
}

vec2 sampleDielectric(vec2 wi, float ior) 
{
    float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    float cosThetaT;
    float eta = wi.y < 0.0 ? ior : 1.0/ior;
    float Fr = dielectricReflectance(eta, abs(wi.y), cosThetaT);
    if (randomNumber < Fr)
    {
        return vec2(-wi.x, wi.y);
    }
    else
    {
        return vec2(-wi.x*eta, -cosThetaT*sign(wi.y));
    }
}

void main()
{
    vec2 rayDir = texture2D(incidentRaysTexture, gl_FragCoord.xy/outputResolution.xy).zw;
    vec4 hitData = texture2D(hitDataTexture, gl_FragCoord.xy/outputResolution.xy);
    vec2 hitNormal = hitData.zw;
    vec2 hitPos = hitData.xy;
    float hitMaterial = texture2D(hitMaterialTexture, gl_FragCoord.xy/outputResolution.xy).x;
    float wavelength = texture2D(incidentLightsTexture, gl_FragCoord.xy/outputResolution.xy).r;

    // vec2 secondaryDir = sampleMirror(rayDir, hitNormal);
    vec2 tangent = vec2(-hitNormal.y, hitNormal.x);
    vec2 wiLocal = -vec2(dot(tangent, rayDir), dot(hitNormal, rayDir));  // tangent space exiting r\y directiuon
    vec2 woLocal; // tangent space exit ray direction
    if(hitMaterial < 0.5)
    {
        woLocal = sampleMirror(wiLocal);
    }
    else if(hitMaterial < 1.5)
    {
        vec3 b = vec3(1.6215, 0.2563, 1.6445);
        vec3 c = vec3(0.0122, 0.0596, 147.4688);
        float dispersiveIor =  sellmeierIor(b, c, wavelength*9.0);
        woLocal = sampleDielectric(wiLocal, dispersiveIor);
        // vec2 secondaryDir = sampleTransparent(rayDir, hitNormal, dispersiveIor);
        // gl_FragData[0] = vec4(hitPos, secondaryDir);
    }
    else if(hitMaterial<2.5)
    {
        woLocal = sampleDiffuse(wiLocal);
        // gl_FragData[0] = vec4(hitPos, sampleDiffuse(rayDir, hitNormal));
    }
    vec2 woWorld = woLocal.y*hitNormal + woLocal.x*tangent; // worldSpace exiting r\y directiuon
    gl_FragData[0] = vec4(hitPos, woWorld);

}