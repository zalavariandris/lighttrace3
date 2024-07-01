/*
 * GL Renderer
 */
import createREGL from "regl"

import { drawTexture } from "./operators/drawTexture.js";
import { drawCSGToSDF } from "./operators/drawCSGToSDF.js";
import { intersectRaysWithSDF } from "./operators/intersectRaysWithSDF.js";
import { drawLinesBetweenPoints} from "./operators/drawLines.js";
import { drawRays} from "./operators/drawRays.js"

import QUAD from "./QUAD.js"
import { samplePointLight, sampleLaserLight, sampleDirectionalLight } from "../sampleLights.js";
import { myrandom } from "../../utils.js";
import _ from "lodash";

/*Load shaders*/
import { loadShader } from "./shaders/load-shader.js"
const PASS_THROUGH_VERTEX_SHADER = await loadShader("./src/raytracers/gl-raytracer/shaders/PASS_THROUGH_VERTEX_SHADER.fs");
const intersectRaysWithCSGShader = await loadShader("./src/raytracers//gl-raytracer/shaders/intersectRaysWithCSG2.fs");
const bounceRaysShader = await loadShader("./src/raytracers//gl-raytracer/shaders/bounceRays.fs")
const wavelengthToColorShader = await loadShader("./src/raytracers//gl-raytracer/shaders/wavelengthToColor.fs");

/* load spectral image */
const spectralImage2 = await loadImageData("./src/Spectrum-cropped.png");

/* define maximum shape couns*/
const MAX_SHAPES = 16;

/**
 * load image from path as 'ImageData'
 * @param {string} imagePath 
 * @returns 
 */
function loadImageData(imagePath){
    return new Promise(resolve => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.src = imagePath;
        im.onload = () => {
            var canvas = document.createElement("canvas");
            canvas.width = im.width;
            canvas.height = im.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(im, 0, 0);

            const imageData = ctx.getImageData(0, 0, im.width, im.height);
    
            resolve(imageData);
        };
    })
}

import spectrumTable from "./spectrumTable.js";

class GLRaytracer{
    constructor(canvas)
    {
        this.canvas = canvas;
        this.totalPasses = 0;

        // settings
        this.settings = {
            lightSamples: Math.pow(4,5),//128*128; //Math.pow(4,4);
            maxBounce: 7,
            subsampling: 1
        };

        this.display = {
            rays: true,
            hitSpans: true,
            normals: true,
            paths: true
        };
    }

    initGL()
    {
        // console.log("init gl", this.outputResolution)
        this.initRegl();
        this.initCSGBuffers();
        this.initRaytraceBuffers();
        this.initPostProcessingBuffers();
    }

    initRegl(){
        this.regl = createREGL({
            canvas: this.canvas,
            // pixelRatio: 2.0,
            attributes: {
                // width: 1024, heigh: 1024,
                alpha: false,
                depth: false,
                stencil: false,
                antialias: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                preferLowPowerToHighPerformance: false,
                failIfMajorPerformanceCaveat: false,
            },
            extensions: [
                'WEBGL_draw_buffers', // multiple render targets
                'OES_texture_float'
            ]
        });
    }

