precision mediump float;
uniform vec2 outputResolution;
uniform sampler2D lightDataTexture;
uniform vec2 lightDataResolution;
uniform sampler2D spectralTexture;

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Convert wavelength in nanometers to RGB using a perceptually accurate method
vec3 wavelengthToRGB(float wavelength) {

    vec3 color = vec3(0.0, 0.0, 0.0);

    if (wavelength >= 380.0 && wavelength <= 440.0) {
        color.r = -1.0 * (wavelength - 440.0) / (440.0 - 380.0);
        color.g = 0.0;
        color.b = 1.0;
    } else if (wavelength >= 440.0 && wavelength <= 490.0) {
        color.r = 0.0;
        color.g = (wavelength - 440.0) / (490.0 - 440.0);
        color.b = 1.0;
    } else if (wavelength >= 490.0 && wavelength <= 510.0) {
        color.r = 0.0;
        color.g = 1.0;
        color.b = -1.0 * (wavelength - 510.0) / (510.0 - 490.0);
    } else if (wavelength >= 510.0 && wavelength <= 580.0) {
        color.r = (wavelength - 510.0) / (580.0 - 510.0);
        color.g = 1.0;
        color.b = 0.0;
    } else if (wavelength >= 580.0 && wavelength <= 645.0) {
        color.r = 1.0;
        color.g = -1.0 * (wavelength - 645.0) / (645.0 - 580.0);
        color.b = 0.0;
    } else if (wavelength >= 645.0 && wavelength <= 780.0) {
        color.r = 1.0;
        color.g = 0.0;
        color.b = 0.0;
    }

    // Let the intensity fall off near the vision limits
    float factor;
    if (wavelength >= 380.0 && wavelength <= 420.0) {
        factor = 0.3 + 0.7 * (wavelength - 380.0) / (420.0 - 380.0);
    } else if (wavelength >= 420.0 && wavelength <= 700.0) {
        factor = 1.0;
    } else if (wavelength >= 700.0 && wavelength <= 780.0) {
        factor = 0.3 + 0.7 * (780.0 - wavelength) / (780.0 - 700.0);
    } else {
        factor = 0.0;
    }

    vec3 linearRGB = color * factor;
    return linearRGB;
}

// Apply gamma correction
vec3 linearTosRGB(vec3 linearRGB)
{
    float gamma = 1.0/2.2;
    vec3 sRGB = pow(linearRGB, vec3(gamma));
    return sRGB;
}

void main()
{
    float wavelength = texture2D(lightDataTexture, gl_FragCoord.xy/outputResolution.xy).r;
    float intensity = texture2D(lightDataTexture, gl_FragCoord.xy/outputResolution.xy).a;

    // normalize wavelength to visible color range aprox. [400-700]
    float t = (wavelength-400.0)/300.0;
    
    vec4 spectralColor = texture2D(spectralTexture, vec2(t, 0.5)).rgba * vec4(1.0,1.0,1.0, 50.0*intensity);
    vec4 hueColor = vec4(hsv2rgb(vec3(t, 1.0, 1.0)), 50.0*intensity);
    vec4 whiteColor = vec4(1.0, 1.0, 1.0, 50.0*intensity);
    vec3 perceptualLinearRGB = wavelengthToRGB(wavelength);
    vec3 sRGB = linearTosRGB(perceptualLinearRGB);
    gl_FragColor = vec4(perceptualLinearRGB, intensity*200.0);
}

    

    // Use the function to set the color
    // vec3 rgbColor = wavelengthToRGB(wavelength);
    // gl_FragColor = vec4(rgbColor, 1.0);
