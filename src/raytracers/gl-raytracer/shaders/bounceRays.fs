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
       return fract(tan(distance(xy*PHI, xy)*seed));
}

vec2 rotate(vec2 vector, float radAngle)
{
	float s = sin(radAngle);
	float c = cos(radAngle);
	mat2 m = mat2(c, s, -s, c);
	return m * vector;
}

/* MATERIAL */
/* sample mirror material
 * @param wi[vec2]: incident ray direction in tangent space. x: perpendicular to surface tangent. y:parallel to surface tangent
 */
vec2 sampleMirror(vec2 wi){
    return vec2(-wi.x, wi.y); 
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