    initCSGBuffers(){
        const regl = this.regl;
        this.CSGTexture = regl.texture({
            width: MAX_SHAPES,
            height: 3,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
    }

    initRaytraceBuffers(){
        const regl = this.regl;
        /* texture for raytracing */
        const lightsCount = 2;
        const RaysCount =16**2; // default size for tyextures
        const dataTextureRadius = Math.ceil(Math.sqrt(RaysCount));
        this.spectrum = regl.texture({
            width: spectrumTable.length/4,
            height: 1,
            data: spectrumTable,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float"
        });

        this.rayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.secondaryRayDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitDataTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.lightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayColorsDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.hitMaterialTexture = regl.texture({
            width: dataTextureRadius, 
            height: dataTextureRadius,
            wrap: 'clamp',
            format: "rgba",
            type: "float"
        });

        this.secondaryLightDataTexture = regl.texture({
            width: dataTextureRadius,
            height: dataTextureRadius,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        this.rayDataFbo = regl.framebuffer({
            color: [
                this.rayDataTexture,
                this.lightDataTexture   
            ],
            depth: false
        });

        this.rayColorFbo = regl.framebuffer({
            color: this.rayColorsDataTexture,
            depth: false
        });

        this.hitDataFbo = regl.framebuffer({
            color: [
                this.hitDataTexture,
                this.hitMaterialTexture
            ],
            depth: false
        });

        this.secondaryRayDataFbo = regl.framebuffer({
            color: [
                this.secondaryRayDataTexture, 
                this.secondaryLightDataTexture
            ],
            depth: false
        });
    }

    initPostProcessingBuffers(){
        const regl = this.regl;
        /* texture for post processing */
        this.sceneTexture = regl.texture({
            width: 2,
            height: 2,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
        this.postTexture1 = regl.texture({
            width: 2,
            height: 2,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });
        this.postTexture2 = regl.texture({
            width: 2,
            height: 2,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
        });

        /* scene fbo */
        this.sceneFbo = regl.framebuffer({
            color: this.sceneTexture,
            depth: false    
        });

        /* Framebuffers for post processing */
        this.postFbo = regl.framebuffer({
            color: this.postTexture1,
            depth: false    
        });
        this.postBackFbo = regl.framebuffer({
            color: this.postTexture2,
            depth: false    
        });
    }

    resizeGL()
    {
        const [width, height] = [this.canvas.clientWidth, this.canvas.clientHeight]; //get current canvas size
        [this.canvas.width, this.canvas.height] = [width/this.settings.subsampling, height/this.settings.subsampling]; // set canvas resolution to cnavas size
        // this.outputResolution = [width/this.settings.subsampling, height/this.settings.subsampling]
    }

    getResolution(){
        return [this.canvas.width/this.settings.subsampling, this.canvas.height/this.settings.subsampling];
    }

    clear()
    {
        const regl = this.regl;
        regl.clear({
            framebuffer: this.postFbo, 
            color: [0,0,0,1.0]
        });
        regl.clear({
            framebuffer: this.postBackFbo, 
            color: [0,0,0,1.0]
        });
        this.totalPasses=0;
    }

    renderPass(scene, viewBox)
    {
        const regl = this.regl;
        /* CLEAR THE CANVAS */
        
        if(!scene || !viewBox)
        {
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }

        const lights = Object.entries(scene)
            .filter( ([key, entity])=>
                entity.hasOwnProperty("light") && 
                entity.hasOwnProperty("transform")
        );
        
        if(lights.length<1){
            regl.clear({framebuffer: null, color: [0,0,0,1.0]});
            return;
        }
       

        /* prepare scene data for GPU */
        const shapeEntities = Object.values(scene).filter(entity=>
            entity.hasOwnProperty("shape") && 
            entity.hasOwnProperty("transform") && 
            entity.hasOwnProperty("material")
        );

        const transformData = shapeEntities.map(entity=>[
            entity.transform.translate.x, 
            entity.transform.translate.y, 
            entity.transform.rotate || 0.0, 
            0.0
        ]);

        const SHAPE_NONE = -1;
        const SHAPE_CIRCLE = 0;
        const SHAPE_RECTANGLE = 1;
        const SHAPE_SPHERICEL_LENS = 2;
        const SHAPE_TRIANGLE = 3;
        const SHAPE_LINE_SEGMENT = 4;

        let shapeData = shapeEntities.map(entity=>{
            const shapes = {
                "circle":        [SHAPE_CIRCLE,         entity.shape.radius, 0, 0],
                "rectangle":     [SHAPE_RECTANGLE,      entity.shape.width, entity.shape.height, 0],
                "sphericalLens": [SHAPE_SPHERICEL_LENS, entity.shape.diameter, entity.shape.edgeThickness, entity.shape.centerThickness],
                "triangle":      [SHAPE_TRIANGLE,       entity.shape.size, 0, 0],
                "line":          [SHAPE_LINE_SEGMENT,   entity.shape.length, 0, 0]
            }
            return shapes[entity.shape.type] || [SHAPE_NONE,0,0,0];
        });

        const materialData = shapeEntities.map(entity=>{
            const materials = {
                "mirror":  [0, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0],
                "glass":   [1, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0],
                "diffuse": [2, entity.material.roughness || 0.0, entity.material.ior || 1.0, entity.material.dispersion || 0.0]
            };
            return materials[entity.material.type] || [0,0,0,0];
        });

        const CSGData = [
            ..._.assign(_.fill(new Array(MAX_SHAPES), [0,0,0,0]), transformData),
            ..._.assign(_.fill(new Array(MAX_SHAPES), [0,0,0,0]), shapeData),
            ..._.assign(_.fill(new Array(MAX_SHAPES), [0,0,0,0]), materialData)
        ]

        this.CSGTexture = regl.texture({
            width: MAX_SHAPES,
            height: 3,
            wrap: 'clamp',
            min: "nearest", 
            mag: "nearest",
            format: "rgba",
            type: "float",
            data: CSGData
        })

        /*
         * CAST INITIAL RAYS
         */
        const lightEntities = Object.values(scene).filter( entity=>
            entity.hasOwnProperty("light") && 
            entity.hasOwnProperty("transform")
        );
        const totalLightIntensity = lightEntities.reduce( (accumulator, lightEntity)=>{
            return accumulator+lightEntity.light.intensity;
        }, 0.0 );
        const rays = lightEntities.map( entity=>{
            const sampleLights = {
                "point":       samplePointLight,
                "laser":       sampleLaserLight,
                "directional": sampleDirectionalLight
            }
            return sampleLights[entity.light.type](entity, this.settings.lightSamples * entity.light.intensity/totalLightIntensity) || makeRay(0,0,0,0,0,0);
        }).flat(1);

        /* =========== *
         * GL PIPELINE *
         * =========== */
        const dataTextureRadius = Math.ceil(Math.sqrt(rays.length)); // calc output texture resolution to hold rays data on the GPU
    
        /* upload data to an RGBA float texture */
        this.rayDataTexture({
            radius: dataTextureRadius,
            format: "rgba",
            type: "float",
            data: rays.map(ray=>
                [ray.x, ray.y, ray.dx, ray.dy]
            ).concat(new Array(dataTextureRadius**2-rays.length).fill([0,0,0,0]))
        });
    
        this.lightDataTexture({
            radius: dataTextureRadius,
            format: "rgba",
            type: "float",
            data: rays.map(ray=>
                [ray.wavelength, ray.wavelength, ray.wavelength, ray.intensity]
            ).concat(new Array(dataTextureRadius**2-rays.length).fill([0,0,0,0]))
        });

        /* resize raytrace FBOs to fit all rays */
        this.rayDataFbo.resize(dataTextureRadius);
        this.secondaryRayDataFbo.resize(dataTextureRadius);
        this.hitDataFbo.resize(dataTextureRadius);
        this.rayColorFbo.resize(dataTextureRadius);

        /* map each ray wavelength to an RGB color */
        regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
            framebuffer: this.rayColorFbo,
            uniforms:{
                outputResolution: [this.rayColorFbo.width, this.rayColorFbo.height],
                lightDataTexture: this.lightDataTexture,
                lightDataResolution: [this.lightDataTexture.width, this.lightDataTexture.height],
                spectralTexture: this.spectrum
            },
            frag: `precision mediump float;
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
                    vec3 perceptualLinearRGB = RGBFromWavelength(wavelength);
                    vec3 sRGB = linearTosRGB(perceptualLinearRGB);
                    gl_FragColor = vec4(perceptualLinearRGB, intensity*200.0);
                }`
        })()

        /* clear main FBO */
        regl.clear({framebuffer: this.sceneFbo, color: [0,0,0,1.0]});

        /* resize output framebuffers if necessary */
        const sceneFboNeedsResize = [this.sceneFbo.width, this.sceneFbo.height]!=this.getResolution();
        if(sceneFboNeedsResize)
        {
            this.sceneFbo.resize(...this.getResolution());
        }

        /*
         * Trace Rays
         */
        for(let i=0; i<this.settings.maxBounce; i++)
        {
            /* INTERSECT RAYS WITH CSG */
            regl({...QUAD, vert:PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.hitDataFbo,
                uniforms: {
                    roomRect: [viewBox.x+viewBox.w/2, viewBox.y+viewBox.h/2, viewBox.w, viewBox.h],
                    rayDataTexture: this.rayDataTexture,
                    rayDataResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    shapesCount: shapeData.length,
                    CSGTexture: this.CSGTexture,
                    ...shapeEntities.length>0 && { // include shape info in uniforms only if they exist. otherwise regl throws an error. TODO: review this
                        transformData: transformData.flat(),
                        shapeData: shapeData.flat(),
                        materialData: materialData.flat()
                    }
                },
                frag: intersectRaysWithCSGShader
            })();

            /* Bounce rays with hitPoints */
            regl({...QUAD, vert: PASS_THROUGH_VERTEX_SHADER,
                framebuffer: this.secondaryRayDataFbo,
                uniforms:{
                    outputResolution: [this.rayDataTexture.width, this.rayDataTexture.height],
                    incidentRaysTexture: this.rayDataTexture,
                    incidentLightsTexture: this.lightDataTexture,
                    hitDataTexture: this.hitDataTexture,
                    hitMaterialTexture: this.hitMaterialTexture,
                    SEED: myrandom(Math.random())
                },
                frag:bounceRaysShader
            })()

            /* RENDER RAYS */
            /* draw hitPoints */
            this.display.normals && drawRays(regl, {
                raysCount: rays.length,
                raysTexture: this.hitDataTexture,
                raysLength: 5.0,
                raysColor: [0,1,0,1],
                outputResolution: [this.sceneFbo.width, this.sceneFbo.height],
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFbo
            });

            /* draw lightpaths */
            this.display.paths && drawLinesBetweenPoints(regl, {
                linesCount: rays.length,
                startpoints: this.rayDataTexture,
                endpoints: this.hitDataTexture,
                colors: this.rayColorsDataTexture,
                outputResolution: [this.sceneFbo.width, this.sceneFbo.height],
                viewport: {x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h},
                framebuffer: this.sceneFbo
            });

            /* Swap Raytrace Buffers */
            [this.rayDataFbo, this.secondaryRayDataFbo]             = [this.secondaryRayDataFbo, this.rayDataFbo];
            [this.rayDataTexture, this.secondaryRayDataTexture]     = [this.secondaryRayDataTexture, this.rayDataTexture];
            [this.lightDataTexture, this.secondaryLightDataTexture] = [this.secondaryLightDataTexture, this.lightDataTexture];
        }

        /* POST PROCESSING */
        const postFboNeedsResize = this.postFbo.width!=this.sceneFbo.width || this.postFbo.height!=this.sceneFbo.height;
        if(postFboNeedsResize)
        {
            this.postFbo.resize(this.sceneFbo.width, this.sceneFbo.height);
            this.postBackFbo.resize(this.sceneFbo.width, this.sceneFbo.height);
        }

        /* accumulate */
        regl({...QUAD,
            framebuffer: this.postFbo,
            viewport: {x:0, y:0, width:this.postFbo.width, height: this.postFbo.height},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                textureA: this.sceneTexture,
                textureB: this.postBackFbo
            },
            frag:`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D textureA;
            uniform sampler2D textureB;
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main() {
                vec4 texA = texture2D(textureA, vUV).rgba;
                vec4 texB = texture2D(textureB, vUV).rgba;
                gl_FragColor = vec4(texA.rgb+texB.rgb, 1.0);
            }`
        })();

        /* RENDER TO SCREEN */
        this.totalPasses+=1;
        const lineWidth = 1/this.getResolution()[0];
        regl({...QUAD,
            framebuffer: null,
            viewport: {x:0, y:0, width:this.canvas.width, height: this.canvas.height},
            vert: PASS_THROUGH_VERTEX_SHADER,
            depth: { enable: false },
            uniforms:{
                texture: this.postFbo,
                outputResolution: [this.canvas.width, this.canvas.height],
                totalPasses: this.totalPasses * (lineWidth*1024),
                exposure: 0.1
            },
            frag:`precision mediump float;
            varying vec2 vUV;
            uniform sampler2D texture;
            uniform float totalPasses;
            uniform float exposure;

            vec3 ACEScgFromLinearRGB(vec3 linearRGB)
            {
                // Transformation matrix from linear sRGB to ACEScg
                const mat3 ACEScgMatrix = mat3(
                    0.6624541811085053, 0.13400420645643313, 0.1561876870049078,
                    0.27222871678091454, 0.6740817658111483,  0.05368951740793705,
                    0.005574649490039499, 0.004060733528982825, 0.9833800523172168
                );

                return ACEScgMatrix * linearRGB;
            }

            vec3 linearRGBFromACEScg(vec3 ACEScgRGB)
            {
                // Inverse transformation matrix from ACEScg to linear sRGB
                const mat3 inverseACEScgMatrix = mat3(
                    1.6410233797, -0.3248032942, -0.2364246952,
                    -0.6636628587,  1.6153315917,  0.0167563477,
                    0.0117218943, -0.0082844420,  1.0082749946
                );

                return inverseACEScgMatrix * ACEScgRGB;
            }

            vec3 sRGBFromLinearRGB(vec3 linearRGB){
                float gamma = 1.0 / 2.2;
                vec3 sRGB = pow(linearRGB, vec3(gamma));
                return sRGB;
            }

            vec3 linearRGBFromsRGB(vec3 sRGB){
                float gamma = 2.2;
                vec3 linearRGB = pow(sRGB, vec3(gamma));
                return linearRGB;
            }

            vec3 rec709FromRGB(vec3 linearRGB){
                vec3 rec709RGB;
                for (int i = 0; i < 3; i++) {
                    if (linearRGB[i] < 0.018) {
                        rec709RGB[i] = linearRGB[i] * 4.5;
                    } else {
                        rec709RGB[i] = 1.099 * pow(linearRGB[i], 0.45) - 0.099;
                    }
                }
                return rec709RGB;
            }
        
            vec3 filmic(vec3 x) {
                vec3 X = max(vec3(0.0), x - 0.004);
                vec3 result = (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
                return pow(result, vec3(2.2));
            }

            void main()
            {
                vec3 color = texture2D(texture, vUV).rgb; // get linear RGB color
                color *= 1.0/totalPasses; //compensate multiple passes

                // apply exposure in ACEScg colorspace
                color = ACEScgFromLinearRGB(color);
                color*=exposure;

                /* convert ACES to display colorspace*/
                color = linearRGBFromACEScg(color);
                color = filmic(color);
                gl_FragColor = vec4(color, 1.0);
            }`
        })();

        // Swap Postprocessing Framebuffers
        [this.postFbo, this.postBackFbo]=[this.postBackFbo, this.postFbo]
    }
}

export default GLRaytracer;