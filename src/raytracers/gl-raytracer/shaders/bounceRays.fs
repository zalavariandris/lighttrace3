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
    float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    float x = randomNumber*2.0 - 1.0;
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

    float randomNumber = gold_noise(gl_FragCoord.xy, SEED);
    if (randomNumber < fresnell) 
    {
        return vec2(-wi.x, wi.y);
    }
    else 
    {
        return vec2(-wi.x * eta, -cosThetaT * sign(wi.y));
    }
}

void main()
{

    vec2 rayDir = texture2D(incidentRaysTexture, gl_FragCoord.xy/outputResolution.xy).zw;
    vec2 hitNormal = texture2D(hitDataTexture, gl_FragCoord.xy/outputResolution.xy).zw;
    vec2 hitPos = texture2D(hitDataTexture, gl_FragCoord.xy/outputResolution.xy).xy;
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
        vec3 b = vec3(1.03961212, 0.231792344, 1.01046945);
        vec3 c = vec3(0.00600069867, 0.0200179144, 103.560653);
        float sellmeierIor =  sellmeierEquation(b, c, wavelength*1e-3);
        float cauchyIor =  cauchyEquation(1.44, 0.02, wavelength*1e-3);
        woLocal = sampleDielectric(wiLocal, cauchyIor);
    }
    else if(hitMaterial<2.5)
    {
        woLocal = sampleDiffuse(wiLocal);
        // gl_FragData[0] = vec4(hitPos, sampleDiffuse(rayDir, hitNormal));
    }else{
        woLocal = sampleDiffuse(wiLocal);
    }
    vec2 woWorld = woLocal.y*hitNormal + woLocal.x*tangent; // worldSpace exiting r\y directiuon
    gl_FragData[0] = vec4(hitPos, woWorld);
}